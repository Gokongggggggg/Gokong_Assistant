# standup-bot v3

Discord bot + web dashboard. Free-text standup via Discord, liat dan edit via web.

Stack: Node.js + discord.js v14 + Express + React/Vite + PostgreSQL (Neon) + Railway

---

## Commands Discord

```
/standup log:<text>          → log harian, free-text dengan headers
/log [limit]                 → liat history
/review list|add|done|stats  → manage review items
/export                      → CSV ke DM
/delete <id>                 → hapus standup
```

Format standup:
```
DONE
- selesain ROP chain

TODO
lanjut bab 3

NOTE
link: xyz.com

BLOCKER
belum punya dataset

REVISIT
heap challenge
```

---

## Setup

### 1. Discord Bot
1. [discord.com/developers/applications](https://discord.com/developers/applications) → New Application
2. Bot → Reset Token → `DISCORD_TOKEN`
3. Copy Application ID → `CLIENT_ID`
4. OAuth2 → URL Generator: scopes `bot` + `applications.commands`, permissions `Send Messages` + `Read Messages`
5. Invite ke server

### 2. Environment Variables
```
DISCORD_TOKEN=
CLIENT_ID=
DATABASE_URL=          # Neon connection string
DASHBOARD_PASSWORD=    # password buat login web dashboard
DISCORD_USER_ID=       # Discord user ID lo (klik kanan profile → Copy User ID)
PORT=3000
```

Cara dapet `DISCORD_USER_ID`: Settings Discord → Advanced → Developer Mode ON → klik kanan nama lo → Copy User ID

### 3. Local Dev

**Terminal 1 — backend + bot:**
```bash
npm install
npm run register    # sekali aja
npm run dev:server
```

**Terminal 2 — dashboard:**
```bash
cd dashboard
npm install
npm run dev         # runs on :5173, proxy ke :3000
```

### 4. Deploy Railway

```bash
# Build command:
npm run build

# Start command:
npm start
```

Environment variables: tambahkan semua dari `.env.example` di Railway dashboard.

Bot dan web server jalan dalam satu Railway service.

---

## File Structure

```
├── src/                  ← Discord bot
│   ├── index.js
│   ├── db.js
│   ├── helpers.js
│   ├── parser.js
│   └── register.js
├── server/               ← Express API
│   ├── index.js
│   └── routes/
│       ├── standup.js    ← CRUD + Excel export
│       └── review.js
└── dashboard/            ← React + Vite
    └── src/
        ├── App.jsx       ← routing + auth
        ├── lib/api.js    ← API client
        └── pages/
            ├── Dashboard.jsx
            ├── StandupPage.jsx
            └── ReviewPage.jsx
```
