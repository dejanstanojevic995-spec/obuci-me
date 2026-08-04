/**
 * Ekstrakcija slike proizvoda sa URL-a
 *
 * PLACEHOLDER — ovde se kasnije povezuje servis koji:
 * 1. Prima URL proizvoda (Zara, Reserved, About You, lokalne prodavnice...)
 * 2. Scrapuje / poziva API za main product image
 * 3. Vraća clean clothing image URL + opcione metapodatke
 *
 * Mogući pristupi:
 * - Backend proxy + cheerio / puppeteer
 * - Open Graph meta (og:image)
 * - Partner API-ji prodavnica
 * - Specijalizovani product scraping servisi
 */

export interface ProductExtractResult {
  imageUrl: string
  productName?: string
  brand?: string
  price?: string
  /** true ako je uspešno izvučeno sa URL-a */
  extracted: boolean
  /** Poruka za korisnika ako nešto nije uspelo */
  message?: string
}

/**
 * Izvlači sliku i metapodatke proizvoda sa URL-a.
 *
 * TODO: Implementirati pravu ekstrakciju (backend endpoint preporučen
 * zbog CORS-a i bot zaštite prodavnica).
 */
export async function extractProductFromUrl(url: string): Promise<ProductExtractResult> {
  // Validacija URL-a
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return {
      imageUrl: '',
      extracted: false,
      message: 'Neispravan link. Proveri da li si nalepila kompletan URL.',
    }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      imageUrl: '',
      extracted: false,
      message: 'Link mora počinjati sa https://',
    }
  }

  // Simulacija mrežnog poziva
  await delay(1200)

  // --- MOCK IMPLEMENTACIJA ---
  // U produkciji: const res = await fetch(`/api/extract-product?url=${encodeURIComponent(url)}`)
  //
  // Trenutno: prikazujemo placeholder sliku i "izvučeno" ime iz hosta
  const host = parsed.hostname.replace('www.', '')
  const placeholderImage =
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop'

  return {
    imageUrl: placeholderImage,
    productName: `Proizvod sa ${host}`,
    brand: host.split('.')[0],
    extracted: true,
    message:
      'Demo režim: prava ekstrakcija slike sa URL-a biće povezana kasnije. Koristimo placeholder sliku.',
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
