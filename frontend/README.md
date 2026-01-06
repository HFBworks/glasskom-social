# GlassKom Social - Frontend

React + TypeScript + Vite frontend application.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Docker

```bash
docker build -t glasskom-frontend .
docker run -p 80:80 glasskom-frontend
```

## Environment Variables

- `API_URL` - Backend API URL (default: http://localhost:3001)
- `API_KEY` - Gemini API Key
