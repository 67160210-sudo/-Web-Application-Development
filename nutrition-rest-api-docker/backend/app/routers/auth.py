from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, RevokedToken
from app.security import hash_password, verify_password, create_access_token, decode_token
from app.deps import get_current_user
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: str | None = None
    password: str = Field(min_length=6)

class LoginIn(BaseModel):
    username: str
    password: str

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter((User.username == data.username) | (User.email == data.email)).first():
        raise HTTPException(409, "Username or email already exists")
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email, "full_name": user.full_name}

@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = create_access_token(user.id, user.username)
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "username": user.username}}

@router.post("/logout")
def logout(
    credentials = Depends(__import__("fastapi").security.HTTPBearer()),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        jti = payload["jti"]
    except Exception:
        raise HTTPException(401, "Invalid token")
    if not db.query(RevokedToken).filter_by(jti=jti).first():
        db.add(RevokedToken(jti=jti))
        db.commit()
    return {"message": "Logout successful"}

@router.post("/change-password")
def change_password(
    data: ChangePasswordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
