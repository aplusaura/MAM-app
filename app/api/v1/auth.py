import time
from collections import defaultdict
from threading import Lock

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import DbSession, CurrentUser, _user_has_permission
from app.schemas.auth import (
    LoginRequest,
    MeRead,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.services.auth_service import AuthService
from app.models.employee import Employee
from app.core.permissions import ALL_PERMISSIONS

_login_attempts: dict = defaultdict(list)  # ip -> [timestamps]
_login_lock = Lock()
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 300  # 5 minutes


def _check_rate_limit(ip: str):
    now = time.time()
    with _login_lock:
        attempts = _login_attempts[ip]
        # Remove attempts outside window
        _login_attempts[ip] = [t for t in attempts if now - t < WINDOW_SECONDS]
        if len(_login_attempts[ip]) >= MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again in 5 minutes.")
        _login_attempts[ip].append(now)


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: DbSession):
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    return AuthService.login(db, payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: DbSession):
    return AuthService.refresh(db, payload)


@router.post("/logout")
def logout(current_user: CurrentUser):
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeRead)
def get_me(current_user: CurrentUser, db: DbSession):
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    full_name = employee.full_name if employee else current_user.email
    role_slug = None
    employee_id = None
    if employee:
        employee_id = employee.id
        if employee.role:
            role_slug = employee.role.slug

    if current_user.is_superuser:
        permission_slugs = [slug for _, slug, _ in ALL_PERMISSIONS]
    else:
        permission_slugs = [
            slug
            for _, slug, _ in ALL_PERMISSIONS
            if _user_has_permission(current_user, slug, db)
        ]

    return MeRead(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        full_name=full_name,
        permissions=permission_slugs,
        role_slug=role_slug,
        employee_id=employee_id,
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: DbSession):
    return AuthService.forgot_password(db, payload)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: DbSession):
    return AuthService.reset_password(db, payload)


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: CurrentUser, db: DbSession):
    return AuthService.change_password(db, current_user, payload)
