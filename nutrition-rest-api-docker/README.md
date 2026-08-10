# ครัวชัวร์ — Nutrition REST API

โปรเจกต์นี้ต่อยอดจาก `nutrition-appnew.html` ใน GitHub ของกลุ่ม โดยหน้าเว็บเดิมมีฐานข้อมูลวัตถุดิบต่อ 100 กรัม และคำนวณ kcal, protein, carb, fat, sugar และ sodium จากปริมาณ/หน่วยของวัตถุดิบ

## Tech Stack

- Frontend: HTML/CSS/JavaScript (ไฟล์เดิม `nutrition-appnew.html`)
- Backend: FastAPI / Python
- Database: MySQL 8.4
- Authentication: JWT + Argon2 password hashing
- Container: Docker + Docker Compose
- API Docs: Swagger UI

## API ที่ตรงกับโจทย์

### 1. Authentication

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/change-password`

### 2. User Management

- GET `/api/me`
- GET `/api/users/{id}`
- GET `/api/users?page=1&limit=10`
- PUT `/api/users/{id}`
- DELETE `/api/users/{id}`
- GET `/api/check-username/{name}`

### 3. Nutrition Project API

- GET `/api/ingredients?search=น้ำปลา`
- POST `/api/recipes`
- GET `/api/recipes`
- GET `/api/recipes/{id}`
- DELETE `/api/recipes/{id}`

## Run

```bash
docker compose up --build
```

จากนั้นเปิด:

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## ตัวอย่าง Register

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "full_name": "ผู้ทดสอบ",
  "password": "12345678"
}
```

## ตัวอย่าง Login

```json
{
  "username": "testuser",
  "password": "12345678"
}
```

นำ `access_token` ไปใส่ใน Swagger ปุ่ม **Authorize** ในรูปแบบ:

```text
Bearer <access_token>
```

## ตัวอย่างสร้างสูตรอาหาร

```json
{
  "name": "ผัดกะเพรา",
  "servings": 2,
  "ingredients": [
    {"ingredient_id": 1, "amount": 100, "unit": "กรัม"},
    {"ingredient_id": 13, "amount": 1, "unit": "ช้อนโต๊ะ"}
  ]
}
```

API จะคำนวณโภชนาการให้ทั้ง `total` และ `per_serving`

## ความสัมพันธ์กับ nutrition-appnew.html

ไฟล์เดิมมี DB วัตถุดิบ เช่น หมูสับ, เนื้อไก่, กุ้ง, ไข่ไก่, ข้าวสวย, น้ำปลา, ซีอิ๊วขาว ฯลฯ และมีหน่วย กรัม, ช้อนโต๊ะ, ช้อนชา, ถ้วย และมิลลิลิตร ดังนั้น backend ชุดนี้ย้ายข้อมูลส่วนดังกล่าวไปไว้ใน MySQL และย้ายการคำนวณสูตรมาเป็น REST API แทน

อ้างอิงไฟล์เดิม:
https://github.com/67160210-sudo/-Web-Application-Development/blob/main/nutrition-appnew.html
