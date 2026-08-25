# OBUCI ME — NASTAVAK

**Poslednje:** 2026-08-15 (veče) — zatvoreno za danas  
**Lokacija:** `C:\Users\korisnik\obuci-me`

## Start
```powershell
cd C:\Users\korisnik\obuci-me
npm run dev:all
```
App: http://127.0.0.1:5173/  
API: http://127.0.0.1:3001/

---

## Šta radi DANAS (OK)

| Stvar | Status |
|-------|--------|
| Try-on Grok Imagine **2.0** | ✅ |
| Face-lock | ✅ |
| Poze | ✅ |
| Tip garderobe (samo taj komad) | ✅ |
| Bez prstenja / tetovaža / kompleta sa manekena | ✅ |
| Bez teksta na slici | ✅ |
| Lokalni scrape (Sportvision, Uniqlo…) | ✅ |
| **Firecrawl** za Zara / H&M / ASOS | ✅ |
| Apify (rezerva, Zara i dalje teška) | ⚠️ |
| Krediti test 9999 | ✅ |
| Auth / plaćanje | ❌ mock |

### Env (ne commitovati)
- `XAI_API_KEY`
- `FIRECRAWL_API_KEY` (glavni hard-shop fallback)
- `APIFY_API_TOKEN` (opciono)
- `XAI_IMAGE_MODEL=grok-imagine-image-2.0`

---

## Redosled (dogovoreno 2026-08-24)

1. **Hosting online** — Railway (u toku)  
   - Kod spreman: `npm start` služi `dist/` + `/api`  
   - Uputstvo: `DEPLOY.md`  
   - Treba: `npx railway login` (korisnik) + env vars na Railway  
2. **Provera ormara** na online URL-u  
3. Dizajn, 5 varijanti, beta 30–40 (Android/iPhone)

### Ormar — napomena
- Stari lookovi sa isteklim xAI URL-om = prazan prostor (očekivano)  
- Novi try-on treba da čuva data URL (fix urađen)  
- Za pravu betu: **cloud storage** za slike ormara (ne samo localStorage)

### Ostale teme (posle hostinga)
- Dizajn app-a  
- 5 varijanti slika  
- Kako beta instalira na Android / iPhone (PWA / store)

## Bezbednost
Pre javnog beta: revoke starih key-eva iz chata; key-evi samo na serveru.
