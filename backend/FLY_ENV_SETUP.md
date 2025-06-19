# Fly.io Environment Variables Setup

## Required Environment Variables

You'll need to set these environment variables in Fly.io:

```bash
# Database (will be set automatically when you attach Fly PostgreSQL)
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret" 
YOUTUBE_API_KEY="your-youtube-api-key"

# URLs (production)
FRONTEND_URL="https://your-frontend-domain.com"
BACKEND_URL="https://watchlikeme-backend.fly.dev"
ORIGIN="http://localhost:3000"  # for local dev
```

## Setting them in Fly.io:

```bash
fly secrets set JWT_SECRET="your-secret"
fly secrets set GOOGLE_CLIENT_ID="your-id"
fly secrets set GOOGLE_CLIENT_SECRET="your-secret"
fly secrets set YOUTUBE_API_KEY="your-key"
fly secrets set FRONTEND_URL="https://your-frontend-url"
fly secrets set BACKEND_URL="https://watchlikeme-backend.fly.dev"
```

## Database Setup:

```bash
# Create PostgreSQL cluster
fly postgres create --name watchlikeme-db

# Attach database to your app
fly postgres attach --app watchlikeme-backend watchlikeme-db
```