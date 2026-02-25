# Visionary PX Studio — App Info

**Visionary PX Studio** ist eine webbasierte KI-Content-Creation-Suite mit integriertem internen Teamportal (PX INTERN). Die gesamte Backend-Logik läuft auf einem selbst gehosteten Express.js Server (`labs-api`) mit PostgreSQL — kein Supabase, kein Firebase.

---

## 🏗️ Technische Architektur

```
React Frontend  →  labs-api (Express.js)  →  PostgreSQL labs_db
                                          →  Cloudflare R2 (Storage)
                                          →  Google Gemini API
```

### Wichtige Dateien

| Datei/Ordner                            | Zweck                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/apiClient.ts`                      | **Zentrale API-Schicht** — ersetzt Supabase komplett. Alle Frontend-Calls gehen durch diese Datei.   |
| `contexts/AuthContext.tsx`              | Auth-State (JWT), Login, Logout, Passwort ändern                                                     |
| `backend/src/routes/`                   | Express-Routen: auth, gemini, images, videos, texts, sketches, storyboards, upload, rag, inventar/\* |
| `backend/src/middleware/requireAuth.ts` | JWT-Middleware — schützt alle API-Endpunkte                                                          |
| `backend/schema.sql`                    | Basis-Schema (profiles, generated\_\*, storyboard_sessions, chat_sessions, onboarding_embeddings)    |
| `backend/inventar_migration.sql`        | PX INTERN Tabellen (10 Inventar-Tabellen)                                                            |

---

## 🚀 Features — Detailbeschreibung

### 1. 🏠 Dashboard

- Masonry-Grid mit allen Generierungen (Bilder, Videos, Thumbnails)
- Klickbare Karten → navigieren direkt zum Tool mit vorgeladenem Content
- **Tools & Apps** Bereich mit Direktzugang zu PX Inventar
- Echtzeit-Daten aus `labs_db` via `apiClient`

### 2. 🎨 Image Gen

- **Modell:** `gemini-2.0-flash-exp`
- **Modi:** Text-to-Image, Image-to-Image, Inpainting/Edit
- **Seitenverhältnisse:** 1:1, 16:9, 9:16
- Generierungen werden in `generated_images` (DB) + Cloudflare R2 gespeichert

### 3. 🎥 Video Studio

- **Modell:** Veo 3.1 (Fast & High Quality)
- **Modi:** Text-to-Video, Image-to-Video
- **Kontrolle:** Kamerabewegungen, Dauer (2s/4s/8s), Seitenverhältnis
- Videos werden zu R2 hochgeladen, URL in `generated_videos` gespeichert

### 4. 📝 Text Engine

- **Plattformen:** YouTube, Instagram, TikTok, Twitter — jeweils optimiertes Format
- Google Trends Integration, Batch-Generierung, Copy-to-Clipboard
- Gespeichert in `generated_texts`

### 5. 🖼️ Thumbnail Engine

- 3-Schritt Workflow: Hintergrund → Elemente → Text-Overlay
- KI generiert Ideen für Bildbeschreibungen und Titel
- Gespeichert in `generated_thumbnails` + R2

### 6. 📖 Story Studio

- **4 Phasen:** Setup → Story → Storyboard → Review
- KI generiert Story → Shot-Liste → Shot-by-Shot Bilder
- Vollständige Persistenz in `storyboard_sessions` (JSONB)

### 7. ✏️ Sketch Studio

- **Modell:** `gemini-2.5-flash-image`
- Interaktives Drawing Canvas mit Undo/Redo, Aspect Ratio, Stil-Auswahl
- Generiertes Bild → Upload zu R2 → URL in `generated_sketches` (kein base64 in DB)

### 8. 💬 Chat Bot

- **6 Personas:** Medien-Analyst, DevX Assistant, Content Stratege, Marketing & SEO Pro, Gemini General, **Onboarding Support**
- **Onboarding Support (RAG):**
  - Frage wird mit `gemini-embedding-001` (768-dim) vektorisiert
  - `POST /api/rag` auf dem Backend führt pgvector Cosine-Similarity-Suche durch
  - Ergebnisse aus `onboarding_embeddings` werden als Kontext injiziert
  - Graceful Fallback: funktioniert auch ohne pgvector Extension
- **Chat-History:** Gespeichert in `chat_sessions`, wiederherstellbar
- **Markdown-Rendering:** Alle Bot-Antworten als formatiertes Markdown

### 9. ⚙️ Benutzereinstellungen

- Profil bearbeiten (Name)
- Avatar-Upload → Cloudflare R2 → URL in `profiles`
- **Passwort ändern:** Erfordert aktuelles Passwort (sicher, kein E-Mail-Reset nötig)
- Backend: `PATCH /auth/profile` und `PATCH /auth/password`

---

## 📦 PX INTERN — Internes Teamportal

Zugänglich über **Dashboard → „PX INTERN"**. Läuft als eigenständige React-App mit `MemoryRouter` (isoliertes Routing). Teilt Login & JWT mit dem Studio.

### Module

| Seite                | Beschreibung                                                                                    | Rollen             |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| **Dashboard**        | Konfigurierbar per User: Links, Kalender, Ausleihen-Widgets, Inventar-Stats, angeheftete Logins | Alle               |
| **Inventar**         | Gerätliste mit Filtern, Suche, Status, Fotos, CSV-Export                                        | Alle / Admin: CRUD |
| **Verleih**          | Aktive & archivierte Ausleihen, Rückgabe-Funktion                                               | Alle / Admin       |
| **Verleih-Formular** | Neuen Verleihschein erstellen, Kostenberechnung, PDF-Export                                     | Alle               |
| **Kalender**         | Monatsansicht aller aktiven Ausleihen                                                           | Alle               |
| **Logins**           | Zugangsdaten (z.B. Software-Accounts); im Dashboard anpinnbar                                   | Alle / Admin: CRUD |
| **Handyverträge**    | Mobilfunkvertrag-Übersicht                                                                      | Admin              |
| **Kreditkarten**     | Kreditkarten-Verwaltung                                                                         | Admin              |
| **Firmendaten**      | Bankverbindung & Handelsregisterdaten                                                           | Admin              |
| **Interne Links**    | Team-Links mit Kategorien, Google Favicon CDN, Buchstaben-Fallback                              | Alle / Admin: CRUD |

### Dashboard-Konfiguration (pro User)

Über den ⚙ **„Anpassen"** Button individuell einstellbar:

- **Widgets ein-/ausschalten:** Links, Ausleihen, Stats
- **Link-Kategorien filtern:** Nur bestimmte Kategorien anzeigen
- **Logins anpinnen:** Erscheinen als „Meine Logins" ganz oben
- **Persistenz:** In `inventar_dashboard_config` (JSONB, user-scoped via JWT)

### Rollen-System

- **user** — Standard-Lesezugriff, eigene Aktionen, eigene Dashboard-Config
- **admin** — Vollzugriff auf alle Module (definiert via `profiles.role`)

### Navigation

- Zugang über **Dashboard → „PX INTERN"** Karte
- **„Zurück zum Studio"** Button jederzeit sichtbar (oben rechts)
- Eigene Sidebar innerhalb des Moduls

---

## 🔐 Authentifizierung

**Self-hosted JWT Auth — kein externer Dienst:**

| Feature         | Umsetzung                                              |
| --------------- | ------------------------------------------------------ |
| Login/Signup    | `POST /auth/login`, `POST /auth/register`              |
| Profil lesen    | `GET /auth/me` (JWT erforderlich)                      |
| Profil updaten  | `PATCH /auth/profile`                                  |
| Passwort ändern | `PATCH /auth/password` (aktuelles PW erforderlich)     |
| Token           | JWT, 7 Tage gültig, im `localStorage`                  |
| Hashing         | bcrypt, cost 12                                        |
| Middleware      | `requireAuth` prüft JWT bei jedem geschützten Endpunkt |

---

## 📊 Datenbankstruktur (labs_db)

### Schema-Dateien

- `backend/schema.sql` → KI-Studio + Auth Tabellen
- `backend/inventar_migration.sql` → PX INTERN Tabellen

### KI Studio

| Tabelle                 | Inhalt                                                      |
| ----------------------- | ----------------------------------------------------------- |
| `profiles`              | Benutzer: Email, Name, Avatar-URL, Rolle, password_hash     |
| `generated_images`      | Bildgenerierungen (Prompt, URL, Aspect Ratio)               |
| `generated_videos`      | Videogenerierungen (URL zu R2)                              |
| `generated_thumbnails`  | Thumbnails                                                  |
| `generated_texts`       | Textgenerierungen (Plattform, Content)                      |
| `generated_sketches`    | Sketch-to-Image (R2-URL, kein base64)                       |
| `storyboard_sessions`   | Story Studio Projekte (JSONB für Shots/Assets)              |
| `chat_sessions`         | ChatBot-Verläufe (JSONB Messages-Array)                     |
| `onboarding_embeddings` | RAG-Vektordaten (pgvector, 768-dim, `gemini-embedding-001`) |

### PX INTERN

| Tabelle                        | Inhalt                                                    |
| ------------------------------ | --------------------------------------------------------- |
| `inventar_items`               | Geräte & Assets (Status, Foto-URL, Kategorie)             |
| `inventar_loans`               | Ausleihen (JOIN mit profiles & items)                     |
| `inventar_verleihscheine`      | Verleihschein-Header (atomare Transaktion beim Erstellen) |
| `inventar_verleihschein_items` | Verleihschein-Positionen (Preise)                         |
| `inventar_logins`              | Zugangsdaten                                              |
| `inventar_handyvertraege`      | Mobilfunkverträge                                         |
| `inventar_kreditkarten`        | Kreditkarten                                              |
| `inventar_firmendaten`         | Firmendaten (Bank, Handelsregister)                       |
| `inventar_links`               | Interne Team-Links (URL, Kategorie, Favicon)              |
| `inventar_dashboard_config`    | Per-User Config (JSONB, user_id aus JWT)                  |

---

## 📂 Projektstruktur

```text
/
├── App.tsx                        # Hauptlayout & View-Switching
├── lib/
│   └── apiClient.ts               # ← ZENTRALE API-SCHICHT (ersetzt supabaseClient!)
├── contexts/
│   └── AuthContext.tsx            # JWT Auth State
├── hooks/
│   ├── useGeneratedContent.ts     # KI-Inhalte laden/speichern
│   ├── useStoryboard.ts
│   └── useAssetManager.ts
├── components/
│   ├── Inventar/
│   │   ├── hooks/                 # 10 Custom Hooks (useInventar, useLoans, …)
│   │   ├── components/            # UI (Sidebar, Tables, Forms, Modal…)
│   │   └── pages/                 # 10 Seiten
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── ResetPassword.tsx      # Passwort ändern (braucht aktuelles PW)
│   ├── ChatBot.tsx                # inkl. RAG für Onboarding-Persona
│   ├── Settings.tsx
│   └── …
└── backend/                       # Express.js Backend (labs-api)
    ├── src/
    │   ├── index.ts               # Alle Routen registriert
    │   ├── db.ts                  # PostgreSQL Pool
    │   ├── middleware/
    │   │   └── requireAuth.ts     # JWT Middleware
    │   └── routes/
    │       ├── auth.ts            # Login, Register, Me, Profile, Password
    │       ├── gemini.ts          # Gemini API Proxy
    │       ├── rag.ts             # RAG Endpoint (pgvector)
    │       ├── images.ts
    │       ├── videos.ts
    │       ├── texts.ts
    │       ├── thumbnails.ts
    │       ├── sketches.ts
    │       ├── storyboards.ts
    │       ├── upload.ts
    │       └── inventar/          # 10 Inventar-Route-Dateien
    ├── schema.sql
    ├── inventar_migration.sql
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🎨 Design & UX

**Theme:** Cyberpunk / Futuristic Glassmorphism

- **Farben:** Dunkel (`#101622`), Neon-Blau (`#135bec`)
- **Effekte:** Backdrop-Blur (Glass), Neon-Glow Schatten, sanfte Animationen
- **Icons:** Material Icons Rounded (Studio), Lucide React (Inventar)
- **Responsiv:** Vollständig responsive für Desktop & Tablet

---

_Visionary PX Studio — Create the Future with AI 🚀_
