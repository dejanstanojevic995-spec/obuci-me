/**
 * Firecrawl fallback za teške shopove (Zara, H&M…).
 * Koristi /v2/scrape sa formats: product (+ markdown/html backup).
 *
 * Env: FIRECRAWL_API_KEY
 */

function getFirecrawlKey() {
  return (
    process.env.FIRECRAWL_API_KEY ||
    process.env.FIRECRAWL_API_TOKEN ||
    process.env.FIRECRAWL_TOKEN ||
    ''
  ).trim()
}

export function hasFirecrawlKey() {
  return Boolean(getFirecrawlKey())
}

/**
 * @param {string} productUrl
 * @returns {Promise<{
 *   imageUrl: string
 *   productName?: string
 *   brand?: string
 *   price?: string
 *   extracted: boolean
 *   message?: string
 *   source?: string
 * } | null>}
 */
export async function extractProductViaFirecrawl(productUrl) {
  const key = getFirecrawlKey()
  if (!key) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY nije podešen')
    return null
  }

  console.log('[firecrawl] start', productUrl.slice(0, 120))

  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: productUrl,
      // product format = title/brand/images; html/markdown = backup parse
      formats: ['product', 'html', 'markdown'],
      onlyMainContent: true,
      proxy: 'auto',
      timeout: 90000,
      waitFor: 2000,
      location: { country: 'RS', languages: ['sr', 'en'] },
    }),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    console.warn('[firecrawl] non-json', text.slice(0, 300))
    return null
  }

  if (!res.ok || data?.success === false) {
    console.warn('[firecrawl] error', res.status, data?.error || data?.code || text.slice(0, 200))
    return null
  }

  const doc = data.data || data
  const parsed = pickFromFirecrawlDoc(doc, productUrl)
  if (!parsed?.imageUrl) {
    console.warn(
      '[firecrawl] nema image',
      Object.keys(doc || {}),
      doc?.product ? Object.keys(doc.product) : null,
    )
    return null
  }

  console.log('[firecrawl] OK', parsed.productName || '', parsed.imageUrl.slice(0, 100))
  return {
    ...parsed,
    extracted: true,
    source: 'firecrawl',
    message: `Slika preko Firecrawl. ${parsed.productName || ''}`.trim(),
  }
}

function pickFromFirecrawlDoc(doc, fallbackUrl) {
  // 1) structured product format
  const product = doc.product
  if (product) {
    const imageUrl =
      firstImageFromVariants(product.variants) ||
      firstUrl(product.image) ||
      firstUrl(product.images) ||
      firstUrl(doc.metadata?.ogImage)

    const productName = asText(product.title) || asText(doc.metadata?.title)
    const brand = asText(product.brand)
    let price
    const v0 = Array.isArray(product.variants) ? product.variants[0] : null
    if (v0?.price?.formatted) price = v0.price.formatted
    else if (v0?.price?.amount != null)
      price = `${v0.price.amount}${v0.price.currency ? ` ${v0.price.currency}` : ''}`

    if (imageUrl) {
      return {
        imageUrl,
        productName,
        brand,
        price,
        sourceImageUrl: imageUrl,
        url: asText(product.url) || fallbackUrl,
      }
    }
  }

  // 2) metadata og:image
  const metaImage =
    firstUrl(doc.metadata?.ogImage) ||
    firstUrl(doc.metadata?.['og:image']) ||
    firstUrl(doc.metadata?.image)
  const metaName = asText(doc.metadata?.title) || asText(doc.metadata?.ogTitle)

  if (metaImage) {
    return {
      imageUrl: metaImage,
      productName: metaName,
      sourceImageUrl: metaImage,
      url: fallbackUrl,
    }
  }

  // 3) parse html / markdown for image urls
  const html = doc.html || doc.rawHtml || ''
  const md = doc.markdown || ''
  const fromHtml = extractOgFromHtml(html)
  if (fromHtml?.imageUrl) {
    return {
      imageUrl: fromHtml.imageUrl,
      productName: fromHtml.productName || metaName,
      sourceImageUrl: fromHtml.imageUrl,
      url: fallbackUrl,
    }
  }

  const mdImg = md.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/)
  if (mdImg?.[1] && !/logo|icon|favicon/i.test(mdImg[1])) {
    return {
      imageUrl: mdImg[1],
      productName: metaName,
      sourceImageUrl: mdImg[1],
      url: fallbackUrl,
    }
  }

  return null
}

function firstImageFromVariants(variants) {
  if (!Array.isArray(variants)) return null
  for (const v of variants) {
    const imgs = v?.images
    if (!Array.isArray(imgs)) continue
    for (const img of imgs) {
      const u = firstUrl(img?.url || img)
      if (u && !/logo|icon|favicon/i.test(u)) return u
    }
  }
  return null
}

function extractOgFromHtml(html) {
  if (!html) return null
  const meta = (prop) => {
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRe(prop)}["'][^>]+content=["']([^"']+)["']`,
      'i',
    )
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRe(prop)}["']`,
      'i',
    )
    return decode(html.match(re1)?.[1] || html.match(re2)?.[1] || '')
  }
  const image =
    meta('og:image:secure_url') || meta('og:image') || meta('twitter:image') || ''
  const name = meta('og:title') || ''
  if (!image) return null
  return { imageUrl: image, productName: name || undefined }
}

function firstUrl(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return null
    if (/^https?:\/\//i.test(s)) return s
    if (s.startsWith('//')) return `https:${s}`
    return null
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      const u = firstUrl(x)
      if (u) return u
    }
  }
  if (typeof v === 'object') return firstUrl(v.url) || firstUrl(v.src)
  return null
}

function asText(v) {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return undefined
}

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
