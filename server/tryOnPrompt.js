/**
 * Prompti za try-on pipeline C (2 poziva):
 * 1) poza + telo + face  → osoba u pozi
 * 2) odeća napred (+ nazad) → oblačenje
 */

/**
 * STEP 1 — kompozicija osobe u izabranoj pozi.
 * Pose image = SAMO stil poziranja (kontura tela), NE lice / identitet / odeća.
 * Prompt je namerno jednostavan — Grok Imagine mora da ignoriše lice sa pose-ref.
 */
export function buildPoseComposePrompt({ poseLabel } = {}) {
  const poseName = poseLabel ? `Pose name (for you): ${poseLabel}.` : ''
  return [
    'TASK: Repose the REAL customer. Same person, new body pose.',
    '',
    'WHAT EACH IMAGE IS:',
    'IMAGE 1 = the customer (body + identity). KEEP this person.',
    'IMAGE 2 = POSE GUIDE ONLY. This is NOT the person we want. Use it like a stick-figure / mannequin for body position.',
    'IMAGE 3 = the customer FACE close-up. Lock this face on the output.',
    '',
    'CRITICAL RULE FOR IMAGE 2 (read carefully):',
    'From Image 2 copy ONLY how the body is posed:',
    '  • how she stands or sits',
    '  • torso / hip / shoulder angle',
    '  • where the arms and hands are',
    '  • where the legs and feet are',
    '  • overall body contour / silhouette of the pose',
    '',
    'From Image 2 DO NOT copy ANY of these:',
    '  • face, eyes, nose, mouth, expression',
    '  • hair color / hairstyle / identity',
    '  • skin tone or body identity of that model',
    '  • clothes, shoes, jewelry, tattoos, makeup',
    '  • background or lighting mood of that photo',
    'Think of Image 2 as invisible scaffolding: pose bones only, throw away the rest.',
    '',
    'OUTPUT = customer from Image 1 + face from Image 3, body arranged like Image 2 pose.',
    poseName,
    'Photorealistic. Neutral background similar to Image 1 when possible.',
    'FORBIDDEN: outputting the pose-model face or a different person.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * STEP 1 bez pose-slike (stara "hodajući" poza) — samo tekst.
 * Image 1 = body, Image 2 = face.
 */
export function buildWalkingPosePrompt() {
  return [
    'TASK: Show the REAL customer in a natural walking / stepping-forward front pose.',
    '',
    'IMAGE 1 = CUSTOMER BODY photo (identity + body).',
    'IMAGE 2 = CUSTOMER FACE close-up (face lock).',
    '',
    'Pose: mid-step walking toward camera, natural arm swing, confident feminine fashion walk, front-facing.',
    'Keep the same person: face from Image 2, body from Image 1.',
    'Do not change identity. Photorealistic. Neutral background similar to Image 1.',
    'FORBIDDEN: different face, catalog model identity.',
  ].join('\n')
}

/**
 * STEP 2 — oblačenje osobe iz step1.
 */
export function buildDressPrompt({
  productName,
  garmentLabelSr,
  changeOnly,
  keepFromCustomer = [],
  garmentConfidence,
  hasBackImage,
} = {}) {
  const uncertain = garmentConfidence === 'low' || !changeOnly
  const keepList =
    keepFromCustomer.length > 0
      ? keepFromCustomer.join(', ')
      : 'shoes, jewelry, rings, watches, bags (unless product is that item)'

  const garmentBits = [
    productName ? `Product: ${productName}.` : '',
    garmentLabelSr ? `Type hint: ${garmentLabelSr}.` : '',
    changeOnly ? `Change ONLY: ${changeOnly}.` : 'Change ONLY the sold garment.',
    hasBackImage
      ? 'IMAGE 2 = garment FRONT reference. IMAGE 3 = garment BACK reference. Use both for accurate front+back details.'
      : 'IMAGE 2 = garment reference (front). Match visible details exactly.',
    'Copy exact pockets, seams, collar, buttons, fabric — do NOT invent extra pockets or details.',
  ]
    .filter(Boolean)
    .join(' ')

  return [
    'TASK: Dress the person in IMAGE 1 with the product garment. Keep the same person and the same pose.',
    '',
    'IMAGE 1 = the customer already posed (from previous step). Keep identity, face, pose, body, background.',
    garmentBits,
    uncertain
      ? 'Identify the primary sold garment and transfer only that piece.'
      : '',
    `KEEP on the customer: ${keepList}.`,
    'Do NOT copy from clothing refs: model face/body, tattoos, jewelry, accessories.',
    'NO text / watermarks / shop names on the output.',
    'Photorealistic wardrobe swap only.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** @deprecated — staro ime, zadržano ako negde ostane import */
export function buildFaceRestorePrompt() {
  return [
    'FACE IDENTITY RESTORE on an existing photo.',
    'IMAGE 1 = full photo. Keep everything except the face.',
    'IMAGE 2 = real customer face. Replace ONLY the face.',
    'No clothing changes. No text.',
  ].join('\n')
}

/** legacy export used elsewhere — keep minimal shim */
export function buildTryOnPrompt(opts = {}) {
  // Fallback single-call path if ever needed
  return buildDressPrompt(opts)
}
