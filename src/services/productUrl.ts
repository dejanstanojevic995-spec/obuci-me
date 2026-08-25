/**
 * Ekstrakcija slike proizvoda sa URL-a
 *
 * Pravi rad: backend POST /api/extract-product
 * (og:image, twitter:image, JSON-LD Product, preuzimanje slike → data URL)
 */

export interface ProductExtractResult {
  imageUrl: string
  productName?: string
  brand?: string
  price?: string
  /** original remote image URL (ako postoji) */
  sourceImageUrl?: string
  /** tip: hoodie, tshirt, pants… */
  garmentType?: string
  garmentLabelSr?: string
  changeOnly?: string
  keepFromCustomer?: string[]
  /** true ako je uspešno izvučeno sa URL-a */
  extracted: boolean
  /** Poruka za korisnika */
  message?: string
}

/**
 * Izvlači sliku i metapodatke proizvoda sa URL-a preko lokalnog API-ja.
 */
export async function extractProductFromUrl(url: string): Promise<ProductExtractResult> {
  // Brza klijentska validacija
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

  try {
    const res = await fetch('/api/extract-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: parsed.href }),
    })

    let data: ProductExtractResult
    try {
      data = await res.json()
    } catch {
      return {
        imageUrl: '',
        extracted: false,
        message:
          'API nije dostupan. Pokreni backend (npm run server) pa probaj ponovo. Ili koristi Upload slike.',
      }
    }

    if (!data.extracted || !data.imageUrl) {
      return {
        imageUrl: '',
        extracted: false,
        message:
          data.message ||
          'Nismo uspeli da izvučemo sliku sa linka. Sačuvaj sliku majice i koristi Upload.',
      }
    }

    return {
      imageUrl: data.imageUrl,
      productName: data.productName,
      brand: data.brand,
      price: data.price,
      sourceImageUrl: data.sourceImageUrl,
      garmentType: data.garmentType,
      garmentLabelSr: data.garmentLabelSr,
      changeOnly: data.changeOnly,
      keepFromCustomer: data.keepFromCustomer,
      extracted: true,
      message: data.message || 'Slika proizvoda uspešno izvučena.',
    }
  } catch {
    return {
      imageUrl: '',
      extracted: false,
      message:
        'Greška pri povezivanju sa serverom. Proveri da li radi npm run server, ili koristi Upload slike.',
    }
  }
}
