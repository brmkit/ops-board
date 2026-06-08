import os

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .. import auth, storage
from ..auth import _pwd

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterBody(BaseModel):
    username: str
    password: str


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterBody):
    if os.environ.get("OPSBOARD_ALLOW_REGISTER", "").lower() != "true":
        raise HTTPException(status_code=403, detail="registration disabled")
    if storage.get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="username already taken")
    user = storage.create_user(body.username, _pwd.hash(body.password), role="user")
    return {"id": user["id"], "username": user["username"], "role": user["role"]}


@router.post("/login")
def login(body: LoginBody):
    user = storage.get_user_by_username(body.username)
    if not user or not _pwd.verify(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials",
        )
    role = user.get("role", "user")
    token = auth.create_token(user["id"], user["username"], role)
    return {"token": token, "username": user["username"], "role": role}
