from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Ingredient
from app.deps import get_current_user

router = APIRouter(prefix="/ingredients", tags=["Nutrition Ingredients"])

@router.get("")
def list_ingredients(
    search: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    q = db.query(Ingredient)
    if search:
        q = q.filter(Ingredient.name.contains(search))
    total = q.count()
    rows = q.offset((page-1)*limit).limit(limit).all()
    return {
        "page": page, "limit": limit, "total": total,
        "data": [
            {"id": x.id, "name": x.name, "kcal": x.kcal, "protein": x.protein,
             "carb": x.carb, "fat": x.fat, "sugar": x.sugar, "sodium": x.sodium}
            for x in rows
        ]
    }
