/**
 * Ekstrakcija slike proizvoda sa e-commerce URL-a (scraper polish).
 *
 * - skuplja više kandidata (og, twitter, JSON-LD, gallery)
 * - bira NAJBOLJU (ne logo / mali thumb)
 * - pokušava upgrade thumbs (320→800 itd.)
 * - preuzima sliku → data URL
 * - detektuje tip garderobe
 */

import { detectGarment } from './garmentDetect.js'
import { extractProductViaApify, hasApifyToken } from './apifyExtract.js'
import { extractProductViaFirecrawl, hasFirecrawlKey } from './firecrawlExtract.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 18000
const MAX_HTML_BYTES = 2_500_000
const MAX_IMAGE_BYTES = 8_000_000

/**
 * @param {string} rawUrl
 */
export async function extractProduct(rawUrl) {
  let pageUrl
  try {
    pageUrl = new URL(String(rawUrl || '').trim())
  } catch {
    return fail('Neispravan link. Nalepi kompletan URL (https://...).')
  }

  if (!['http:', 'https:'].includes(pageUrl.protocol)) {
    return fail('Link mora počinjati sa https://')
  }

  const host = pageUrl.hostname.replace(/^www\./, '')

  // 1) Direktan link na sliku?
  if (looksLikeImageUrl(pageUrl.href)) {
    const dataUrl = await downloadBestImage(pageUrl.href, pageUrl.href)
    if (!dataUrl) return fail('Nismo uspeli da preuzmemo sliku sa tog linka.')
    const productName = fileNameFromUrl(pageUrl) || `Slika sa ${host}`
    return okResult({
      imageUrl: dataUrl.dataUrl,
      productName,
      brand: host.split('.')[0],
      sourceImageUrl: dataUrl.finalUrl,
      url: pageUrl.href,
      message: 'Slika preuzeta sa direktnog linka.',
    })
  }

  // 2) Fetch HTML
  let html
  let finalUrl = pageUrl.href
  try {
    const res = await fetchWithTimeout(pageUrl.href, {
      headers: {
        'User-Agent': UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'sr-RS,sr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      // Pokušaj jina kad shop vrati 403/410/…
      console.log('[extract] page status', res.status, '→ jina / apify fallback')
      const jina = await extractViaJina(pageUrl.href)
      if (jina?.imageUrl) {
        return finishFromRemote({
          imageUrl: jina.imageUrl,
          productName: jina.productName || `Proizvod sa ${host}`,
          brand: host.split('.')[0],
          pageUrl: pageUrl.href,
          referer: pageUrl.href,
          message: 'Slika izvučena preko fallback čitača (shop blokira direktno).',
        })
      }
      const apify = await tryApify(pageUrl.href, host)
      if (apify) return apify
      return fail(
        `Prodavnica je vratila grešku ${res.status}. ${
          hasApifyToken() ? 'Apify nije uspeo.' : 'Dodaj APIFY_API_TOKEN ili'
        } Probaj Upload / drugi link.`,
      )
    }

    finalUrl = res.url || pageUrl.href
    const contentType = (res.headers.get('content-type') || '').toLowerCase()

    if (contentType.startsWith('image/')) {
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length > MAX_IMAGE_BYTES) return fail('Slika je prevelika.')
      const mime = contentType.split(';')[0].trim() || 'image/jpeg'
      return okResult({
        imageUrl: `data:${mime};base64,${buf.toString('base64')}`,
        productName: `Slika sa ${host}`,
        brand: host.split('.')[0],
        sourceImageUrl: finalUrl,
        url: pageUrl.href,
        message: 'Slika preuzeta sa linka.',
      })
    }

    const ab = await res.arrayBuffer()
    html =
      ab.byteLength > MAX_HTML_BYTES
        ? Buffer.from(ab.slice(0, MAX_HTML_BYTES)).toString('utf8')
        : Buffer.from(ab).toString('utf8')
  } catch (err) {
    console.error('[extract] fetch page', err)
    const jina = await extractViaJina(pageUrl.href)
    if (jina?.imageUrl) {
      return finishFromRemote({
        imageUrl: jina.imageUrl,
        productName: jina.productName || `Proizvod sa ${host}`,
        brand: host.split('.')[0],
        pageUrl: pageUrl.href,
        referer: pageUrl.href,
        message: 'Slika izvučena preko fallback čitača.',
      })
    }
    const apify = await tryApify(pageUrl.href, host)
    if (apify) return apify
    return fail(
      'Ne možemo da otvorimo taj sajt (timeout, blokada ili mreža). Koristi Upload ili Apify token.',
    )
  }

  let meta = parseProductMeta(html, finalUrl)

  // 2b) Jina ako nema slike
  if (!meta.imageUrl) {
    console.log('[extract] no image candidates — trying jina')
    const jina = await extractViaJina(pageUrl.href)
    if (jina?.imageUrl) {
      meta = {
        ...meta,
        imageUrl: jina.imageUrl,
        productName: meta.productName || jina.productName,
      }
    }
  }

  if (!meta.imageUrl) {
    // 2c) Apify — teški shopovi (Zara, H&M…)
    const apify = await tryApify(pageUrl.href, host)
    if (apify) return apify

    return fail(
      hasFirecrawlKey() || hasApifyToken()
        ? 'Nismo našli sliku ni lokalno ni preko Firecrawl/Apify. Probaj drugi link ili Upload.'
        : 'Nismo našli sliku (shop blokira). Dodaj FIRECRAWL_API_KEY u .env ili koristi Upload.',
    )
  }

  const local = await finishFromRemote({
    imageUrl: meta.imageUrl,
    productName: meta.productName || `Proizvod sa ${host}`,
    brand: meta.brand || host.split('.')[0],
    price: meta.price,
    pageUrl: pageUrl.href,
    referer: finalUrl,
    message: meta.productName
      ? `Pronađeno: ${sanitizeProductName(meta.productName)}.`
      : 'Slika proizvoda izvučena.',
    altCandidates: meta.candidates || [],
  })

  // Ako lokalno “uspe” ali slika nije skinuta kako treba — Apify fallback
  if (local?.extracted && local.imageUrl) return local

  const apify = await tryApify(pageUrl.href, host)
  if (apify) return apify
  return local
}

/** Teški shopovi: Firecrawl prvo, pa Apify. */
async function tryApify(productUrl, host) {
  // 1) Firecrawl
  if (hasFirecrawlKey()) {
    try {
      const fc = await extractProductViaFirecrawl(productUrl)
      if (fc?.extracted && fc.imageUrl) {
        return finishFromRemote({
          imageUrl: fc.imageUrl,
          productName: fc.productName || `Proizvod sa ${host}`,
          brand: fc.brand || host.split('.')[0],
          price: fc.price,
          pageUrl: productUrl,
          referer: productUrl,
          message: fc.message || 'Slika preko Firecrawl.',
          altCandidates: [],
        })
      }
    } catch (err) {
      console.warn('[extract] firecrawl failed', err?.message || err)
    }
  }

  // 2) Apify (backup)
  if (!hasApifyToken()) return null
  try {
    const apify = await extractProductViaApify(productUrl)
    if (!apify?.extracted || !apify.imageUrl) return null

    return finishFromRemote({
      imageUrl: apify.imageUrl,
      productName: apify.productName || `Proizvod sa ${host}`,
      brand: apify.brand || host.split('.')[0],
      price: apify.price,
      pageUrl: productUrl,
      referer: productUrl,
      message: apify.message || 'Slika preko Apify.',
      altCandidates: [],
    })
  } catch (err) {
    console.warn('[extract] apify failed', err?.message || err)
    return null
  }
}

/**
 * Preuzmi najbolju verziju slike (sa upgrade thumbs + fallback kandidati).
 */
async function finishFromRemote({
  imageUrl,
  productName,
  brand,
  price,
  pageUrl,
  referer,
  message,
  altCandidates = [],
}) {
  const tried = new Set()
  const queue = [imageUrl, ...upgradeImageUrlVariants(imageUrl), ...altCandidates]
    .map((u) => (typeof u === 'string' ? u : u?.url || u?.src))
    .filter(Boolean)

  for (const raw of queue) {
    const abs = absolutize(raw, referer || pageUrl)
    if (!abs || tried.has(abs)) continue
    tried.add(abs)
    for (const variant of [abs, ...upgradeImageUrlVariants(abs)]) {
      if (tried.has(variant) && variant !== abs) continue
      tried.add(variant)
      const got = await downloadAsDataUrl(variant, referer || pageUrl)
      if (got) {
        return okResult({
          imageUrl: got,
          productName,
          brand,
          price,
          sourceImageUrl: variant,
          url: pageUrl,
          message,
        })
      }
    }
  }

  // Poslednji pokušaj: remote URL bez data URL
  return okResult({
    imageUrl,
    productName,
    brand,
    price,
    sourceImageUrl: imageUrl,
    url: pageUrl,
    message:
      (message || 'Slika pronađena.') +
      ' Preuzimanje na server nije uspelo — koristimo remote URL. Proveri preview.',
  })
}

async function downloadBestImage(imageUrl, referer) {
  for (const variant of [imageUrl, ...upgradeImageUrlVariants(imageUrl)]) {
    const dataUrl = await downloadAsDataUrl(variant, referer)
    if (dataUrl) return { dataUrl, finalUrl: variant }
  }
  return null
}

function okResult({ imageUrl, productName, brand, price, sourceImageUrl, url, message }) {
  const cleanName = sanitizeProductName(productName)
  const g = detectGarment({ productName: cleanName, url, brand })
  const tipMsg =
    g.confidence === 'high'
      ? `Tip: ${g.labelSr} — Grok menja samo taj komad.`
      : `Tip nije 100% siguran. Grok prati naziv + glavni komad na slici.`
  return {
    imageUrl,
    productName: cleanName,
    brand,
    price,
    sourceImageUrl,
    extracted: true,
    garmentType: g.type,
    garmentLabelSr: g.labelSr,
    changeOnly: g.changeOnly,
    keepFromCustomer: g.keepFromCustomer,
    garmentConfidence: g.confidence,
    message: `${message || 'OK'} ${tipMsg}`.replace(/\s+/g, ' ').trim(),
  }
}

function sanitizeProductName(name) {
  if (!name) return name
  let s = String(name)
  // "Something | ZARA Serbia" / "Search engine | ZARA Serbia"
  s = s.split(/\s[\|\u2013\u2014]\s/)[0]
  s = s.replace(
    /\s*(\||-|–|—)?\s*(sport\s*vision|about\s*you|reserved|zara(\s+serbia)?|h&m|amazon|ebay)\s*$/i,
    '',
  )
  s = cleanText(s)
  // Zara soft-block / search fallback page
  if (/^search\s*engine$/i.test(s) || s.length < 2) return undefined
  return s
}

/**
 * Sportvision i slični drže thumbs_320 — digni na 800/600.
 * @param {string} url
 * @returns {string[]}
 */
function upgradeImageUrlVariants(url) {
  if (!url || typeof url !== 'string') return []
  const out = []
  const add = (u) => {
    if (u && u !== url) out.push(u)
  }

  // sportvision / thumbs_N / _Npx
  add(url.replace(/thumbs_120/gi, 'thumbs_800'))
  add(url.replace(/thumbs_320/gi, 'thumbs_800'))
  add(url.replace(/thumbs_350/gi, 'thumbs_800'))
  add(url.replace(/thumbs_600/gi, 'thumbs_800'))
  add(url.replace(/_120px/gi, '_800px'))
  add(url.replace(/_320px/gi, '_800px'))
  add(url.replace(/_350px/gi, '_800px'))
  add(url.replace(/_600px/gi, '_800_800px'))
  add(url.replace(/\/thumbs_\d+\//gi, '/thumbs_800/'))

  // query size bumps
  add(url.replace(/([?&](?:w|width|h|height))=(\d{2,3})\b/gi, (_, k) => `${k}=1000`))
  add(url.replace(/\/\d{2,3}\/\d{2,3}\//g, '/1000/1000/'))

  // strip size suffixes like /320/ 
  add(url.replace(/\/(\d{3})px\./i, '/800px.'))

  return [...new Set(out)]
}

async function extractViaJina(pageUrl) {
  try {
    const jinaUrl = `https://r.jina.ai/${pageUrl}`
    const res = await fetchWithTimeout(jinaUrl, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': UA,
        'X-Return-Format': 'markdown',
      },
    })
    if (!res.ok) return null
    const text = await res.text()
    if (!text || text.length < 40) return null

    let productName
    const titleM = text.match(/^Title:\s*(.+)$/im)
    if (titleM) productName = cleanText(titleM[1])

    const candidates = []
    for (const m of text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi)) {
      candidates.push(m[1])
    }
    for (const m of text.matchAll(
      /https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>]*)?/gi,
    )) {
      candidates.push(m[0].replace(/[),.;]+$/, ''))
    }

    const best = pickBestImageUrl(candidates, pageUrl)
    if (!best) return null
    return { imageUrl: best, productName }
  } catch (err) {
    console.warn('[extract] jina fallback failed', err?.message || err)
    return null
  }
}

