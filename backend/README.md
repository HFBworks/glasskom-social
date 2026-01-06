
# 🚀 GlassKom Backend

Modular Node.js backend with PostgreSQL and Socket.IO.

## 📂 Folder Structure
- `src/controllers`: Request handlers and business logic.
- `src/middleware`: Custom middleware (auth, etc.).
- `src/models`: Database connection and schema interactions.
- `src/routes`: API route definitions.
- `src/utils`: Helper functions.
- `app.js`: Server entry point.

## 🛠️ Local Setup
1. `cd backend`
2. `npm install`
3. Create `.env` based on provided guidelines.
4. `npm run dev` (requires nodemon) or `node src/app.js`

## 🐳 Docker Deployment
```bash
docker-compose up -d --build
```
