# Visionary PX Studio

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**Eine hochmoderne KI-Content-Creation-Suite mit integriertem internen Teamportal**

Visionary PX Studio vereint Google's leistungsstärkste KI-Modelle (Gemini & Veo) in einer futuristischen Glassmorphism-Benutzeroberfläche – plus ein vollständiges internes Portal (PX INTERN) mit Inventar, Verleih, Logins, Firmendaten und konfigurierbarem Dashboard.

---

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 20+
- PostgreSQL 16 (`labs_db` auf VPS oder lokal)
- Google Gemini API Key
- Cloudflare R2 Bucket (für File Storage)

### Installation

1. **Repository klonen:**

   ```bash
   git clone https://github.com/SebiPX/Visionary-PX-Studio-PSQL.git
   cd Visionary-PX-Studio-PSQL
   ```

2. **Frontend Dependencies installieren:**

   ```bash
   npm install
   ```

3. **Backend starten (Docker auf VPS):**

   ```bash
   cd backend
   cp .env.example .env
   # .env befüllen (DB, JWT, R2, Gemini)
   docker compose up -d --build
   ```

4. **Datenbank anlegen:**

   `backend/schema.sql` in DBeaver auf `labs_db` ausführen.

5. **Frontend konfigurieren:**

   ```env
   # .env.local
   VITE_API_URL=https://api.labs-schickeria.com
   ```

6. **Entwicklungsserver starten:**

   ```bash
   npm run dev
   ```

7. **App öffnen:**
   Navigieren Sie zu `http://localhost:5173`

---

## ✨ Features

### 🏠 **Dashboard**

- Masonry-Grid mit allen Generierungen
- Klickbare Karten für direkte Navigation
- Echtzeit-Updates aus labs_db (PostgreSQL)
- **Tools & Apps** Bereich mit direktem Inventar-Zugang

### 🎨 **Image Gen**

- Text-to-Image, Image-to-Image, Inpainting
- Gemini 2.0 Flash Exp
- Mehrere Seitenverhältnisse
- Preview & Download

### 🎥 **Video Studio**

- Veo 3.1 Fast & High Quality
- Text-to-Video & Image-to-Video
- Kamerabewegungen, Dauer-Kontrolle
- Video-Player mit Preview

### 📝 **Text Engine**

- Multi-Platform (YouTube, Instagram, TikTok, Twitter)
- Google Trends Integration
- Batch-Generierung
- Copy-to-Clipboard

### 🖼️ **Thumbnail Engine**

- 3-Schritt Workflow (Background, Elements, Text)
- KI-Ideen-Generator
- Layer-Komposition
- Preview & Download

### 📖 **Story Studio**

- 4-Phasen Workflow (Setup, Story, Storyboard, Review)
- KI-Story-Generierung
- Shot-by-Shot Bilder
- Regenerierungs-Optionen

### ✏️ **Sketch Studio**

- Sketch-to-Image Transformation
- Interaktives Drawing Canvas
- Context & Style Auswahl
- History mit Wiederherstellung

### 💬 **Chat Bot**

- 6 Personas: Creative, Tech, Marketing, SEO, General, **Onboarding Support**
- **Onboarding Support Bot** mit RAG (Retrieval-Augmented Generation) — durchsucht automatisch die interne Firmenwissensdatenbank
- Streaming-Antworten mit **Markdown-Rendering** (Überschriften, Listen, Bold, Code)
- Chat-History mit Wiederherstellung

### ⚙️ **Settings**

- Profilverwaltung
- Avatar-Upload (Cloudflare R2)
- Passwort-Reset

---

## 📦 PX INTERN (Integriertes Modul)

Vollständiges internes Teamportal, zugänglich direkt über das Dashboard → "PX INTERN".

### Module

