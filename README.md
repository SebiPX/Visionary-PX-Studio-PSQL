# Visionary PX Studio

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**Eine hochmoderne KI-Content-Creation-Suite mit integriertem internen Teamportal**

Visionary PX Studio vereint Google's leistungsstärkste KI-Modelle (Gemini & Veo) in einer futuristischen Glassmorphism-Benutzeroberfläche – plus ein vollständiges internes Portal (PX INTERN) mit Inventar, Verleih, Logins, Firmendaten und konfigurierbarem Dashboard.

---

## 🏗️ Architektur-Übersicht

```
Browser (React / Vite)
        │  HTTPS
        ▼
labs-api (Express.js auf Hostinger VPS)
        │  PostgreSQL
        ▼
  labs_db (PostgreSQL 16 + pgvector)
        │  S3
        ▼
Cloudflare R2 (File Storage)
```

- **Kein Supabase** — vollständig selbst gehostet
- **Zwei Docker-Container** auf dem VPS: `px-studio-psql` (Frontend) und `labs-api` (Backend)
- **JWT Auth** — kein externer Auth-Dienst

---

## 🚀 Schnellstart (Lokal)

### Voraussetzungen

- Node.js 20+
- PostgreSQL 16 (`labs_db` lokal oder auf VPS)
- Google Gemini API Key
- Cloudflare R2 Bucket (für File Storage)

### 1. Repository klonen

```bash
git clone https://github.com/SebiPX/Visionary-PX-Studio-PSQL.git
cd Visionary-PX-Studio-PSQL
```

### 2. Backend starten

```bash
cd backend
cp .env.example .env
# .env befüllen (siehe unten)
npm install
npm run dev        # Startet auf Port 4000
```

**`backend/.env` Felder:**

```env
DATABASE_URL=postgresql://user:pass@host:5432/labs_db
DB_SSL=true
JWT_SECRET=min-32-zeichen-langer-geheimer-schluessel
ALLOWED_ORIGINS=http://localhost:5173
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev
GEMINI_API_KEY=AIzaXXX
```

### 3. Datenbank anlegen

```bash
# Basis-Schema:
psql $DATABASE_URL -f backend/schema.sql

# PX INTERN Tabellen (Inventar):
psql $DATABASE_URL -f backend/inventar_migration.sql
```

### 4. Frontend konfigurieren

```env
# .env.local (im Root)
VITE_API_URL=http://localhost:4000
```

### 5. Frontend starten

```bash
npm install
npm run dev
# → http://localhost:5173
```

---

## 🖥️ Deployment auf dem Server (Hostinger VPS)

Der Server läuft unter `/opt/docker/`. **Zwei getrennte Dienste:**

### Frontend deployen

```bash
cd /opt/docker/px-studio-psql
git pull
docker-compose up --build -d
```

**`/opt/docker/px-studio-psql/.env`:**

```env
VITE_API_URL=https://api.labs-schickeria.com
GEMINI_API_KEY=AIzaXXX
APP_PORT=3010        # freier Port (nicht 80 oder 8000!)
```

### Backend deployen (labs-api)

Das Backend liegt als Unterordner `backend/` im Mono-Repo. Nach einem `git pull` im px-studio-psql Verzeichnis:

```bash
# Backend-Dateien in labs-api Ordner kopieren:
cp -r /opt/docker/px-studio-psql/backend/* /opt/docker/labs-api/

cd /opt/docker/labs-api
docker-compose up --build -d
```

**`/opt/docker/labs-api/.env`:**

```env
DATABASE_URL=postgresql://user:pass@host:5432/labs_db
DB_SSL=true
JWT_SECRET=dein-geheimer-schluessel
ALLOWED_ORIGINS=https://studio.labs-schickeria.com
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx
R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev
GEMINI_API_KEY=AIzaXXX
PORT=4000
```

### Inventar-Tabellen auf Produktions-DB anlegen

