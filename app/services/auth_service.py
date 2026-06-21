from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.security import (
    verify_password, hash_password,
    create_access_token, create_refresh_token,
    decode_token, generate_password_reset_token, verify_password_reset_token,
)
from app.core.exceptions import UnauthorizedError, BadRequestError, NotFoundError
from app.schemas.auth import (
    LoginRequest, TokenResponse, RefreshRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
)


class AuthService:
    @staticmethod
    def login(db: Session, payload: LoginRequest) -> TokenResponse:
        user = db.query(User).filter(
            User.email == payload.email.lower(),
            User.deleted_at.is_(None),
        ).first()

        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedError("Account is inactive")

        user.last_login = datetime.now(timezone.utc)
        db.commit()

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    @staticmethod
    def refresh(db: Session, payload: RefreshRequest) -> TokenResponse:
        data = decode_token(payload.refresh_token)
        if not data or data.get("type") != "refresh":
            raise UnauthorizedError("Invalid or expired refresh token")

        user_id = data.get("sub")
        user = db.query(User).filter(
            User.id == int(user_id),
            User.is_active == True,
            User.deleted_at.is_(None),
        ).first()
        if not user:
            raise UnauthorizedError("User not found")

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    @staticmethod
    def forgot_password(db: Session, payload: ForgotPasswordRequest) -> dict:
        user = db.query(User).filter(
            User.email == payload.email.lower(),
            User.deleted_at.is_(None),
        ).first()

        # Always return success to prevent email enumeration
        if not user:
            return {"message": "If that email exists, a reset link has been sent"}

        token = generate_password_reset_token(user.email)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()

        # TODO: send email with reset link containing the token
        return {"message": "If that email exists, a reset link has been sent"}

    @staticmethod
    def reset_password(db: Session, payload: ResetPasswordRequest) -> dict:
        email = verify_password_reset_token(payload.token)
        if not email:
            raise BadRequestError("Invalid or expired reset token")

        user = db.query(User).filter(
            User.email == email,
            User.password_reset_token == payload.token,
            User.deleted_at.is_(None),
        ).first()
        if not user:
            raise BadRequestError("Invalid reset token")

        if user.password_reset_expires and datetime.now(timezone.utc) > user.password_reset_expires:
            raise BadRequestError("Password reset link has expired")

        if len(payload.new_password) < 8:
            raise BadRequestError("Password must be at least 8 characters")

        user.password_hash = hash_password(payload.new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()

        return {"message": "Password reset successfully"}

    @staticmethod
    def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> dict:
        if not verify_password(payload.current_password, user.password_hash):
            raise BadRequestError("Current password is incorrect")
        if len(payload.new_password) < 8:
            raise BadRequestError("New password must be at least 8 characters")

        user.password_hash = hash_password(payload.new_password)
        db.commit()
        return {"message": "Password changed successfully"}
