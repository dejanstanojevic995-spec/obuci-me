/**
 * OBUCI ME — lokalni backend proxy za xAI Grok Imagine try-on
 *
 * API key ostaje na serveru (ne u browseru).
 * Jedan try-on = jedna image edit generacija (štednja).
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { extractProduct } from './productExtract.js'
import { buildTryOnPrompt } from './tryOnPrompt.js'
import { detectGarment } from './garmentDetect.js'
import { hasApifyToken } from './apifyExtract.js'
import { hasFirecrawlKey } from './firecrawlExtract.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Učitaj .env iz root-a projekta (jedan nivo iznad server/)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const app = express()
const PORT = Number(process.env.PORT) || 3001
const XAI_API_KEY = process.env.XAI_API_KEY
/** Jeftiniji model po defaultu — override preko .env */
const XAI_IMAGE_MODEL = process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-2.0'
const XAI_EDITS_URL = 'https://api.x.ai/v1/images/edits'

app.use(cors({ origin: true }))
// Body photos / product data URL mogu biti veliki
app.use(express.json({ limit: '25mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(XAI_API_KEY),
    hasApify: hasApifyToken(),
    hasFirecrawl: hasFirecrawlKey(),
    model: XAI_IMAGE_MODEL,
  })
})

/**
 * POST /api/extract-product
 * body: { url: string }
 * Vraća pravu sliku proizvoda (data URL) sa shop stranice — NE placeholder.
 */
app.post('/api/extract-product', async (req, res) => {
  try {
    const url = req.body?.url
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        imageUrl: '',
        extracted: false,
        message: 'Pošalji URL u polju url.',
      })
    }

    console.log('[extract] ', url.slice(0, 160))
    const result = await extractProduct(url)
    const status = result.extracted ? 200 : 422
    res.status(status).json(result)
  } catch (err) {
    console.error('[extract]', err)
    res.status(500).json({
      imageUrl: '',
      extracted: false,
      message: err instanceof Error ? err.message : 'Greška pri ekstrakciji',
    })
  }
})


/**
 * POST /api/try-on
 * body: {
 *   personImage: string (data URL ili https URL),
 *   clothingImage: string (data URL ili https URL),
 *   pose?: string,
 *   productName?: string
 * }
 */
app.post('/api/try-on', async (req, res) => {
  try {
    if (!XAI_API_KEY) {
      return res.status(500).json({
        error: 'XAI_API_KEY nije podešen. Dodaj ga u .env u root-u projekta.',
      })
    }

    const {
      personImage,
      clothingImage,
      faceImage,
      pose,
      productName,
      personAngle,
      productUrl,
      garmentType,
      garmentLabelSr,
      changeOnly,
      keepFromCustomer,
    } = req.body || {}

    if (!personImage || typeof personImage !== 'string') {
      return res.status(400).json({ error: 'Nedostaje personImage (body fotka).' })
    }
    if (!clothingImage || typeof clothingImage !== 'string') {
      return res.status(400).json({ error: 'Nedostaje clothingImage (slika odeće).' })
    }

    const hasFaceLock = typeof faceImage === 'string' && faceImage.length > 40

    // Tip iz extract-a, ili detekcija iz imena/URL-a (bez nagađanja duksa!)
    const detected = detectGarment({ productName, url: productUrl })
    const garment = {
      type: garmentType || detected.type,
      labelSr: garmentLabelSr || detected.labelSr,
      changeOnly: changeOnly || detected.changeOnly,
      keepFromCustomer: keepFromCustomer || detected.keepFromCustomer,
      confidence: detected.confidence,
    }

    /**
     * Image 1 = telo, Image 2 = odeća, Image 3 = lice (face lock)
     */
    const prompt = buildTryOnPrompt({
      pose,
      productName,
      personAngle,
      hasFaceLock,
      garmentType: garment.type,
      garmentLabelSr: garment.labelSr,
      changeOnly: garment.changeOnly,
      keepFromCustomer: garment.keepFromCustomer,
      garmentConfidence: garment.confidence,
    })

    /** @type {{ type: string, url: string }[]} */
    const images = [
      { type: 'image_url', url: personImage },
      { type: 'image_url', url: clothingImage },
    ]
    // Max 3 ref slike na xAI Imagine
    if (hasFaceLock) {
      images.push({ type: 'image_url', url: faceImage })
    }

    const payload = {
      model: XAI_IMAGE_MODEL,
      prompt,
      images,
      n: 1,
    }

    console.log(
      '[try-on] model=',
      XAI_IMAGE_MODEL,
      'pose=',
      pose || '-',
      'personAngle=',
      personAngle || '-',
      'faceLock=',
      hasFaceLock,
      'garment=',
      garment.labelSr,
      'product=',
      productName || '-',
    )

    const xaiRes = await fetch(XAI_EDITS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await xaiRes.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return res.status(502).json({
        error: 'xAI nije vratio JSON.',
        detail: text.slice(0, 500),
      })
    }

    if (!xaiRes.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        `xAI greška (${xaiRes.status})`
      console.error('[try-on] xAI error:', xaiRes.status, msg)
      return res.status(xaiRes.status >= 400 && xaiRes.status < 600 ? xaiRes.status : 502).json({
        error: typeof msg === 'string' ? msg : JSON.stringify(msg),
        detail: data,
      })
    }

    const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json
    if (!imageUrl) {
      console.error('[try-on] unexpected response', data)
      return res.status(502).json({
        error: 'xAI nije vratio sliku u odgovoru.',
        detail: data,
      })
    }

    // Ako je base64 bez data URI prefiksa
    let resultUrl =
      typeof imageUrl === 'string' && imageUrl.startsWith('http')
        ? imageUrl
        : typeof imageUrl === 'string' && imageUrl.startsWith('data:')
          ? imageUrl
          : `data:image/jpeg;base64,${imageUrl}`

    // Sačuvaj kao data URL — xAI linkovi ističu, ormar bi ostao prazan
    if (typeof resultUrl === 'string' && resultUrl.startsWith('http')) {
      try {
        const imgRes = await fetch(resultUrl)
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer())
          const mime = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0]
          if (buf.length > 0 && buf.length < 12_000_000) {
            resultUrl = `data:${mime};base64,${buf.toString('base64')}`
            console.log('[try-on] persisted image as data URL, bytes=', buf.length)
          }
        }
      } catch (err) {
        console.warn('[try-on] could not persist image', err?.message || err)
      }
    }

    res.json({
      imageUrl: resultUrl,
      model: XAI_IMAGE_MODEL,
      usage: data.usage ?? null,
    })
  } catch (err) {
    console.error('[try-on]', err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Interna greška servera',
    })
  }
})

// Produkcija: isti server služi i React build (dist/)
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath, { index: false, maxAge: '1h' }))
app.get(/^(?!\/api).*/, (req, res, next) => {
  // SPA fallback — ne diraj API rute
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  OBUCI ME      →  http://0.0.0.0:${PORT}`)
  console.log(`  Health        →  /api/health`)
  console.log(`  Model         →  ${XAI_IMAGE_MODEL}`)
  console.log(`  XAI key       →  ${XAI_API_KEY ? 'OK' : 'MISSING'}`)
  console.log(`  Firecrawl     →  ${hasFirecrawlKey() ? 'OK' : 'no'}`)
  console.log(`  Apify         →  ${hasApifyToken() ? 'OK' : 'no'}`)
  console.log(`  Static dist   →  ${distPath}\n`)
})