```bash
# Einmalig – nur wenn Inventar-Tabellen noch nicht existieren:
psql "$DATABASE_URL" -f /opt/docker/labs-api/inventar_migration.sql
```

> ✅ Die Migration ist sicher — sie nutzt `CREATE TABLE IF NOT EXISTS` und kann mehrfach ausgeführt werden.

---

## ✨ Features

### 🏠 Dashboard

- Masonry-Grid mit allen Generierungen
- Klickbare Karten für direkte Navigation
- Echtzeit-Updates aus labs_db
- **Tools & Apps** Bereich mit direktem Inventar-Zugang

### 🎨 Image Gen

- Text-to-Image, Image-to-Image, Inpainting
- Gemini 2.0 Flash Exp · Mehrere Seitenverhältnisse

### 🎥 Video Studio

- Veo 3.1 Fast & High Quality
- Text-to-Video & Image-to-Video
- Kamerabewegungen, Dauer-Kontrolle

### 📝 Text Engine

- Multi-Platform (YouTube, Instagram, TikTok, Twitter)
- Google Trends Integration · Batch-Generierung

### 🖼️ Thumbnail Engine

- 3-Schritt Workflow (Background, Elements, Text)
- KI-Ideen-Generator · Layer-Komposition

### 📖 Story Studio

- 4-Phasen Workflow: Setup → Story → Storyboard → Review
- Shot-by-Shot Bilder mit Regenerierung
- **Asset Reference Images:** Separates Referenzbild vs. generiertes Ergebnis (`ref_image_url`)
- **AssetCard:** Referenzbild-Thumbnail, Wardrobe Toggle, Download, Lightbox-Vorschau

### 🎞️ Image Source Picker

- Wiederverwendbares Modal in Image Gen, Video Studio, Thumbnails & Storyboard
- **3 Quellen:** Datei-Upload · Webcam (Live → Foto) · Eigene Assets (DB-Grid)

### ✏️ Sketch Studio

- Sketch-to-Image mit `gemini-3.1-flash-image-preview`
- Interaktives Drawing Canvas, Undo/Redo, Aspect Ratio

### 💬 Chat Bot

- 6 Personas: Creative, Tech, Marketing, SEO, General, Onboarding
- **Onboarding Bot** mit RAG (pgvector Cosine-Similarity über `onboarding_embeddings`)
- Markdown-Rendering, Chat-History

### 🎤 PX Event Agent

- Mehrstufiger KI-Workflow: Morphological Box → SCAMPER → Pitch
- Google Search API: Ortsspezifische Vorschläge (Locations, Vendoren)
- Selbstgenerierendes, portables HTML-Pitchbook

### ⚙️ Settings

- Profil & Avatar-Upload (Cloudflare R2)
- Passwort ändern (aktuelles Passwort erforderlich)
- **Admin:** Beliebige User-Passwörter zurücksetzen — neues Passwort wird in der UI angezeigt

---

## 📦 PX INTERN (Internes Teamportal)

Zugänglich über **Dashboard → „PX INTERN"**. Eigenständige React-App mit `MemoryRouter`.

| Modul                | Beschreibung                                                          |
| -------------------- | --------------------------------------------------------------------- |
| **Dashboard**        | Konfigurierbar: Links, Kalender, Ausleihen, Stats, angeheftete Logins |
| **Inventar**         | Geräteverwaltung mit Status, Fotos, Filtern, CSV-Export               |
| **Verleih**          | Ausleihe-Tracking mit Rückgabe & Archiv                               |
| **Verleih-Formular** | Neuen Verleihschein erstellen, Kostenberechnung, PDF                  |
| **Kalender**         | Monatsansicht aller aktiven Ausleihen                                 |
| **Logins**           | Zugangsdaten-Verwaltung; anpinnen im Dashboard möglich                |
| **Handyverträge**    | Mobilfunkvertrag-Übersicht                                            |
| **Kreditkarten**     | Kreditkarten-Verwaltung                                               |
| **Firmendaten**      | Bankverbindung & Handelsregisterdaten                                 |
| **Interne Links**    | Team-Links mit Kategorien & Google Favicon CDN                        |

