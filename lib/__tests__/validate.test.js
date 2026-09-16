/**
 * Tests unitaires — lib/validate.js
 *
 * Ajoutés dans le cadre du point 3 de l'audit (09/09/2026) : jest était
 * configuré (jest.config.js) mais aucun fichier de test n'existait, donc
 * `npm test` / `npm run verify` échouaient avec "no tests found".
 *
 * validate.js est un excellent candidat pour démarrer : logique pure, zéro
 * dépendance externe, zéro I/O — donc rapide et fiable à tester, et c'est
 * la première ligne de défense contre les payloads malformés/malveillants
 * sur toutes les routes API.
 */
import {
  isUUID,
  isEmail,
  isBoolean,
  isNonEmptyString,
  isOptionalString,
  isOneOf,
  isNumberInRange,
  validate,
} from '../validate'

describe('isUUID', () => {
  it('accepte un UUID v4 valide', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toEqual({
      ok: true,
      value: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('rejette une chaîne qui ne ressemble pas à un UUID', () => {
    expect(isUUID('pas-un-uuid').ok).toBe(false)
  })

  it('rejette un id numérique (protection contre les IDOR par id séquentiel)', () => {
    expect(isUUID(12345).ok).toBe(false)
  })

  it('rejette null/undefined', () => {
    expect(isUUID(null).ok).toBe(false)
    expect(isUUID(undefined).ok).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepte un email valide et le normalise en minuscules', () => {
    const result = isEmail('  Test@Example.COM  ')
    expect(result.ok).toBe(true)
    expect(result.value).toBe('test@example.com')
  })

  it('rejette une chaîne sans arobase', () => {
    expect(isEmail('pas-un-email').ok).toBe(false)
  })

  it('rejette un email sans domaine', () => {
    expect(isEmail('test@').ok).toBe(false)
  })

  it("rejette les types non-string (ex: objet injecté à la place d'un email)", () => {
    expect(isEmail({ toString: () => 'a@b.com' }).ok).toBe(false)
    expect(isEmail(42).ok).toBe(false)
  })
})

describe('isBoolean', () => {
  it('accepte true et false', () => {
    expect(isBoolean(true)).toEqual({ ok: true, value: true })
    expect(isBoolean(false)).toEqual({ ok: true, value: false })
  })

  it('rejette les valeurs "truthy" qui ne sont pas des booléens stricts (ex: "true", 1)', () => {
    expect(isBoolean('true').ok).toBe(false)
    expect(isBoolean(1).ok).toBe(false)
    expect(isBoolean(0).ok).toBe(false)
  })
})

describe('isNonEmptyString', () => {
  it('accepte une chaîne non vide et la trim', () => {
    const validator = isNonEmptyString()
    expect(validator('  bonjour  ')).toEqual({ ok: true, value: 'bonjour' })
  })

  it("rejette une chaîne vide ou uniquement composée d'espaces", () => {
    const validator = isNonEmptyString()
    expect(validator('').ok).toBe(false)
    expect(validator('   ').ok).toBe(false)
  })

  it('tronque à maxLength (protection anti-DoS sur des champs texte libre)', () => {
    const validator = isNonEmptyString(5)
    const result = validator('123456789')
    expect(result.ok).toBe(true)
    expect(result.value).toBe('12345')
  })

  it('rejette les types non-string', () => {
    const validator = isNonEmptyString()
    expect(validator(123).ok).toBe(false)
    expect(validator(null).ok).toBe(false)
  })
})

describe('isOptionalString', () => {
  it('accepte undefined, null et chaîne vide comme valides (valeur "")', () => {
    const validator = isOptionalString()
    expect(validator(undefined)).toEqual({ ok: true, value: '' })
    expect(validator(null)).toEqual({ ok: true, value: '' })
    expect(validator('')).toEqual({ ok: true, value: '' })
  })

  it('accepte et tronque une chaîne fournie', () => {
    const validator = isOptionalString(3)
    expect(validator('abcdef')).toEqual({ ok: true, value: 'abc' })
  })

  it('rejette les types non-string autres que null/undefined', () => {
    const validator = isOptionalString()
    expect(validator(42).ok).toBe(false)
  })
})

describe('isOneOf', () => {
  it('accepte une valeur présente dans la liste', () => {
    const validator = isOneOf(['coach', 'client'])
    expect(validator('coach')).toEqual({ ok: true, value: 'coach' })
  })

  it("rejette une valeur absente de la liste (ex: tentative d'escalade de rôle)", () => {
    const validator = isOneOf(['coach', 'client'])
    expect(validator('admin').ok).toBe(false)
  })
})

describe('isNumberInRange', () => {
  it('accepte un nombre dans la plage', () => {
    const validator = isNumberInRange(0, 100)
    expect(validator(50)).toEqual({ ok: true, value: 50 })
  })

  it('accepte une chaîne numérique et la convertit', () => {
    const validator = isNumberInRange(0, 100)
    expect(validator('42')).toEqual({ ok: true, value: 42 })
  })

  it('rejette une valeur hors plage', () => {
    const validator = isNumberInRange(0, 100)
    expect(validator(101).ok).toBe(false)
    expect(validator(-1).ok).toBe(false)
  })

  it('rejette une valeur non numérique', () => {
    const validator = isNumberInRange(0, 100)
    expect(validator('pas-un-nombre').ok).toBe(false)
  })
})

describe('validate (schéma complet)', () => {
  it('retourne valid=true et les données nettoyées quand tout est correct', () => {
    const result = validate(
      { email: '  A@B.com  ', archived: true },
      { email: isEmail, archived: isBoolean }
    )
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.data).toEqual({ email: 'a@b.com', archived: true })
  })

  it("accumule toutes les erreurs de champs plutôt que de s'arrêter à la première", () => {
    const result = validate(
      { email: 'invalide', archived: 'pas-un-booleen' },
      { email: isEmail, archived: isBoolean }
    )
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toMatch(/email/)
    expect(result.errors[1]).toMatch(/archived/)
  })

  it("rejette un body qui n'est pas un objet (protection contre un payload malformé)", () => {
    expect(validate(null, { email: isEmail }).valid).toBe(false)
    expect(validate('string', { email: isEmail }).valid).toBe(false)
    expect(validate(undefined, { email: isEmail }).valid).toBe(false)
  })

  it('ignore les champs superflus non déclarés dans le schéma (pas de mass-assignment)', () => {
    const result = validate({ email: 'a@b.com', role: 'admin' }, { email: isEmail })
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({ email: 'a@b.com' })
    expect(result.data.role).toBeUndefined()
  })
})