function fail(message) {
  return { imageUrl: '', extracted: false, message }
}

function looksLikeImageUrl(href) {
  try {
    const u = new URL(href)
    return /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(u.pathname)
  } catch {
    return false
  }
}

function fileNameFromUrl(u) {
  const base = u.pathname.split('/').filter(Boolean).pop() || ''
  return decodeURIComponent(base).replace(/\.[^.]+$/, '') || undefined
}

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * @param {string} html
 * @param {string} baseUrl
 */
function parseProductMeta(html, baseUrl) {
  const out = {
    imageUrl: /** @type {string|undefined} */ (undefined),
    productName: /** @type {string|undefined} */ (undefined),
    brand: /** @type {string|undefined} */ (undefined),
    price: /** @type {string|undefined} */ (undefined),
    candidates: /** @type {string[]} */ ([]),
  }

  const candidates = []

  const push = (u, source = '') => {
    if (!u) return
    const abs = absolutize(u, baseUrl)
    if (!abs || abs.startsWith('data:')) return
    if (isJunkImage(abs)) return
    candidates.push({ url: abs, source })
  }

  // Meta images
  push(metaContent(html, 'og:image:secure_url'), 'og')
  push(metaContent(html, 'og:image'), 'og')
  push(metaContent(html, 'twitter:image'), 'twitter')
  push(metaContent(html, 'twitter:image:src'), 'twitter')
  push(metaItemprop(html, 'image'), 'itemprop')

  // Titles — prefer h1 / JSON-LD over noisy og:title
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const h1Text = h1 ? cleanText(h1[1].replace(/<[^>]+>/g, ' ')) : ''
  const ogTitle =
    metaContent(html, 'og:title') ||
    metaContent(html, 'twitter:title') ||
    titleTag(html)

  // JSON-LD Product (+ all images in array)
  const ldBlocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
  for (const m of ldBlocks) {
    try {
      const raw = m[1].trim()
      if (!raw) continue
      const json = JSON.parse(raw)
      const product = findProductNode(json)
      if (!product) continue

      if (product.name) out.productName = cleanText(String(product.name))
      if (!out.brand) {
        const b = product.brand
        if (typeof b === 'string') out.brand = cleanText(b)
        else if (b && typeof b === 'object' && b.name) out.brand = cleanText(String(b.name))
      }
      if (!out.price) {
        const offers = product.offers
        const offer = Array.isArray(offers) ? offers[0] : offers
        if (offer && offer.price != null) {
          const cur = offer.priceCurrency || ''
          out.price = `${offer.price}${cur ? ` ${cur}` : ''}`.trim()
        }
      }
      for (const img of allImages(product.image)) {
        push(img, 'jsonld')
      }
    } catch {
      // ignore
    }
  }

  // link rel=image_src
  const linkImg =
    html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i)
  if (linkImg?.[1]) push(linkImg[1], 'link')

  // Gallery / product imgs in HTML
  const imgAttrs = [
    ...html.matchAll(
      /<img[^>]+(?:data-zoom-image|data-large|data-srcset|data-src|data-original|data-lazy|srcset|src)=["']([^"']+)["'][^>]*>/gi,
    ),
  ]
  for (const m of imgAttrs) {
    const raw = m[1]
    // srcset: "url 320w, url2 800w"
    if (raw.includes(',')) {
      const parts = raw.split(',').map((p) => p.trim().split(/\s+/)[0])
      for (const p of parts) push(p, 'gallery')
    } else {
      push(raw, 'gallery')
    }
  }

  // Score & pick
  const uniqueUrls = [...new Set(candidates.map((c) => c.url))]
  const best = pickBestImageUrl(uniqueUrls, baseUrl)
  out.imageUrl = best
  out.candidates = uniqueUrls.filter((u) => u !== best).slice(0, 8)

  // Name priority: JSON-LD name > h1 > cleaned og title
  if (!out.productName && h1Text && h1Text.length > 2) out.productName = h1Text
  if (!out.productName && ogTitle) out.productName = cleanText(ogTitle)

  return out
}