---

## 🔐 Authentifizierung

Eigenständiges JWT Auth-System — kein Supabase, kein Firebase:

- ✅ Email/Password Login
- ❌ Öffentliche Registrierung **deaktiviert** — nur Admins können neue Accounts anlegen
- ✅ JWT Token (7 Tage, localStorage)
- ✅ Session-Persistenz (auto-login beim Reload)
- ✅ Rollen: `user` / `admin`
- ✅ bcrypt Passwort-Hashing (cost 12)
- ✅ Passwort ändern (User: erfordert aktuelles Passwort)
- ✅ **Admin Password Reset** — Admin setzt Passwort eines Users direkt zurück (kein altes PW nötig)

---

## 📊 Datenbank (labs_db)

### KI-Studio Tabellen

| Tabelle                 | Inhalt                                   |
| ----------------------- | ---------------------------------------- |
| `profiles`              | Benutzer: Email, Name, Avatar-URL, Rolle |
| `generated_images`      | Bildgenerierungen                        |
| `generated_videos`      | Videogenerierungen                       |
| `generated_thumbnails`  | Thumbnails                               |
| `generated_texts`       | Textgenerierungen                        |
| `generated_sketches`    | Sketch-to-Image (R2-URL in DB)           |
| `storyboard_sessions`   | Story Studio Projekte                    |
| `chat_sessions`         | ChatBot-Verläufe                         |
| `onboarding_embeddings` | RAG-Vektordaten (pgvector, 768-dim)      |

### PX INTERN Tabellen

| Tabelle                        | Inhalt                            |
| ------------------------------ | --------------------------------- |
| `inventar_items`               | Geräte & Assets                   |
| `inventar_loans`               | Ausleihen                         |
| `inventar_verleihscheine`      | Verleihschein-Header              |
| `inventar_verleihschein_items` | Verleihschein-Positionen          |
| `inventar_logins`              | Zugangsdaten                      |
| `inventar_handyvertraege`      | Mobilfunkverträge                 |
| `inventar_kreditkarten`        | Kreditkarten                      |
| `inventar_firmendaten`         | Firmendaten                       |
| `inventar_links`               | Interne Team-Links                |
| `inventar_dashboard_config`    | Per-User Dashboard-Config (JSONB) |

---

## 🛠️ Tech Stack

| Bereich    | Technologie                                          |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite                           |
| Styling    | Tailwind CSS                                         |
| Backend    | Express.js + Node.js (`backend/`)                    |
| Datenbank  | PostgreSQL 16 + pgvector                             |
| Storage    | Cloudflare R2 (S3-kompatibel)                        |
| Auth       | JWT + bcrypt (eigenständig)                          |
| AI         | Gemini 2.0–2.5, Veo 3.1, gemini-embedding-001        |
| Deployment | Docker, Hostinger VPS, Nginx Proxy Manager           |
| Icons      | Material Icons Rounded, Lucide React                 |
| Extras     | jsPDF, QRCode React, React Markdown, React Hot Toast |

---

## 📚 Dokumentation

- [APP_INFO.md](./APP_INFO.md) — Detaillierte Feature-Beschreibung
- [backend/README.md](./backend/README.md) — Express API Setup & Endpunkte
- [backend/schema.sql](./backend/schema.sql) — Basis-Datenbankschema
- [backend/inventar_migration.sql](./backend/inventar_migration.sql) — PX INTERN Tabellen

---

## 🎨 Design

Cyberpunk / Futuristic Glassmorphism:

- Dunkle Hintergründe (`#101622`) · Neon-Blau Primary (`#135bec`)
- Backdrop-Blur Effekte · Smooth Animations · Vollständig Responsive

---

**Visionary PX Studio** - Create the Future with AI 🚀
