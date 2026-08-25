# Obuci me — deploy na Railway (beta)

App je spremna: **jedan servis** služi UI (`dist/`) + API (`/api/*`).

## 1) Nalog
1. Otvori https://railway.app  
2. Sign up (GitHub je najlakše)

## 2) Novi projekat
1. **New Project** → **Deploy from GitHub repo**  
   **ili** **Empty Project** → **Add Service** → **GitHub Repo** / **Local**

### Opcija A — GitHub (preporučeno)
1. Push ovaj folder na GitHub (privatni repo)  
2. Railway → Connect repo `obuci-me`  
3. Root = repo root  
4. Build: `npm ci && npm run build`  
5. Start: `npm start`

### Opcija B — Railway CLI
```powershell
cd C:\Users\korisnik\obuci-me
npx railway login
npx railway init
npx railway up
```

## 3) Environment variables (Variables tab)
Obavezno (bez razmaka, bez navodnika ako nije potrebno):

```
XAI_API_KEY=...
XAI_IMAGE_MODEL=grok-imagine-image-2.0
FIRECRAWL_API_KEY=...
APIFY_API_TOKEN=...
NODE_ENV=production
```

`PORT` Railway postavlja sam — **ne moraš** da ga setuješ.

## 4) Domene
Settings → Networking → **Generate Domain**  
Dobiješ URL tipa `https://obuci-me-xxxx.up.railway.app`

## 5) Provera
- `https://TVOJ-URL/api/health` → `ok: true`, `hasKey`, `hasFirecrawl`  
- Otvori URL na telefonu → try-on  
- **Add to Home Screen** (PWA) za “instalaciju” bez store-a

## 6) Bitno za betu
- API key-evi **samo** u Railway Variables (nikad u git)  
- Stari key-evi iz chata → revoke + novi  
- Try-on može trajati 30–90s — ne zatvaraj tab  

## Lokalni produkcijski test
```powershell
cd C:\Users\korisnik\obuci-me
npm run build
npm start
```
Otvori http://localhost:3001
