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
import { buildTryOnPrompt, buildFaceRestorePrompt } from './tryOnPrompt.js'
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
    // Opciono: druga slika odeće (napred/nazad) — stane jer face ide u 2. poziv
    const clothingImage2 =
      typeof req.body?.clothingImage2 === 'string' && req.body.clothingImage2.length > 40
        ? req.body.clothingImage2
        : null

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
     * VARIJANTA C — 2 poziva:
     * 1) try-on: telo + odeća (+ opc. 2. odeća) — BEZ face (oslobađa slot)
     * 2) face restore: rezultat + face crop
     */
    const prompt = buildTryOnPrompt({
      pose,
      productName,
      personAngle,
      hasFaceLock: false,
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
    if (clothingImage2) {
      images.push({ type: 'image_url', url: clothingImage2 })
    }

    console.log(
      '[try-on] pipeline=C-two-step',
      'model=',
      XAI_IMAGE_MODEL,
      'pose=',
      pose || '-',
      'faceStep2=',
      hasFaceLock,
      'clothingRefs=',
      images.length - 1,
      'garment=',
      garment.labelSr,
    )

    const step1 = await callXaiEdit({
      prompt,
      images,
    })
    if (step1.error) {
      return res.status(step1.status || 502).json({
        error: step1.error,
        detail: step1.detail,
      })
    }

    let resultUrl = step1.imageUrl
    let step2Usage = null

    if (hasFaceLock) {
      console.log('[try-on] step2 face restore…')
      const step2 = await callXaiEdit({
        prompt: buildFaceRestorePrompt(),
        images: [
          { type: 'image_url', url: resultUrl },
          { type: 'image_url', url: faceImage },
        ],
      })
      if (step2.error) {
        // Ne propadaj skroz — vrati step1 + upozorenje
        console.warn('[try-on] step2 failed, returning step1:', step2.error)
        const persisted = await persistAsDataUrl(resultUrl)
        return res.json({
          imageUrl: persisted,
          model: XAI_IMAGE_MODEL,
          pipeline: 'two-step-face-failed',
          warning: 'Try-on OK, face restore nije uspeo — vraćen prvi rezultat.',
          usage: {
            step1: step1.usage,
            step2: null,
            step1Ticks: usageTicks(step1.usage),
            step2Ticks: 0,
            totalTicks: usageTicks(step1.usage),
            approxUsd: ticksToUsd(usageTicks(step1.usage)),
          },
        })
      }
      resultUrl = step2.imageUrl
      step2Usage = step2.usage
    }

    const persisted = await persistAsDataUrl(resultUrl)
    const t1 = usageTicks(step1.usage)
    const t2 = usageTicks(step2Usage)
    const totalTicks = t1 + t2

    console.log(
      '[try-on] DONE ticks step1=',
      t1,
      'step2=',
      t2,
      'total=',
      totalTicks,
      'approxUsd=',
      ticksToUsd(totalTicks),
    )

    res.json({
      imageUrl: persisted,
      model: XAI_IMAGE_MODEL,
      pipeline: hasFaceLock ? 'two-step' : 'one-step',
      usage: {
        step1: step1.usage,
        step2: step2Usage,
        step1Ticks: t1,
        step2Ticks: t2,
        totalTicks,
        approxUsd: ticksToUsd(totalTicks),
      },
    })
  } catch (err) {
    console.error('[try-on]', err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Interna greška servera',
    })
  }
})

/**
 * Jedan Imagine edit poziv.
 * @param {{ prompt: string, images: { type: string, url: string }[] }} opts
 */
async function callXaiEdit({ prompt, images }) {
  const payload = {
    model: XAI_IMAGE_MODEL,
    prompt,
    images,
    n: 1,
  }

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
    return { error: 'xAI nije vratio JSON.', detail: text.slice(0, 500), status: 502 }
  }

  if (!xaiRes.ok) {
    const msg =
      data?.error?.message || data?.message || data?.error || `xAI greška (${xaiRes.status})`
    console.error('[try-on] xAI error:', xaiRes.status, msg)
    return {
      error: typeof msg === 'string' ? msg : JSON.stringify(msg),
      detail: data,
      status: xaiRes.status >= 400 && xaiRes.status < 600 ? xaiRes.status : 502,
    }
  }

  const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json
  if (!imageUrl) {
    return { error: 'xAI nije vratio sliku u odgovoru.', detail: data, status: 502 }
  }

  let resultUrl =
    typeof imageUrl === 'string' && imageUrl.startsWith('http')
      ? imageUrl
      : typeof imageUrl === 'string' && imageUrl.startsWith('data:')
        ? imageUrl
        : `data:image/jpeg;base64,${imageUrl}`

  return { imageUrl: resultUrl, usage: data.usage ?? null }
}

async function persistAsDataUrl(resultUrl) {
  if (typeof resultUrl !== 'string') return resultUrl
  if (resultUrl.startsWith('data:')) return resultUrl
  if (!resultUrl.startsWith('http')) return resultUrl
  try {
    const imgRes = await fetch(resultUrl)
    if (!imgRes.ok) return resultUrl
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const mime = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0]
    if (buf.length > 0 && buf.length < 12_000_000) {
      console.log('[try-on] persisted image as data URL, bytes=', buf.length)
      return `data:${mime};base64,${buf.toString('base64')}`
    }
  } catch (err) {
    console.warn('[try-on] could not persist image', err?.message || err)
  }
  return resultUrl
}

/** xAI usage: 1 USD ≈ 10_000_000_000 ticks (cost_in_usd_ticks) */
function usageTicks(usage) {
  if (!usage) return 0
  const n = Number(usage.cost_in_usd_ticks ?? usage.costInUsdTicks ?? 0)
  return Number.isFinite(n) ? n : 0
}

function ticksToUsd(ticks) {
  if (!ticks) return 0
  return Math.round((ticks / 10_000_000_000) * 10000) / 10000
}

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