/**
 * @param {string[]} urls
 * @param {string} pageUrl
 */
function pickBestImageUrl(urls, pageUrl) {
  if (!urls?.length) return null
  const host = (() => {
    try {
      return new URL(pageUrl).hostname
    } catch {
      return ''
    }
  })()

  const scored = urls
    .filter((u) => u && !isJunkImage(u))
    .map((src) => ({ src, score: scoreImageCandidate(src, host) }))
    .sort((a, b) => b.score - a.score)

  return scored[0]?.src || null
}

function scoreImageCandidate(src, pageHost) {
  let s = 0
  const u = src.toLowerCase()

  // Product-ish paths
  if (/slike_proizvoda|product|products|goods|catalog|media\/\d+|cdn|images?\//i.test(u)) s += 5
  if (/sportvision|static\.zara|uniqlo|reserved|aboutyou|asos|mango/i.test(u)) s += 2

  // Prefer larger declared sizes
  if (/thumbs_800|_800px|800_800|\/1000\/|w=1000|width=1000/i.test(u)) s += 8
  if (/thumbs_600|_600px/i.test(u)) s += 5
  if (/thumbs_350|_350px/i.test(u)) s += 2
  if (/thumbs_320|_320px|thumbs_120|_120px/i.test(u)) s -= 4

  // Prefer same-site assets
  if (pageHost && u.includes(pageHost.replace(/^www\./, ''))) s += 2

  // Format
  if (/\.jpe?g(\?|$)/i.test(u)) s += 2
  if (/\.webp(\?|$)/i.test(u)) s += 1

  // Longer paths often = real assets
  if (src.length > 80) s += 1
  if (src.length > 120) s += 1

  // Penalize tiny / UI
  if (/logo|icon|sprite|favicon|badge|flag|payment|visa|mastercard|facebook|instagram/i.test(u))
    s -= 20
  if (/placeholder|1x1|pixel|spacer|blank/i.test(u)) s -= 20

  return s
}

function isJunkImage(src) {
  return /logo|icon|sprite|favicon|badge|flag|payment|visa|mastercard|facebook|instagram|placeholder|1x1|pixel|svg(\?|$)/i.test(
    src,
  )
}

function metaContent(html, prop) {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRe(prop)}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRe(prop)}["']`,
    'i',
  )
  return decodeHtml(html.match(re1)?.[1] || html.match(re2)?.[1] || '')
}

