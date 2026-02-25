# labs-api

Express.js REST API backend for PX AIssistent V4 — replaces Supabase with a direct PostgreSQL connection to `labs_db`.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 16 (`labs_db` on VPS)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI Proxy**: Gemini API (keys stay server-side)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in all values
```

### 3. Create tables in labs_db

Open `schema.sql` in DBeaver, connect to `labs_db`, and run it.

### 4. Start development server

```bash
npm run dev
```

Server starts at `http://localhost:4000`.

Test it:

```bash
curl http://localhost:4000/health
# → { "ok": true, "timestamp": "..." }
```

---

## API Routes

| Method          | Path                        | Auth | Description                 |
| --------------- | --------------------------- | ---- | --------------------------- |
| POST            | `/auth/register`            | ❌   | Create account              |
| POST            | `/auth/login`               | ❌   | Login → JWT                 |
| GET             | `/auth/me`                  | ✅   | Current user                |
| PATCH           | `/auth/profile`             | ✅   | Update name/avatar          |
| GET             | `/api/images`               | ✅   | List generated images       |
| POST            | `/api/images`               | ✅   | Save image record           |
| DELETE          | `/api/images/:id`           | ✅   | Delete image                |
| GET/POST/DELETE | `/api/videos`               | ✅   | Videos                      |
| GET/POST/DELETE | `/api/thumbnails`           | ✅   | Thumbnails                  |
| GET/POST/DELETE | `/api/sketches`             | ✅   | Sketches                    |
| GET/POST/DELETE | `/api/texts`                | ✅   | Generated texts             |
| GET/POST/DELETE | `/api/storyboards`          | ✅   | Storyboard sessions         |
| POST            | `/api/upload?folder=images` | ✅   | Upload file → Cloudflare R2 |
| POST            | `/api/gemini`               | ✅   | Gemini API proxy            |

---

## Deployment on VPS

```bash
# Build TypeScript
npm run build

# Start with PM2 (auto-restart)
pm2 start dist/index.js --name labs-api
pm2 save

# Or with systemd (see below)
```

### Nginx Proxy Manager

Create a new proxy host in NPM:

- **Domain**: `api.labs-schickeria.com`
- **Forward Hostname/IP**: `localhost`
- **Forward Port**: `4000`
- Enable SSL + Force HTTPS

---

## User Migration from Supabase

1. Export `profiles` from Supabase (via DBeaver or Supabase Dashboard → CSV)
2. Map columns: `id`, `email`, `full_name`, `avatar_url` → import into `labs_db.profiles`
3. Set a temporary `password_hash` for all imported users:
   ```sql
   -- Set all imported passwords to 'ChangeMe123!' (users must reset)
   UPDATE profiles SET password_hash = '$2a$12$...' WHERE password_hash IS NULL;
   ```
4. Communicate new login flow to users

---

## Security Notes

- `GEMINI_API_KEY`, `R2_*` credentials, `JWT_SECRET` are **NEVER** sent to or from the browser
- All database queries use parameterized statements (no SQL injection)
- JWT tokens expire after 7 days
- File upload limited to 50MB max
