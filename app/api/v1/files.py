import os
import uuid
from typing import Annotated
from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import DbSession, CurrentUser, require_permission, get_current_user, get_db
from app.core.permissions import Permissions
from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.file import File as FileModel
from app.models.user import User
from app.schemas.file import FileRead

router = APIRouter()

ALLOWED_ENTITY_TYPES = {"tasks", "projects", "employees", "clients", "general", "messages"}

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
}

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".zip", ".mp4", ".mov", ".avi", ".mp3", ".wav"
}


@router.post("/upload", response_model=FileRead)
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str = Query(None),
    entity_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if entity_type and entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid entity_type. Must be one of: {', '.join(sorted(ALLOWED_ENTITY_TYPES))}")

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"File type '{file_ext}' is not allowed.")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestError(f"File type not allowed: {file.content_type}")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise BadRequestError(f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    ext = os.path.splitext(file.filename or "")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    subdir = entity_type or "general"
    dest_dir = os.path.join(settings.UPLOAD_DIR, subdir)
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/uploads/{subdir}/{stored_name}"
    db_file = FileModel(
        original_name=file.filename,
        stored_name=stored_name,
        file_path=file_path,
        file_url=file_url,
        mime_type=file.content_type,
        size_bytes=len(contents),
        entity_type=entity_type,
        entity_id=entity_id,
        uploaded_by=current_user.id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.get("/", response_model=list[FileRead])
def list_files(
    entity_type: str = Query(None),
    entity_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FileModel)
    if entity_type:
        q = q.filter(FileModel.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(FileModel.entity_id == entity_id)
    return q.order_by(FileModel.id.desc()).all()


@router.get("/{file_id}", response_model=FileRead)
def get_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not f:
        raise NotFoundError("File not found")
    return f


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not f:
        raise NotFoundError("File not found")
    if not current_user.is_superuser and f.uploaded_by != current_user.id:
        raise BadRequestError("Not allowed")
    if f.file_path and os.path.exists(f.file_path):
        uploads_dir = os.path.abspath("uploads")
        file_abs = os.path.abspath(f.file_path)
        if not file_abs.startswith(uploads_dir + os.sep) and file_abs != uploads_dir:
            raise HTTPException(status_code=400, detail="Invalid file path")
        os.remove(file_abs)
    db.delete(f)
    db.commit()
    return {"message": "File deleted"}