function metaItemprop(html, prop) {
  const re1 = new RegExp(
    `<meta[^>]+itemprop=["']${escapeRe(prop)}["'][^>]+content=["']([^"']+)["']`,
    'i',
  )
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']${escapeRe(prop)}["']`,
    'i',
  )
  return decodeHtml(html.match(re1)?.[1] || html.match(re2)?.[1] || '')
}

function titleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? decodeHtml(m[1]) : ''
}

function findProductNode(node) {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProductNode(item)
      if (found) return found
    }
    return null
  }
  const t = node['@type']
  const types = Array.isArray(t) ? t : t ? [t] : []
  if (types.some((x) => String(x).toLowerCase() === 'product')) return node
  if (node['@graph']) return findProductNode(node['@graph'])
  return null
}

function allImages(image) {
  if (!image) return []
  if (typeof image === 'string') return [image]
  if (Array.isArray(image)) return image.flatMap((i) => allImages(i))
  if (typeof image === 'object') {
    if (typeof image.url === 'string') return [image.url]
    if (typeof image.contentUrl === 'string') return [image.contentUrl]
  }
  return []
}

function absolutize(maybeUrl, baseUrl) {
  const cleaned = decodeHtml(String(maybeUrl || '').trim())
  if (!cleaned) return ''
  if (cleaned.startsWith('//')) return `https:${cleaned}`
  try {
    return new URL(cleaned, baseUrl).href
  } catch {
    return cleaned
  }
}

async function downloadAsDataUrl(imageUrl, referer) {
  try {
    const res = await fetchWithTimeout(imageUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: referer || imageUrl,
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.warn('[extract] image download', res.status, imageUrl.slice(0, 120))
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null
    // Presitne slike (logo) — odbaci
    if (buf.length < 4000) return null

    let mime = (res.headers.get('content-type') || '').split(';')[0].trim()
    if (!mime.startsWith('image/')) {
      if (/\.png(\?|$)/i.test(imageUrl)) mime = 'image/png'
      else if (/\.webp(\?|$)/i.test(imageUrl)) mime = 'image/webp'
      else if (/\.gif(\?|$)/i.test(imageUrl)) mime = 'image/gif'
      else mime = 'image/jpeg'
    }

    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (err) {
    console.warn('[extract] image download failed', err?.message || err)
    return null
  }
}

function cleanText(s) {
  return decodeHtml(s)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function decodeHtml(s) {
  if (!s) return ''
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
