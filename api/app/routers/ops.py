from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import storage
from ..auth import get_current_user

router = APIRouter(prefix="/api/ops", tags=["ops"])


class CreateBody(BaseModel):
    name: str


class RenameBody(BaseModel):
    name: str


@router.get("")
def list_ops(user: dict = Depends(get_current_user)):
    return storage.list_ops()


@router.post("", status_code=201)
def create_ops(body: CreateBody, user: dict = Depends(get_current_user)):
    return storage.create_ops(body.name)


@router.get("/{ops_id}")
def get_ops(ops_id: str, user: dict = Depends(get_current_user)):
    data = storage.get_ops(ops_id)
    if data is None:
        raise HTTPException(status_code=404, detail="operation not found")
    return data


@router.patch("/{ops_id}")
def rename_ops(ops_id: str, body: RenameBody, user: dict = Depends(get_current_user)):
    data = storage.rename_ops(ops_id, body.name)
    if data is None:
        raise HTTPException(status_code=404, detail="operation not found")
    return data


@router.delete("/{ops_id}", status_code=204)
def delete_ops(ops_id: str, user: dict = Depends(get_current_user)):
    if not storage.delete_ops(ops_id):
        raise HTTPException(status_code=404, detail="operation not found")
