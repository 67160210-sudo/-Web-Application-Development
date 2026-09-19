from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Recipe, RecipeIngredient, Ingredient, User
from app.deps import get_current_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/recipes", tags=["Recipes & Nutrition"])

UNIT_TO_GRAM = {"กรัม": 1, "ช้อนโต๊ะ": 15, "ช้อนชา": 5, "ถ้วย": 200, "มิลลิลิตร": 1}

class RecipeItemIn(BaseModel):
    ingredient_id: int
    amount: float = Field(gt=0)
    unit: str

class RecipeIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    servings: float = Field(default=1, gt=0)
    ingredients: list[RecipeItemIn] = []

def calculate(recipe):
    total = {"kcal":0, "protein":0, "carb":0, "fat":0, "sugar":0, "sodium":0}
    items = []
    for item in recipe.items:
        data = item.ingredient
        factor = item.amount * UNIT_TO_GRAM.get(item.unit, 1) / 100
        values = {
            "name": data.name,
            "kcal": data.kcal*factor, "protein": data.protein*factor,
            "carb": data.carb*factor, "fat": data.fat*factor,
            "sugar": data.sugar*factor, "sodium": data.sodium*factor
        }
        for k in total:
            total[k] += values[k]
        items.append(values)
    per = {k: v / recipe.servings for k, v in total.items()}
    return total, per, items

@router.post("", status_code=201)
def create_recipe(data: RecipeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    recipe = Recipe(user_id=user.id, name=data.name, servings=data.servings)
    db.add(recipe)
    db.flush()
    for x in data.ingredients:
        ing = db.query(Ingredient).filter_by(id=x.ingredient_id).first()
        if not ing:
            raise HTTPException(404, f"Ingredient {x.ingredient_id} not found")
        if x.unit not in UNIT_TO_GRAM:
            raise HTTPException(400, f"Unsupported unit: {x.unit}")
        recipe.items.append(RecipeIngredient(ingredient_id=x.ingredient_id, amount=x.amount, unit=x.unit))
    db.commit()
    db.refresh(recipe)
    return {"id": recipe.id, "name": recipe.name, "servings": recipe.servings, "nutrition": calculate(recipe)}

@router.get("")
def list_recipes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Recipe).filter_by(user_id=user.id).order_by(Recipe.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "servings": r.servings, "nutrition": calculate(r)[:2]} for r in rows]

@router.get("/{id}")
def get_recipe(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Recipe).filter_by(id=id, user_id=user.id).first()
    if not r:
        raise HTTPException(404, "Recipe not found")
    total, per, items = calculate(r)
    return {"id": r.id, "name": r.name, "servings": r.servings, "ingredients": items, "total": total, "per_serving": per}

@router.delete("/{id}")
def delete_recipe(id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Recipe).filter_by(id=id, user_id=user.id).first()
    if not r:
        raise HTTPException(404, "Recipe not found")
    db.delete(r)
    db.commit()
    return {"message": "Recipe deleted successfully"}
