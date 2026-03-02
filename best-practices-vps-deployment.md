# Best Practices: React + Express API + Docker + Cloudflare R2 auf VPS

Erkenntnisse aus dem Deployment von **Visionary PX Studio** (React/Vite Frontend + Express Backend + PostgreSQL + Cloudflare R2).

---

## 1. Cloudflare R2 — Public URL richtig konfigurieren

> [!CAUTION]
> Der häufigste Fehler: Die falsche R2-URL wird als `R2_PUBLIC_URL` eingetragen.

| URL-Typ                                              | Verwendung                                            |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `https://ACCOUNT_ID.r2.cloudflarestorage.com/BUCKET` | ❌ Private S3 API — Browser blockiert diese URL       |
| `https://pub-XXXX.r2.dev`                            | ⚠️ Öffentlich, aber nicht für Produktion empfohlen    |
| `https://cdn.deine-domain.com`                       | ✅ Custom Domain mit aktiviertem Access — **richtig** |

**In Cloudflare Dashboard prüfen:** R2 → Bucket → Settings → Benutzerdefinierte Domänen → Status **Aktiv** + Access **Aktiviert**.

Die URL wird im Backend beim Upload-Response so zusammengebaut:

```
${R2_PUBLIC_URL}/${folder}/${uuid}.ext
```

Kein trailing slash bei `R2_PUBLIC_URL` notwendig.

---

## 2. ALLOWED_ORIGINS — CORS sauber konfigurieren

```env
# ❌ Falsch (trailing slash, Duplikate):
ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com,https://other.example.com/,http://localhost:5173

# ✅ Richtig:
ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com,https://other.example.com
```

- **Kein trailing slash** am Ende der URLs
- **Keine Duplikate**
- **Alle Apps auflisten** die auf die API zugreifen (auch interne Tools, Chatbots etc.)

---

## 3. Docker — Zwei `.env`-Dateien für Frontend + Backend

Bei einem Mono-Repo mit Frontend (Vite) + Backend (Express) im selben Projekt:

```
/
├── .env                  ← Frontend Docker Build (VITE_* Variablen + APP_PORT)
├── docker-compose.yml    ← Frontend Container
└── labs-api/
    ├── .env              ← Backend Runtime Variablen (DB, R2, JWT, CORS)
    └── docker-compose.yml ← Backend Container
```

**Frontend `.env`** (wird beim `docker build` als ARG eingebacken):

```env
VITE_API_URL=https://api.deine-domain.com
VITE_GEMINI_API_KEY=...
APP_PORT=3006
```

**Backend `labs-api/.env`** (Runtime, nicht im Image gebacken):

```env
DATABASE_URL=postgresql://user:pass@hostname:port/dbname
R2_PUBLIC_URL=https://cdn.deine-domain.com
ALLOWED_ORIGINS=...
JWT_SECRET=...
```

> [!IMPORTANT]
> `.env.local` (Vite-Standard) ist **nur für lokale Entwicklung**. Docker liest eine `.env`-Datei im Projektroot.

---

## 4. Docker — Port-Konflikte beim Deployment

Bei mehreren Apps auf einem Server immer prüfen welche Ports bereits belegt sind:

```bash
ss -tlnp | grep -E '300[0-9]|400[0-9]'
```

Dann freien Port in `.env` eintragen:

```env
APP_PORT=3006   # nicht 3000!
```

---

## 5. Nginx Proxy Manager — Container-Name statt localhost

Wenn Nginx Proxy Manager (NPM) und die App-Container im **selben Docker-Netzwerk** (`proxy-netz`) sind:

| Einstellung      | Falsch                  | Richtig                               |
| ---------------- | ----------------------- | ------------------------------------- |
| Forward Hostname | `localhost`             | Container-Name (z.B. `labs-api`)      |
| Forward Port     | Host-Port (z.B. `4001`) | Interner Container-Port (z.B. `4000`) |

Beim Registrieren eines Containers im Netzwerk:

```bash
docker network connect proxy-netz CONTAINER_NAME
```

---

