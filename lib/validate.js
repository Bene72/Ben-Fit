/**
 * lib/validate.js
 * Helpers de validation légers pour les routes API.
 *
 * Pourquoi pas zod ? Le projet a peu de routes API avec des payloads simples
 * (1-3 champs). Une dépendance complète n'apporte pas grand-chose ici et
 * alourdit le bundle serverless. Ces helpers couvrent les cas réels du projet
 * tout en gardant zéro dépendance externe.
 *
 * Si le nombre de routes/champs grandit significativement, migrer vers zod
 * redevient pertinent : npm install zod
 *
 * Usage dans un handler :
 *   import { validate, isUUID, isNonEmptyString, isBoolean } from '../../lib/validate'
 *
 *   const { valid, errors, data } = validate(req.body, {
 *     client_id: isUUID,
 *     archived:  isBoolean,
 *   })
 *   if (!valid) return res.status(400).json({ error: errors.join(', ') })
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Validateurs individuels ────────────────────────────────────────────────
// Chaque validateur retourne { ok: boolean, value, error? }

export function isUUID(value) {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    return { ok: false, error: 'doit être un UUID valide' }
  }
  return { ok: true, value }
}

export function isEmail(value) {
  if (typeof value !== 'string') {
    return { ok: false, error: 'doit être un email valide' }
  }
  const trimmed = value.trim()
  if (!EMAIL_REGEX.test(trimmed)) {
    return { ok: false, error: 'doit être un email valide' }
  }
  return { ok: true, value: trimmed.toLowerCase() }
}

export function isBoolean(value) {
  if (typeof value !== 'boolean') {
    return { ok: false, error: 'doit être un booléen' }
  }
  return { ok: true, value }
}

/**
 * Crée un validateur de string non-vide avec longueur max (anti-DoS / anti-injection).
 * Trim automatique.
 */
export function isNonEmptyString(maxLength = 500) {
  return function (value) {
    if (typeof value !== 'string') {
      return { ok: false, error: 'doit être une chaîne de caractères' }
    }
    const trimmed = value.slice(0, maxLength).trim()
    if (!trimmed) {
      return { ok: false, error: 'ne peut pas être vide' }
    }
    return { ok: true, value: trimmed }
  }
}

/**
 * Crée un validateur de string optionnelle (peut être absente ou vide).
 */
export function isOptionalString(maxLength = 500) {
  return function (value) {
    if (value === undefined || value === null || value === '') {
      return { ok: true, value: '' }
    }
    if (typeof value !== 'string') {
      return { ok: false, error: 'doit être une chaîne de caractères' }
    }
    return { ok: true, value: value.slice(0, maxLength).trim() }
  }
}

/**
 * Crée un validateur d'énumération (ex: rôle, statut).
 */
export function isOneOf(allowedValues) {
  return function (value) {
    if (!allowedValues.includes(value)) {
      return { ok: false, error: `doit être l'une des valeurs : ${allowedValues.join(', ')}` }
    }
    return { ok: true, value }
  }
}

/**
 * Crée un validateur de nombre dans une plage.
 */
export function isNumberInRange(min, max) {
  return function (value) {
    const num = Number(value)
    if (Number.isNaN(num) || num < min || num > max) {
      return { ok: false, error: `doit être un nombre entre ${min} et ${max}` }
    }
    return { ok: true, value: num }
  }
}

// ─── Validation d'objet complet ─────────────────────────────────────────────

/**
 * Valide un objet body contre un schéma de validateurs.
 *
 * @param {object} body - Le req.body à valider
 * @param {object} schema - { champ: validateurFn }
 * @returns {{ valid: boolean, errors: string[], data: object }}
 */
export function validate(body, schema) {
  const errors = []
  const data = {}

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Corps de requête invalide'], data: {} }
  }

  for (const [field, validator] of Object.entries(schema)) {
    const result = validator(body[field])
    if (!result.ok) {
      errors.push(`${field} : ${result.error}`)
    } else {
      data[field] = result.value
    }
  }

  return { valid: errors.length === 0, errors, data }
}
