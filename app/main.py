from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import os

from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — strict allowlist only
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
]
# Add any production domain from env
prod_origin = os.getenv("FRONTEND_URL", "")
if prod_origin:
    ALLOWED_ORIGINS.append(prod_origin)

def _is_allowed_origin(origin: str) -> bool:
    if origin in ALLOWED_ORIGINS:
        return True
    # Allow all Vercel preview/production deployments and any configured subdomain
    if origin.endswith(".vercel.app"):
        return True
    return False

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        is_allowed = _is_allowed_origin(origin)
        # Always respond to OPTIONS preflight — even for unknown origins, return 200
        # so the browser can make the actual request (we gate auth there instead)
        if request.method == "OPTIONS":
            allow_origin = origin if is_allowed else "*"
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": allow_origin,
                    "Access-Control-Allow-Credentials": "true" if is_allowed else "false",
                    "Access-Control-Allow-Methods": "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT",
                    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
                    "Access-Control-Max-Age": "600",
                },
            )
        response = await call_next(request)
        if is_allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

class ActivityLogMiddleware(BaseHTTPMiddleware):
    """Auto-log all successful mutations (POST/PATCH/PUT/DELETE) to activity_logs."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method not in ("POST", "PATCH", "PUT", "DELETE"):
            return response
        if not (200 <= response.status_code < 300):
            return response
        try:
            from app.db.session import SessionLocal
            from app.models.notification import ActivityLog
            from app.core.security import decode_token
            from datetime import datetime, timezone
            auth = request.headers.get("authorization", "")
            if not auth.lower().startswith("bearer "):
                return response
            token = auth[7:]
            payload = decode_token(token)
            if not payload or not payload.get("sub"):
                return response
            user_id = int(payload["sub"])
            path = request.url.path
            stripped = path.replace("/api/v1/", "").strip("/")
            parts = stripped.split("/")
            entity_type = parts[0] if parts else "item"
            if entity_type in ("notifications", "auth", "health", "uploads", "files"):
                return response
            entity_id = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            method_verb = {"POST": "created", "PATCH": "updated", "PUT": "updated", "DELETE": "deleted"}
            verb = method_verb.get(request.method, request.method.lower())
            SINGULAR = {
                "employees": "employee", "invoices": "invoice", "tasks": "task",
                "projects": "project", "clients": "client", "leads": "lead",
                "expenses": "expense", "payments": "payment", "reports": "report",
            }
            name = SINGULAR.get(entity_type, entity_type.replace("-", " ").replace("_", " "))
            action = f"{name} {verb}"
            db = SessionLocal()
            try:
                log = ActivityLog(
                    user_id=user_id,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    ip_address=request.client.host if request.client else None,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(log)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            import logging
            logging.getLogger("mam.activity").warning(f"Activity log failed: {e}")
        return response


app.add_middleware(DynamicCORSMiddleware)
app.add_middleware(ActivityLogMiddleware)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
