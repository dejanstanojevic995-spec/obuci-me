# OBUCI ME

Virtuelni try-on PWA za žene iz Srbije i regiona.  
Otpremi fotke i mere, nalepi link odeće (ili upload slike) i vidi kako ti stoji iz više uglova.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router
- PWA (`vite-plugin-pwa`) — instalacija na telefon

## Pokretanje

```bash
cd obuci-me
npm install
npm run dev
```

Otvori `http://localhost:5173`.

```bash
npm run build    # produkcijski build
npm run preview  # pregled builda
```

## Struktura

```
src/
  components/     # UI + layout (bottom nav, header)
  context/        # App state (auth, body, ormar, krediti)
  pages/          # Ekrani
  services/
    auth.ts           # Mock login (Firebase/Supabase kasnije)
    tryOnApi.ts       # PLACEHOLDER — Virtual Try-On API
    productUrl.ts     # PLACEHOLDER — ekstrakcija slike sa URL-a
    sizeRecommend.ts  # Preporuka EU veličine
    credits.ts        # Krediti + mock kupovina
  types/
```

## Ekrani

| Ruta | Opis |
|------|------|
| `/` | Landing |
| `/prijava`, `/registracija` | Mock auth (email + Google) |
| `/onboarding` | Body profil: uputstva, fotke, mere |
| `/app` | Početna |
| `/app/try-on` | Try-on flow + 360° rezultat |
| `/app/ormar` | Sačuvani lookovi |
| `/app/profil` | Nalog, mere, odjava |
| `/app/krediti` | Paketi i pretplata |

## MVP napomene

- **Auth** je mock (localStorage). Pravi provider se dodaje kasnije.
- **Try-On API** i **ekstrakcija URL-a** su placeholderi sa jasnim `TODO` komentarima.
- Podaci (profil, ormar, krediti) se čuvaju lokalno u pregledaču.
- UI je na **srpskom**, mobile-first.

## Dizajn

Meke blush / cream / ink palete, Plus Jakarta Sans + Cormorant Garamond, zaobljeni kartice, bottom navigation.
