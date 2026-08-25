/**
 * Prepoznaje TIP odevnog komada iz naziva / URL-a.
 * Ako nije sigurno → unknown (Grok gleda naziv + šta je glavni proizvod na slici).
 * NIKAD ne pretpostavljamo "dukserica/gornji deo" kao default.
 */

/**
 * @param {{ productName?: string, url?: string, brand?: string }} input
 * @returns {{
 *   type: string
 *   labelSr: string
 *   changeOnly: string
 *   keepFromCustomer: string[]
 *   confidence: 'high' | 'low'
 * }}
 */
export function detectGarment(input = {}) {
  const text = [input.productName, input.url, input.brand]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  /** @type {{ type: string, labelSr: string, re: RegExp, changeOnly: string, keep: string[] }[]} */
  const rules = [
    {
      type: 'pants',
      labelSr: 'pantalone / donji deo',
      re: /\b(pantalon\w*|pants|jeans|farmerk\w*|helank\w*|legging\w*|shorts|bermude|trenerk\w*|donji[\s_-]*deo|donji[\s_-]*delovi|sweatpants|joggers|cargo|chino|skirt|suknj\w*|culotte)\b/i,
      changeOnly: 'the pants / jeans / bottoms / skirt ONLY (lower body garment)',
      keep: ['top/shirt/hoodie', 'shoes', 'jewelry', 'rings', 'watch', 'bag'],
    },
    {
      type: 'shoes',
      labelSr: 'obuća',
      re: /\b(patik\w*|shoe\w*|sneaker\w*|boot\w*|cipel\w*|sandal\w*|papuc\w*|loafer|heel\w*)\b/i,
      changeOnly: 'the shoes ONLY',
      keep: ['all clothing', 'jewelry', 'rings'],
    },
    {
      type: 'dress',
      labelSr: 'haljina',
      re: /\b(haljin\w*|dress|gown)\b/i,
      changeOnly: 'the dress as one piece',
      keep: ['shoes', 'jewelry', 'rings', 'watch', 'bag'],
    },
    {
      type: 'hoodie',
      labelSr: 'dukserica / hoodie',
      re: /\b(dukseric\w*|duks\b|hoodie|sweatshirt|sweater|fleece)\b/i,
      changeOnly: 'the hoodie / sweatshirt ONLY (upper garment)',
      keep: ['pants/bottoms', 'shoes', 'jewelry', 'rings', 'watch', 'bag'],
    },
    {
      type: 'jacket',
      labelSr: 'jakna / kaput',
      re: /\b(jakn\w*|jacket|coat|kaput|blazer|vesta|cardigan|bomber|parka|windbreaker)\b/i,
      changeOnly: 'the jacket / coat / outerwear ONLY',
      keep: ['pants', 'shoes', 'jewelry', 'rings', 'inner top if not the product'],
    },
    {
      type: 'tshirt',
      labelSr: 'majica / T-shirt',
      // pre košulje — "T-Shirt" sadrži "shirt"
      re: /\b(majic\w*|t-?shirt|tee\b|crop[\s_-]*top|\btop\b|polo)\b/i,
      changeOnly: 'the t-shirt / top ONLY',
      keep: ['pants/bottoms', 'shoes', 'jewelry', 'rings', 'watch', 'bag'],
    },
    {
      type: 'shirt',
      labelSr: 'košulja / bluza',
      re: /\b(kosulj\w*|(?<!t-)shirt|blouse|bluz\w*)\b/i,
      changeOnly: 'the shirt / blouse ONLY',
      keep: ['pants/bottoms', 'shoes', 'jewelry', 'rings'],
    },
    {
      type: 'accessory',
      labelSr: 'aksesoar',
      re: /\b(torba|bag|rase|nakit|ring|prsten|ogrl\w*|necklace|earring|mindjus\w*|sat\b|watch|kapa|hat|sal\b|scarf|belt|kais)\b/i,
      changeOnly: 'the accessory product ONLY',
      keep: ['all clothing', 'other jewelry not in the product'],
    },
  ]

  for (const rule of rules) {
    if (rule.re.test(text)) {
      return {
        type: rule.type,
        labelSr: rule.labelSr,
        changeOnly: rule.changeOnly,
        keepFromCustomer: rule.keep,
        confidence: 'high',
      }
    }
  }

  // NESIGURNO — ne nagađaj duks/gornji deo!
  const nameHint = (input.productName || '').trim()
  return {
    type: 'unknown',
    labelSr: nameHint ? `proizvod: ${nameHint.slice(0, 60)}` : 'proizvod sa linka (nepoznat tip)',
    changeOnly: nameHint
      ? `ONLY the single product being sold named "${nameHint}" — whatever garment category that is (pants OR top OR dress etc.). Do NOT invent a different garment.`
      : 'ONLY the single primary product garment being sold in the listing (the hero product). Do NOT invent extra garments.',
    keepFromCustomer: [
      'every other clothing category not being sold',
      'shoes unless product is shoes',
      'jewelry/rings/watches/bags unless product is that accessory',
    ],
    confidence: 'low',
  }
}