- **🏠 Dashboard** — Konfigurierbar pro User: Interne Links, Kalender-Widget, Ausleihen-Widget, Inventar-Stats, angeheftete Logins
- **📋 Inventar** — Geräteverwaltung mit Status, Fotos, Filtern & CSV-Export
- **🔄 Verleih** — Ausleihe-Tracking mit Rückgabe & Archiv
- **📄 Verleih-Formular** — Neues Verleihschein erstellen mit PDF-Export
- **📅 Kalender** — Monatsansicht aller aktiven Ausleihen
- **🔑 Logins** — Zugangsdaten-Verwaltung; Logins können im Dashboard angeheftet werden
- **📱 Handyverträge** — Mobilfunkvertrag-Übersicht
- **💳 Kreditkarten** — Kreditkarten-Verwaltung
- **🏢 Firmendaten** — Bankverbindung & Handelsregisterdaten
- **🔗 Interne Links** — Teamlinks mit Kategorien, Google Favicon CDN & Buchstaben-Avatar Fallback

### Rollen

- **User** — Lesen & eigene Daten verwalten; eigene Dashboard-Konfiguration
- **Admin** — Voller Zugriff auf alle Module inkl. Bearbeiten & Löschen

---

## 🔐 Authentifizierung

Eigenständiges JWT Auth-System (kein Supabase):

- ✅ Email/Password Login & Signup
- ✅ JWT Token (7 Tage gültig, localStorage)
- ✅ Session-Persistenz
- ✅ Rollen-System (user / admin)
- ✅ bcrypt Passwort-Hashing

Backend API: `api.labs-schickeria.com/auth/*`

---

## 📊 Datenbank

### KI-Studio Tabellen

- `profiles` — Benutzerprofile mit Rollen
- `generated_images` — Bildgenerierungen
- `generated_videos` — Videogenerierungen
- `generated_thumbnails` — Thumbnails
- `generated_texts` — Texte
- `generated_videos` — Videogenerierungen (Veo → Upload zu `generated_assets` Storage → permanente URL)
- `generated_sketches` — Sketch-to-Image (Upload zu `generated_assets/sketches/` → URL in DB)
- `onboarding_embeddings` — Vektordatenbank für RAG-Chatbot (pgvector, 768-dim)
- `stories` — Story Studio Projekte

### PX INTERN Tabellen

- `inventar_items` — Geräte & Assets
- `inventar_loans` — Ausleihen
- `inventar_verleihscheine` — Verleihscheine & Positionen
- `inventar_logins` — Zugangsdaten
- `inventar_handyvertraege` — Mobilfunkverträge
- `inventar_kreditkarten` — Kreditkarten
- `inventar_firmendaten` — Firmendaten
- `inventar_links` — Interne Teamlinks
- `inventar_dashboard_config` — Per-User Dashboard-Konfiguration (JSONB, RLS: user-scoped)

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend:** Express.js + Node.js (`backend/`) — ersetzt Supabase komplett
- **Datenbank:** PostgreSQL 16 + pgvector (`labs_db`)
- **Storage:** Cloudflare R2 (S3-kompatibel)
- **Auth:** JWT + bcrypt (eigenständig, kein externer Auth-Dienst)
- **AI:** Google Gemini 2.0–2.5, Veo 3.1, Gemini Embedding (`gemini-embedding-001`)
- **Routing:** React Router DOM (MemoryRouter für Inventar-Isolation)
- **Icons:** Material Icons Rounded, Lucide React
- **PDF:** jsPDF, QRCode React
- **Markdown:** React Markdown
- **Toasts:** React Hot Toast

---

## 📚 Dokumentation

- [APP_INFO.md](./APP_INFO.md) — Ausführliche Feature-Beschreibung
- [backend/README.md](./backend/README.md) — Express API Setup & Deployment Guide
- [backend/schema.sql](./backend/schema.sql) — PostgreSQL Schema (labs_db)

---

## 🎨 Design

Cyberpunk / Futuristic Glassmorphism:

- Dunkle Hintergründe (#101622)
- Neon-Blau Primary (#135bec)
- Backdrop-Blur Effekte
- Smooth Animations
- Vollständig Responsive

---

## 📝 Lizenz

Dieses Projekt ist für internen Gebrauch bei PX Agentur erstellt.

---

**Visionary PX Studio** - Create the Future with AI 🚀
