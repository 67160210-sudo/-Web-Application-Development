from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, ingredients, recipes
from app.database import Base, engine

app = FastAPI(
    title="ครัวชัวร์ Nutrition REST API",
    version="1.0.0",
    description="REST API สำหรับระบบวิเคราะห์คุณค่าทางโภชนาการจาก nutrition-appnew.html"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(ingredients.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "ครัวชัวร์ Nutrition REST API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/api/health")
def health():
    return {"status": "ok"}
