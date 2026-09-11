/**
 * Tests unitaires — lib/rateLimit.js
 *
 * Ajoutés dans le cadre du point 3 de l'audit (09/09/2026).
 *
 * UPSTASH_URL / UPSTASH_TOKEN sont lues UNE FOIS au chargement du module
 * (constantes de haut de fichier), donc pour tester les deux branches
 * (mémoire vs Upstash) on doit manipuler process.env PUIS réimporter le
 * module à froid avec jest.resetModules() + require() dynamique — un
 * import statique ne rechargerait pas ces constantes.
 */

const ORIGINAL_ENV = process.env

function freshRateLimit(envOverrides = {}) {
  jest.resetModules()
  process.env = { ...ORIGINAL_ENV, ...envOverrides }
  // eslint-disable-next-line global-require
  return require('../rateLimit')
}

afterEach(() => {
  process.env = ORIGINAL_ENV
  jest.restoreAllMocks()
})

function fakeReq(ip) {
  return { headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: ip } }
}

describe("rateLimit — mode mémoire (pas d'Upstash configuré)", () => {
  it('isUsingDistributedRateLimit() est false sans variables Upstash', () => {
    const { isUsingDistributedRateLimit } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    expect(isUsingDistributedRateLimit()).toBe(false)
  })

  it('autorise les N premières requêtes puis bloque la (N+1)ème', async () => {
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    const req = fakeReq('1.2.3.4')
    const opts = { maxRequests: 3, windowMs: 60_000, routeKey: 'test-route' }

    expect(await isAllowed(req, opts)).toBe(true)
    expect(await isAllowed(req, opts)).toBe(true)
    expect(await isAllowed(req, opts)).toBe(true)
    expect(await isAllowed(req, opts)).toBe(false) // 4ème requête, quota dépassé
  })

  it("isole les compteurs par IP : une IP bloquée n'affecte pas les autres", async () => {
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    const opts = { maxRequests: 1, windowMs: 60_000, routeKey: 'test-route' }

    expect(await isAllowed(fakeReq('1.1.1.1'), opts)).toBe(true)
    expect(await isAllowed(fakeReq('1.1.1.1'), opts)).toBe(false)
    // Autre IP : quota indépendant, doit repartir de zéro.
    expect(await isAllowed(fakeReq('2.2.2.2'), opts)).toBe(true)
  })

  it('isole les compteurs par routeKey : un quota épuisé sur une route ne bloque pas une autre route pour la même IP', async () => {
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    const req = fakeReq('9.9.9.9')

    expect(await isAllowed(req, { maxRequests: 1, windowMs: 60_000, routeKey: 'route-a' })).toBe(
      true
    )
    expect(await isAllowed(req, { maxRequests: 1, windowMs: 60_000, routeKey: 'route-a' })).toBe(
      false
    )
    // Même IP, route différente : ne doit pas être affectée par le quota de route-a.
    expect(await isAllowed(req, { maxRequests: 1, windowMs: 60_000, routeKey: 'route-b' })).toBe(
      true
    )
  })

  it('réinitialise le compteur une fois la fenêtre expirée', async () => {
    jest.useFakeTimers()
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    const req = fakeReq('5.5.5.5')
    const opts = { maxRequests: 1, windowMs: 1000, routeKey: 'test-route' }

    expect(await isAllowed(req, opts)).toBe(true)
    expect(await isAllowed(req, opts)).toBe(false)

    jest.advanceTimersByTime(1001)

    expect(await isAllowed(req, opts)).toBe(true)
    jest.useRealTimers()
  })

  it('isAllowedByKey() limite directement par clé, sans passer par un objet requête', async () => {
    const { isAllowedByKey } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    const opts = { maxRequests: 2, windowMs: 60_000 }

    expect(await isAllowedByKey('login-email:test@test.com', opts)).toBe(true)
    expect(await isAllowedByKey('login-email:test@test.com', opts)).toBe(true)
    expect(await isAllowedByKey('login-email:test@test.com', opts)).toBe(false)
    // Autre clé (autre email) : quota indépendant.
    expect(await isAllowedByKey('login-email:autre@test.com', opts)).toBe(true)
  })
})

describe('rateLimit — mode distribué (Upstash configuré)', () => {
  it('isUsingDistributedRateLimit() est true quand les deux variables sont définies', () => {
    const { isUsingDistributedRateLimit } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })
    expect(isUsingDistributedRateLimit()).toBe(true)
  })

  it('autorise la requête quand le compteur Upstash est sous le seuil', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }],
    })
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })

    const allowed = await isAllowed(fakeReq('1.2.3.4'), {
      maxRequests: 10,
      windowMs: 60_000,
      routeKey: 'test',
    })
    expect(allowed).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pipeline'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('bloque la requête quand le compteur Upstash dépasse le seuil', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 11 }],
    })
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })

    const allowed = await isAllowed(fakeReq('1.2.3.4'), {
      maxRequests: 10,
      windowMs: 60_000,
      routeKey: 'test',
    })
    expect(allowed).toBe(false)
  })

  it('fail-open (autorise) si Upstash répond une erreur HTTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })

    const allowed = await isAllowed(fakeReq('1.2.3.4'), {
      maxRequests: 10,
      windowMs: 60_000,
      routeKey: 'test',
    })
    expect(allowed).toBe(true)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('fail-open (autorise) si Upstash est injoignable (erreur réseau)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const { isAllowed } = freshRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })

    const allowed = await isAllowed(fakeReq('1.2.3.4'), {
      maxRequests: 10,
      windowMs: 60_000,
      routeKey: 'test',
    })
    expect(allowed).toBe(true)
  })
})

describe('rateLimit — avertissement de configuration en production (point S5)', () => {
  it('log un warning au chargement du module si NODE_ENV=production sans Upstash configuré', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    freshRateLimit({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('UPSTASH_REDIS_REST_URL'))
  })

  it('ne log rien en production si Upstash est bien configuré', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    freshRateLimit({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: 'https://fake-upstash.example.com',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('ne log rien hors production même sans Upstash (comportement attendu en dev)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    freshRateLimit({
      NODE_ENV: 'development',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
