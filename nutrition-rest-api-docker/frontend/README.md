นำ `nutrition-appnew.html` จาก repository เดิมมาไว้ในโฟลเดอร์นี้ได้เลย

Backend API:
http://localhost:8000/api

Swagger:
http://localhost:8000/docs

แนวทางเชื่อมหน้าเว็บ:
1. Login/Register ผ่าน `/api/auth/*`
2. เก็บ access_token ใน sessionStorage
3. เรียก `/api/ingredients` แทน DB JavaScript ในอนาคต
4. ส่งสูตรอาหารไป `/api/recipes`
5. ใช้ผล `per_serving` แสดงฉลากโภชนาการ
