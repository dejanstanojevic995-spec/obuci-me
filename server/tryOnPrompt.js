/**
 * Prompt builder za virtual try-on (Grok Imagine multi-image edit).
 *
 * Image 1 = telo / poza korisnika
 * Image 2 = product foto (može ceo outfit na manekenu)
 * Image 3 = LICE (face lock) — kad postoji
 *
 * Ključ: menjaj SAMO proizvod koji se prodaje (iz naziva / detekcije),
 * nikad ne izmišljaj drugi komad (npr. duks kad su pantalone).
 */

/**
 * @param {{
 *   pose?: string
 *   productName?: string
 *   personAngle?: string
 *   hasFaceLock?: boolean
 *   garmentType?: string
 *   garmentLabelSr?: string
 *   changeOnly?: string
 *   keepFromCustomer?: string[]
 *   garmentConfidence?: string
 * }} opts
 * @returns {string}
 */
export function buildTryOnPrompt(opts = {}) {
  const {
    pose,
    productName,
    personAngle,
    hasFaceLock = false,
    garmentType,
    garmentLabelSr,
    changeOnly,
    keepFromCustomer = [],
    garmentConfidence,
  } = opts
  const mode = poseMode(pose)
  const uncertain = garmentConfidence === 'low' || garmentType === 'unknown'

  // Naziv/sajt = META samo za identifikaciju komada — NIKAD za ispis na slici
  const metaBlock = [
    'METADATA ONLY (do NOT paint / write / overlay any of this on the photo):',
    productName ? `- listing title: ${productName}` : '- listing title: (unknown)',
    garmentLabelSr ? `- garment category hint: ${garmentLabelSr}` : '',
    'This metadata exists only so you know WHICH garment to transfer from Image 2.',
    'It must NEVER appear as text, caption, title card, watermark, sticker, or typography in the output.',
  ]
    .filter(Boolean)
    .join('\n')

  const targetBlock = uncertain
    ? [
        'TARGET GARMENT (critical — do not guess wrong category):',
        'Use metadata + Image 2 to identify the PRIMARY product being sold.',
        'Transfer ONLY that one product piece onto the customer.',
        'If metadata/URL indicates pants / bottoms / sweatpants → change ONLY pants. Do NOT invent a hoodie/top.',
        'If metadata indicates hoodie/sweatshirt → change ONLY the hoodie. Do NOT also change pants.',
        'If the model in Image 2 wears a full outfit, ignore every piece that is NOT the sold product.',
        'NEVER invent a garment that is not clearly the product.',
      ].join('\n')
    : [
        'TARGET GARMENT (critical):',
        `Change ONLY: ${changeOnly || 'the single sold product garment'}.`,
        'Image 2 may show a full styled look — ignore extra pieces that are not this product.',
        'NEVER invent a different garment category than the product.',
      ].join('\n')

  const keepList =
    keepFromCustomer.length > 0
      ? keepFromCustomer.join(', ')
      : 'all non-product clothing, shoes, jewelry, rings, watches, bags'

  const faceBlock = hasFaceLock
    ? [
        'IMAGE 3 = FACE IDENTITY LOCK.',
        'Output face must match Image 3 exactly (eyes, nose, mouth, jaw, skin, proportions).',
        'Prefer Image 3 over Image 1 for the face. Do not morph identity across generations.',
      ].join('\n')
    : 'Preserve the face from Image 1 as closely as possible.'

  const identityBlock = [
    'IMAGE 1 = REAL customer (only allowed person in the output).',
    hasFaceLock
      ? 'Body, skin, arms, hands, pose, scene from Image 1. Face from Image 3.'
      : 'Keep identity from Image 1 (face + full body).',
    'Never use the mannequin/model from Image 2 as the person.',
    'CUSTOMER BODY LOCK (critical):',
    '- Keep the customer skin exactly as in Image 1: no new tattoos, no new piercings, no new scars, no new moles, no body art from Image 2.',
    '- If the catalog model in Image 2 has tattoos / ink / piercings / jewelry on skin — IGNORE them completely. Do NOT paint them onto the customer.',
    '- If the customer in Image 1 has NO tattoos, the output must also have NO tattoos.',
    '- Hands, arms, neck, chest, legs skin = Image 1 only.',
  ].join('\n')

  const clothingBlock = [
    'IMAGE 2 = GARMENT REFERENCE ONLY (may show a model wearing clothes).',
    'From Image 2 take ABSOLUTELY NOTHING except the sold clothing item (fabric, cut, color, print ON the garment).',
    targetBlock,
    `KEEP from the customer in Image 1: ${keepList}.`,
    'Do NOT copy from Image 2 onto the customer:',
    '- tattoos, temporary tattoos, ink, henna, body paint',
    '- piercings, rings, bracelets, watches, necklaces, earrings',
    '- bags, belts, hats, sunglasses, shoes (unless the sold product IS that item)',
    '- the model face, hair, body shape, skin tone, or pose identity',
    'Hands/arms/skin must match Image 1 — natural, without model jewelry or tattoos.',
    'Real logos printed ON the fabric of the garment may stay (they are part of the clothes).',
    'Shop names / product titles / watermarks as text on the photo = FORBIDDEN.',
  ].join('\n')

  const noTextBlock = [
    'NO TEXT ON OUTPUT IMAGE (very important):',
    'Output must be a clean photoreal photo of the person — zero added writing.',
    'Do NOT render: product name, shop name, website, URL, brand wordmarks as overlay, captions, subtitles, watermarks, stickers, posters, floating typography.',
    'Examples of forbidden text: "Champion Move", "Sportvision", "Sport Vision", prices, SKU codes.',
    'If Image 2 contains UI/watermark text around the product, do not copy that text into the result.',
  ].join('\n')

  const forbidden = [
    'FORBIDDEN:',
    '- copying tattoos / piercings / body art from the Image 2 model onto the customer',
    '- any readable text / watermark / shop or product-title overlay on the image',
    '- inventing a hoodie/top when the product is pants (or any wrong category)',
    '- inventing pants when the product is a top/hoodie',
    '- dressing a full matching set when only one product piece is sold',
    '- transferring jewelry/rings/accessories from the model',
    '- replacing the customer with the catalog model',
    '- face identity drift',
  ].join('\n')

  if (mode === 'preserve') {
    return [
      'MODE: IN-PLACE virtual try-on. Swap ONLY the sold product garment on the customer photo.',
      '',
      metaBlock,
      '',
      identityBlock,
      '',
      faceBlock,
      '',
      'Preserve from Image 1: camera framing, pose, room/furniture/scene, and every clothing item that is NOT the sold product.',
      '',
      clothingBlock,
      '',
      noTextBlock,
      '',
      'ALLOWED: replace only the target product piece; natural fit/drape.',
      'POSE: keep Image 1 pose.',
      '',
      hasFaceLock
        ? 'PRIORITY: 1) face (Image 3)  2) customer body+scene+non-product clothes (Image 1)  3) sold product piece (Image 2)'
        : 'PRIORITY: 1) customer identity+scene  2) sold product piece only',
      forbidden,
      'Final check: same customer body/skin as Image 1 (NO model tattoos); only the garment changed; same face; no model jewelry; no text overlays.',
    ].join('\n')
  }

  return [
    'MODE: Virtual try-on with intentional pose/view change. Same person, requested pose.',
    '',
    metaBlock,
    '',
    identityBlock,
    personAngle ? `Image 1 body angle reference: ${personAngle}.` : '',
    '',
    faceBlock,
    '',
    clothingBlock,
    '',
    noTextBlock,
    '',
    '=== REQUIRED POSE / VIEW ===',
    strongPoseInstruction(pose, personAngle),
    '',
    'May reframe for the new pose; do not use Image 2 studio/model identity.',
    'Still change ONLY the sold product piece — never invent other garments.',
    '',
    forbidden,
    'Final check: same customer skin/body (NO tattoos from model); same face; requested pose; ONLY the garment from Image 2; no text.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Drugi poziv: zameni samo lice na gotovom try-on rezultatu.
 */
export function buildFaceRestorePrompt() {
  return [
    'FACE IDENTITY RESTORE on an existing virtual try-on photo.',
    'IMAGE 1 = the try-on result (person already wearing the garment). Keep EVERYTHING from Image 1 except the face:',
    '- same body, pose, clothing, fabric details, pockets, background, lighting, hands, skin outside the face',
    '- do not change the garment, do not add/remove pockets, logos, or accessories',
    'IMAGE 2 = the real customer face close-up. Replace ONLY the face in Image 1 with this exact face.',
    'Match Image 2 face exactly: eyes, nose, mouth, jaw, skin tone, freckles, expression baseline.',
    'Seamless photoreal blend. No text, no watermarks.',
    'FORBIDDEN: changing clothes, inventing garment details, copying anything from a catalog model, beautify morph that loses identity.',
  ].join('\n')
}

function poseMode(pose) {
  if (!pose || pose === 'stojeći-front') return 'preserve'
  return 'restage'
}

function strongPoseInstruction(pose, personAngle) {
  const map = {
    'stojeći-front': ['Pose: standing, facing camera.'],
    'stojeći-bočno': [
      'Pose: standing SIDE / three-quarter profile (not front).',
      personAngle && personAngle !== 'front'
        ? 'Match body-reference side orientation.'
        : 'Clearly turn to side view.',
    ],
    hodajući: ['Pose: walking mid-stride, natural arm swing, full body preferred.'],
    'ruke-u-bok': ['Pose: standing facing camera, both hands on hips.'],
    sedeći: ['Pose: seated / sitting clearly.'],
    sedeći: ['Pose: seated / sitting clearly.'],
  }
  return (map[pose] || ['Apply selected pose; keep face identity.']).join('\n')
}
