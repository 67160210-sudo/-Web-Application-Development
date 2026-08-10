from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.security import hash_password
from app.deps import get_current_user
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="", tags=["User Management"])

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None

def public_user(u):
    return {"id": u.id, "username": u.username, "email": u.email, "full_name": u.full_name, "created_at": u.created_at}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return public_user(current_user)

@router.get("/users")
def users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(User).count()
    rows = db.query(User).offset((page - 1) * limit).limit(limit).all()
    return {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit, "data": [public_user(u) for u in rows]}

@router.get("/users/{id}")
def get_user(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter_by(id=id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return public_user(user)

@router.put("/users/{id}")
def update_user(id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if id != current_user.id:
        raise HTTPException(403, "You can only edit your own profile")
    user = db.query(User).filter_by(id=id).first()
    if data.email:
        other = db.query(User).filter(User.email == data.email, User.id != id).first()
        if other:
            raise HTTPException(409, "Email already exists")
        user.email = data.email
    if data.full_name is not None:
        user.full_name = data.full_name
    db.commit()
    db.refresh(user)
    return public_user(user)

@router.delete("/users/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if id != current_user.id:
        raise HTTPException(403, "You can only delete your own account")
    user = db.query(User).filter_by(id=id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/check-username/{name}")
def check_username(name: str, db: Session = Depends(get_db)):
    exists = db.query(User).filter_by(username=name).first() is not None
    return {"username": name, "available": not exists}
