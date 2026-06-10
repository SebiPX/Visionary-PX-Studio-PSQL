# Shared Notes Module & Moco Archive Sync

## 1. ToDo / Notizen (Shared Module)
- **PX-Studio**: Der Menüpunkt heißt nun klar und deutlich **"ToDo / Notizen"** (vorher "Notizen").
- **PX-Flow**: Das Modul `Notes.tsx` aus PX-Studio wurde erfolgreich nach PX-Flow kopiert und unter "PX Desk" integriert. Beide Apps nutzen denselben API-Endpunkt (`/api/notes`) und synchronisieren sich in Echtzeit.

## 2. Sichtbarkeit für den Superadmin (PX-Flow)
- Die Rechte-Prüfung in der Navigation (`Navigation.tsx`) und den Detail-Ansichten wurde überarbeitet.
- Der **SUPERADMIN** (`profile.role === 'superadmin'`) wird nun überall korrekt als Admin erkannt, sodass die Reiter "Karten" und "Verträge" wieder dauerhaft sichtbar und editierbar sind.

## 3. Moco Auto-Archiving Sync (Backend)
- **Problem**: In Moco archivierte Projekte wurden beim Sync ignoriert und blieben in PX-Flow fälschlicherweise "Aktiv".
- **Lösung**: Das Sync-Skript (`mocoDbSync.ts`) prüft nun, welche Projekte nicht mehr im aktiven Moco-Feed auftauchen. Diese verwaisten Projekte werden nun automatisch auf `status = 'completed'` gesetzt. Dadurch verschwinden sie sauber aus der aktiven Ansicht in PX-Flow und respektieren den `agency_projects_status_check` Constraint der Datenbank.

---

# Apify Integration for Social Audit Agent

I have successfully replaced the Mock-Sync functionality with real Apify data retrieval!

## Changes Made
- Installed the `apify-client` package in `labs-api`.
- Rewrote the backend API route `POST /api/social-audit/sync/:accountId` to use your `APIFY_API_TOKEN`.
- The logic will now dynamically use:
  - `apify/instagram-profile-scraper` for Instagram accounts.
  - `clockworks/tiktok-profile-scraper` for TikTok accounts.
- Extracted and mapped the varying data structures from these Apify actors into our local PostgreSQL schema (`social_posts` and `social_metrics`).
- Updated the frontend [AccountsView.tsx](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/components/SocialAudit/AccountsView.tsx) button and Toast notifications to indicate the new Apify "Sync Data" process.
- **NEU**: Es wurde ein Löschen-Knopf (Mülleimer) in der Account-Ansicht hinzugefügt. Dazu gibt es jetzt die neue Backend-Route `DELETE /api/social-audit/accounts/:id`, die einen Account und alle dazugehörigen Posts, Insights und Analysen sauber aus der Datenbank löscht.
- **NEU (VPS Fixes)**: Die Deployment-Architektur auf dem VPS wurde vereinheitlicht (getrenntes `/opt/docker/labs-api` Core-Backend), und Bugs im Bezug auf PostgreSQL Connection-Pooling (Deadlocks via `pool.query('BEGIN')`) wurden behoben.
- **NEU (CORB & AI Fix)**: Es wurde ein Image-Proxy im Backend hinzugefügt, um Instagrams striktes "Cross Origin Read Blocking" (CORB) zu umgehen. Außerdem wurde das KI-Modell (`gemini-2.5-flash-lite`) in [AIInsightsView.tsx](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/components/SocialAudit/AIInsightsView.tsx) aktualisiert, da alte Versionen serverseitig zu 404 Fehlern geführt haben.

## Account-Level AI History & Reports
- **Neues Feature**: Ein dedizierter Tab im Performance Dashboard ("AI Reports") erlaubt das automatische Generieren von datenbasierten Wachstums-Reports für einen ganzen Social Media Account.
- **Aggregation**: Die KI (Gemini 2.5 Flash Lite) liest die historischen Metriken (Total Likes, Comments, Engagement-Rate-Historien) von max. ~30 aktuellen Posts.
- **Speicher**: Das Backend schreibt die Reports chronologisch in die neue PostgreSQL-Tabelle `social_account_reports`.
- **Bugfixes**: Der node-postgres `pg` Driver warf beim Speichern von JS-Arrays in JSONB-Spalten Fehler. Ein explizites `JSON.stringify(array)` umschifft diesen 500er Server Error (wichtiges Learning für Folge-Implementierungen!).

## What's Next / Verification
To begin extracting real posts:
1. Ensure you have added `APIFY_API_TOKEN=your_token_here` into the backend [.env](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env) file at `d:\PX AgenturApp\PROJECT\CODE\2026\260226\Visionary-PX-Studio-PSQL\labs-api\.env`.
2. Restart your backend server (`npm run dev`).
3. In PX-Studio, add an Instagram or TikTok account username.
4. Click **Sync Data**. Wait 1-2 minutes for the Apify Actor to run.
5. Watch the dashboard populate with real videos, images, and engagement numbers!
6. **Löschen-Test:** Klicke auf den kleinen Mülleimer neben einem Account, um ihn mitsamt aller gesyncten Daten restlos zu entfernen.

## Calendar UI Enhancement (PX Intern)
- **Problem**: The [KalendarPage.tsx](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/components/Inventar/pages/KalendarPage.tsx) displayed all `verleihartikel` in a single long flat list, which became difficult to navigate with a growing inventory.
- **Solution**: Implemented dynamic categorization. Items are now grouped by their internal `geraet` field (e.g. "Audio", "Licht", "Kamera").
- **UX**: Categories appear as collapsible header rows in the table. By default, categories without active loans are collapsed.
- **Automation**: When the calendar is loaded or the month is changed, the system automatically checks all active `Verleihscheine`. If any item within a category is rented out during the currently viewed month, its category is **automatically expanded** to save the user from manually searching.

## Navigation Restructuring
- Moved the `Sketch Studio` and `Story Studio` modules from the "Agents" tab to the "Studio" tab in [components/Navigation.tsx](file:///d:/PX%20AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/components/Navigation.tsx). This creates a more logical grouping, keeping all creative asset-generation tools together in the Studio section.

## OpenRouter Image Generation Integration

We integrated OpenRouter's image generation capabilities into PX-Studio:
- **Backend Route**: Setup safe proxying in `labs-api/src/routes/openrouter.ts` with error handling, defensive model validation, and mapping OpenRouter's choice structure back to Gemini formats.
- **Fast Models Restriction**: Restricted OpenRouter models to only fast/lightweight models to prevent gateway timeouts on Nginx and keep generation times under 15-20s.
  - `sourceful/riverflow-v2-fast` (Default Model)
  - `sourceful/riverflow-v2-fast-preview`
  - `black-forest-labs/flux.2-klein-4b`
  - `openai/gpt-5-image-mini`
- **Nginx Config**: Configured `proxy_read_timeout 600s;` and `proxy_send_timeout 600s;` on the VPS Nginx Proxy Manager setup to guarantee the long HTTP connection isn't severed by the reverse proxy.