## 6. Docker → Host-Postgres — Firewall & pg_hba.conf

Wenn der Express-Backend-Container auf eine **native PostgreSQL-Installation** (nicht Docker) auf demselben VPS zugreift:

**Schritt 1: Docker-Subnet in `pg_hba.conf` erlauben**

```bash
echo "host    all    postgres    172.0.0.0/8    md5" >> /etc/postgresql/16/main/pg_hba.conf
pg_ctlcluster 16 main reload
```

**Schritt 2: UFW-Firewall-Regel für Docker-Netz**

```bash
ufw allow from 172.0.0.0/8 to any port 5433
```

**Schritt 3: `host.docker.internal` in docker-compose.yml**

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Schritt 4: DATABASE_URL mit `host.docker.internal`**

```env
DATABASE_URL=postgresql://postgres:pass@host.docker.internal:5433/labs_db
```

---

## 7. Express API — Response-Format konsistent halten

> [!WARNING]
> Der gefährlichste stille Bug: Backend-Endpoints geben unterschiedliche Response-Formate zurück.

**Problem-Beispiel:**

```typescript
// ❌ /auth/me gibt zurück: { user: { id, email, avatar_url, ... } }
res.json({ user: result.rows[0] });

// ❌ /auth/login gibt zurück: { token, user: { ... } }
// → apiClient macht: const { token, user: userData } = await auth.login() ✅
// → apiClient macht: const userData = await auth.me()  ← bekommt { user: {...} } ❌
```

**Regel:** Entweder immer mit `{ user: ... }` wrappen (und Client entsprechend anpassen), oder immer direkt zurückgeben:

```typescript
// ✅ Konsistent direkt:
res.json(result.rows[0]); // /auth/me
res.json(result.rows[0]); // /auth/profile
```

---

## 8. React — Settings/Profile State korrekt initialisieren

Wenn Settings-Komponente über CSS (`hidden/block`) gemountet bleibt, `useState` aber nur einmal initialisiert wird:

```tsx
// ❌ Problem: Avatar/Name werden bei Mount mit undefined initialisiert
const [name, setName] = useState(userProfile.name);
const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatarUrl);
```

**Fix 1:** `useEffect` mit `profile` als Dependency (schon implementiert — aber nur wenn das Backend die richtigen Daten liefert, siehe Punkt 7).

**Fix 2:** Settings liest direkt aus dem Auth-Context statt aus Props:

```tsx
const { profile } = useAuth();
const [name, setName] = useState(profile?.full_name || "");
const [selectedAvatar, setSelectedAvatar] = useState(
  profile?.avatar_url || PRESET_AVATARS[0],
);
```

---

## 9. VPS Deployment — Sauberes Git-Clone-Setup

Beim ersten Deployment oder bei Problemen: sauber neu aufsetzen.

```bash
# Alten Container stoppen
docker stop CONTAINER_NAME
docker rm CONTAINER_NAME

# In den App-Ordner klonen
cd /opt/docker
git clone https://github.com/USER/REPO.git
cd REPO

# .env Dateien erstellen (nie im Git committen!)
nano .env
nano labs-api/.env

# Bauen und starten
docker compose up -d --build
```

**Konvention:** Alle Apps liegen unter `/opt/docker/APP_NAME/`.

---

## 10. Diagnose-Checkliste bei 500 / CORS / Verbindungsfehlern

```bash
# 1. Container-Logs prüfen
docker logs CONTAINER --tail=30

# 2. Kann Container die DB erreichen?
docker exec CONTAINER sh -c "nc -zv host.docker.internal 5433"
# Hängt → Firewall blockiert
# Connection refused → Port falsch oder DB läuft nicht

# 3. Welches Netzwerk hat der Container?
docker inspect CONTAINER | grep -A5 '"Networks"'

# 4. Welche Ports sind am Host belegt?
ss -tlnp | grep -E '300[0-9]|400[0-9]|5432|5433'

# 5. Sind alle Origins in ALLOWED_ORIGINS?
docker logs labs-api 2>&1 | grep "CORS blocked"
```
