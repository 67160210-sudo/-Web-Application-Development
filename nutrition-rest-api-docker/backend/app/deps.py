from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError
from app.database import get_db
from app.models import User, RevokedToken
from app.security import decode_token

bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        jti = payload["jti"]
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if db.query(RevokedToken).filter_by(jti=jti).first():
        raise HTTPException(status_code=401, detail="Token has been logged out")

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
