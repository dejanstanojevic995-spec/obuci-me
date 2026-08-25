/**
 * Apify fallback za teške shopove (Zara, H&M…).
 *
 * Redosled:
 * 1) Apify Proxy → fetch HTML → og:image / JSON-LD (brzo, jeftino)
 * 2) Playwright scraper + poll do SUCCEEDED (sporije, jače)
 *
 * Env: APIFY_API_TOKEN
 */

import { ProxyAgent, fetch as undiciFetch } from 'undici'

function getApifyToken() {
  return (process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN || '').trim()
}

function getWaitSecs() {
  return Number(process.env.APIFY_WAIT_SECS || 180)
}

/**
 * @param {string} productUrl
 */
export async function extractProductViaApify(productUrl) {
  const token = getApifyToken()
  if (!token) {
    console.warn('[apify] APIFY_API_TOKEN nije podešen')
    return null
  }

  console.log('[apify] start', productUrl.slice(0, 120))

  // 1) Proxy HTML fetch
  try {
    const viaProxy = await fetchMetaViaApifyProxy(productUrl, token)
    if (viaProxy?.imageUrl) {
      console.log('[apify] proxy OK', viaProxy.productName || '', viaProxy.imageUrl.slice(0, 100))
      return {
        ...viaProxy,
        extracted: true,
        source: 'apify-proxy',
        message: `Slika preko Apify proxy. ${viaProxy.productName || ''}`.trim(),
      }
    }
    console.warn('[apify] proxy bez slike → playwright')
  } catch (err) {
    console.warn('[apify] proxy error', err?.message || err)
  }

  // 2) Playwright browser
  try {
    const pw = await runPlaywrightMeta(productUrl, token)
    if (pw?.imageUrl) {
      console.log('[apify] playwright OK', pw.productName || '', pw.imageUrl.slice(0, 100))
      return {
        ...pw,
        extracted: true,
        source: 'apify-playwright',
        message: `Slika preko Apify browser. ${pw.productName || ''}`.trim(),
      }
    }
    console.warn('[apify] playwright bez slike')
  } catch (err) {
    console.warn('[apify] playwright error', err?.message || err)
  }

  return null
}

export function hasApifyToken() {
  return Boolean(getApifyToken())
}

/**
 * Fetch stranice kroz Apify proxy, pa izvuci meta sliku.
 */
async function fetchMetaViaApifyProxy(productUrl, token) {
  // auto = default proxy group; RESIDENTIAL ako korisnik ima
  const groups = (process.env.APIFY_PROXY_GROUPS || 'AUTO,RESIDENTIAL,SHADER').split(',')
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

  for (const group of groups.map((g) => g.trim()).filter(Boolean)) {
    const user = group.toUpperCase() === 'AUTO' ? 'auto' : `groups-${group}`
    // token mora biti URL-encoded (inače proxy auth padne)
    const proxyUrl = `http://${user}:${encodeURIComponent(token)}@proxy.apify.com:8000`
    console.log('[apify] proxy try', group)
    try {
      const agent = new ProxyAgent(proxyUrl)
      const res = await undiciFetch(productUrl, {
        dispatcher: agent,
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,sr;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      })
      if (!res.ok) {
        console.warn('[apify] proxy status', group, res.status)
        continue
      }
      const html = await res.text()
      if (!html || html.length < 500) continue
      const meta = parseMetaFromHtml(html, productUrl)
      if (meta?.imageUrl) return meta
      console.warn('[apify] proxy HTML bez og:image', group, 'len=', html.length)
    } catch (err) {
      console.warn('[apify] proxy fail', group, err?.message || err)
    }
  }
  return null
}

