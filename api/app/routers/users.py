from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import storage
from ..auth import _pwd, get_current_user, require_admin

router = APIRouter(prefix="/api/users", tags=["users"])


class CreateUserBody(BaseModel):
    username: str
    password: str
    role: str = "user"


@router.get("")
def list_users(admin: dict = Depends(require_admin)):
    return storage.list_users()


@router.post("", status_code=201)
def create_user(body: CreateUserBody, admin: dict = Depends(require_admin)):
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'user'")
    if storage.get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="username already taken")
    user = storage.create_user(body.username, _pwd.hash(body.password), role=body.role)
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    # prevent self-deletion
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="cannot delete yourself")
    if not storage.delete_user(user_id):
        raise HTTPException(status_code=404, detail="user not found")
