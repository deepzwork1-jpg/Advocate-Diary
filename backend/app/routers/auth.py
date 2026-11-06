from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import create_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: schemas.UserCreate, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    user = models.User(name=body.name, email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user.id), "user": user}


@router.post("/login", response_model=schemas.AuthResponse)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == body.email.lower()))
    # One message for both cases, so the form cannot reveal which emails have accounts.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password.")
    return {"access_token": create_token(user.id), "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