function parseMetaFromHtml(html, baseUrl) {
  const metaContent = (prop) => {
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

  let image =
    metaContent('og:image:secure_url') ||
    metaContent('og:image') ||
    metaContent('twitter:image') ||
    metaContent('twitter:image:src')

  let name =
    metaContent('og:title') ||
    metaContent('twitter:title') ||
    decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ') || '') ||
    decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')

  // JSON-LD
  if (!image) {
    for (const m of html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        const j = JSON.parse(m[1])
        const nodes = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j]
        for (const n of nodes) {
          const t = n?.['@type']
          const types = Array.isArray(t) ? t : t ? [t] : []
          if (!types.map(String).some((x) => x.toLowerCase() === 'product')) continue
          if (n.name && !name) name = String(n.name)
          const img = n.image
          if (typeof img === 'string') image = img
          else if (Array.isArray(img) && img[0])
            image = typeof img[0] === 'string' ? img[0] : img[0].url
          else if (img?.url) image = img.url
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (!image) return null
  const imageUrl = absolutize(image, baseUrl)
  if (!imageUrl) return null

  // clean name "x | Zara" 
  if (name) name = name.split(/\s[\|\u2013\u2014]\s/)[0].trim().slice(0, 160)

  return {
    imageUrl,
    productName: name || undefined,
    sourceImageUrl: imageUrl,
    url: baseUrl,
  }
}

async function runPlaywrightMeta(productUrl, token) {
  const pageFunction = `async function pageFunction(context) {
  const { page, request, log } = context;
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch {}
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    const abs = (u) => { try { return u ? new URL(u, location.href).href : null; } catch { return null; } };
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
    let image = meta('meta[property="og:image:secure_url"]') || meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
    let name = meta('meta[property="og:title"]') || document.querySelector('h1')?.textContent?.trim() || document.title || '';
    if (!image) {
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const j = JSON.parse(s.textContent || '');
          const nodes = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j];
          for (const n of nodes) {
            const types = [].concat(n && n['@type'] ? n['@type'] : []);
            if (!types.map(String).some((x) => x.toLowerCase() === 'product')) continue;
            if (n.name) name = n.name;
            const img = n.image;
            if (typeof img === 'string') image = img;
            else if (Array.isArray(img) && img[0]) image = typeof img[0] === 'string' ? img[0] : img[0].url;
            else if (img && img.url) image = img.url;
          }
        } catch {}
      }
    }
    if (!image) {
      const imgs = [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src).filter(u => u && !/logo|icon|sprite|favicon|svg/i.test(u));
      image = imgs.sort((a,b) => b.length - a.length)[0] || '';
    }
    return { image: abs(image), name: (name || '').trim().slice(0, 160), url: location.href };
  });
  log.info('extracted', data);
  return data;
}`

  const run = await startActorAndPoll(
    'apify/playwright-scraper',
    {
      startUrls: [{ url: productUrl }],
      pageFunction,
      // RESIDENTIAL bolje prolazi Zaru/H&M (troši Apify proxy kredite)
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
      maxRequestsPerCrawl: 1,
      maxConcurrency: 1,
      navigationTimeoutSecs: 90,
      requestHandlerTimeoutSecs: 120,
      maxRequestRetries: 2,
      launcher: 'chromium',
      headless: true,
    },
    token,
  )

  if (!run?.defaultDatasetId) return null
  const items = await listDatasetItems(run.defaultDatasetId, token)
  const item = items?.[0]
  if (!item) return null
  const imageUrl = firstUrl(item.image)
  if (!imageUrl) return null
  return {
    imageUrl,
    productName: asText(item.name),
    sourceImageUrl: imageUrl,
    url: asText(item.url) || productUrl,
  }
}

async function startActorAndPoll(actorId, input, token) {
  const actorPath = actorId.replace('/', '~')
  const startUrl = `https://api.apify.com/v2/acts/${actorPath}/runs?token=${encodeURIComponent(token)}`

  const res = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = await res.json()
  if (!res.ok) {
    console.warn('[apify] start error', actorId, res.status, body?.error || body)
    return null
  }

  let run = body.data || body
  console.log('[apify] started', actorId, run.id, run.status)

  const deadline = Date.now() + getWaitSecs() * 1000
  while (Date.now() < deadline) {
    if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) break
    await sleep(4000)
    const poll = await fetch(
      `https://api.apify.com/v2/actor-runs/${run.id}?token=${encodeURIComponent(token)}`,
    )
    const pj = await poll.json()
    run = pj.data || pj
    console.log('[apify] poll', run.status)
  }

  if (run.status !== 'SUCCEEDED') {
    console.warn('[apify] run not succeeded', run.status, run.statusMessage || '')
    return null
  }
  return run
}

async function listDatasetItems(datasetId, token) {
  const url =
    `https://api.apify.com/v2/datasets/${datasetId}/items` +
    `?token=${encodeURIComponent(token)}&format=json&clean=true&limit=10`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data?.data || []
}

function firstUrl(v) {
  if (v == null) return null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || s === 'null') return null
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
  if (typeof v === 'object') return firstUrl(v.url) || firstUrl(v.src) || firstUrl(v.contentUrl)
  return null
}

function asText(v) {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return undefined
}

function absolutize(u, base) {
  try {
    return new URL(u, base).href
  } catch {
    return u
  }
}

function decode(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
