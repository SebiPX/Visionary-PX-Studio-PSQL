# Visionary PX Studio — VPS Deployment Runbook

## Architektur

Zwei Services laufen parallel auf dem VPS:

| Service                | Pfad                         | Container                 | Extern erreichbar                                  |
| ---------------------- | ---------------------------- | ------------------------- | -------------------------------------------------- |
| Frontend (React/Nginx) | `/opt/docker/px-studio-psql` | `visionary-px-studio-app` | https://px-studio.labs-schickeria.com              |
| Backend (Express API)  | `/opt/docker/labs-api`       | `labs-api`                | https://api.labs-schickeria.com (intern Port 4001) |

Beide hängen im Docker-Netz `proxy-netz` hinter dem **Nginx Proxy Manager**.

---

## Lokale Entwicklung

Immer **zwei Terminals** öffnen:

```bash
# Terminal 1 — Frontend (Vite, Port 5173)
cd "d:\PX AgenturApp\PROJECT\CODE\2026\260226\Visionary-PX-Studio-PSQL"
npm run dev

# Terminal 2 — Backend (Express, Port 4000)
cd "d:\PX AgenturApp\PROJECT\CODE\2026\260226\Visionary-PX-Studio-PSQL\labs-api"
npm run dev
```

---

## [.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env) Dateien

### Frontend — [.env.local](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/.env.local) (lokal) / [.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env) (VPS)

```dotenv
VITE_API_URL=http://localhost:4000          # lokal
# VITE_API_URL=https://api.labs-schickeria.com  # VPS
VITE_GEMINI_API_KEY=...
```

### Backend — [labs-api/.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env) (lokal) / `/opt/docker/labs-api/.env` (VPS)

```dotenv
# VPS-Werte:
DATABASE_URL=postgresql://schickeria_user:Unsere-Schickeria-2026@host.docker.internal:5433/labs_db
DB_USER=schickeria_user
DB_PASSWORD=Unsere-Schickeria-2026
DB_PORT=5433
JWT_SECRET=...
GEMINI_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=generated-assets
R2_PUBLIC_URL=https://42e817feef1a0fe73189800cbbe001d7.r2.cloudflarestorage.com/generated-assets
ALLOWED_ORIGINS=http://localhost:5173,https://px-studio.labs-schickeria.com
```

> **Wichtig:** [.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env) Dateien werden nie von Git überschrieben — sie sind in [.gitignore](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/.gitignore).

---

## Deployment auf dem VPS

```bash
# Beide Services deployen:
/opt/docker/px-studio-psql/deploy.sh

# Nur Backend:
/opt/docker/px-studio-psql/deploy.sh api

# Nur Frontend:
/opt/docker/px-studio-psql/deploy.sh frontend
```

**Nach manuellem Config-Ändern** ([docker-compose.yml](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/docker-compose.yml) oder [.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env)):

```bash
cd /opt/docker/labs-api   # oder px-studio-psql
docker compose down && docker compose up -d
docker logs labs-api --since 2m
```

> ⚠️ `docker restart` lädt **keine** neuen Umgebungsvariablen — immer `docker compose down && up -d` benutzen!

---

## Häufige Fehler & Fixes

### ❌ `ERR_CONNECTION_REFUSED` auf `localhost:4000`

**Ursache:** Backend (labs-api) läuft nicht.  
**Fix:** `cd labs-api && npm run dev` (lokal) oder `docker compose up -d` (VPS).

### ❌ `no pg_hba.conf entry for host "172.x.x.x", user "postgres"`

**Ursache:** Der Docker-Container verbindet sich als `postgres`-User, welcher in `pg_hba.conf` nicht für das Docker-Netz erlaubt ist.  
**Fix (dauerhaft):** `DB_USER=schickeria_user` in `/opt/docker/labs-api/.env` setzen — `schickeria_user` ist in `/etc/postgresql/16/main/pg_hba.conf` für `172.0.0.0/8` erlaubt.

```
# pg_hba.conf Eintrag (bereits vorhanden):
host labs_db schickeria_user 172.0.0.0/8 scram-sha-256
```

### ❌ `500 Internal Server Error` nach Config-Änderung

**Ursache:** Container läuft noch mit alten Variablen.  
**Fix:** `docker compose down && docker compose up -d` (nicht nur `docker restart`).

### ✅ Auth API Endpunkte

| Aktion                      | Endpoint                              | Hinweis                            |
| --------------------------- | ------------------------------------- | ---------------------------------- |
| Login                       | `POST /auth/login`                    | gibt JWT zurück                    |
| Profil lesen                | `GET /auth/me`                        | JWT erforderlich                   |
| Profil updaten              | `PATCH /auth/profile`                 | Name, Avatar                       |
| Passwort ändern (User)      | `PATCH /auth/password`                | aktuelles PW erforderlich          |
| Passwort reset (Admin only) | `POST /auth/admin/reset-password`     | kein altes PW nötig, nur Admins    |
| Registrierung               | `POST /auth/register` ❌ **gesperrt** | Neue User nur via Admin-UI anlegen |
