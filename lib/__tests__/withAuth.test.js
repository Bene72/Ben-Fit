/**
 * Tests unitaires — lib/withAuth.js
 *
 * Ajoutés dans le cadre du point 3 de l'audit (09/09/2026).
 *
 * withAuth() est LA porte d'entrée de sécurité de toutes les routes API
 * protégées (pages/api/*) — c'est la brique la plus critique à couvrir de
 * tests, car une régression ici (ex: un `!` oublié) peut ouvrir une route
 * censée être protégée à tout le monde.
 *
 * @supabase/supabase-js est mocké entièrement : on ne veut faire aucun
 * appel réseau réel dans des tests unitaires, et on veut pouvoir simuler
 * précisément chaque cas (token valide/invalide, coach/non-coach...).
 */

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

jest.mock('../rateLimit', () => ({
  isAllowed: jest.fn(),
}))

// eslint-disable-next-line import/first
const { withAuth, checkRateLimit } = require('../withAuth')
// eslint-disable-next-line import/first
const { isAllowed } = require('../rateLimit')

function mockRes() {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('withAuth — authentification', () => {
  it("renvoie 401 si aucun header Authorization n'est fourni", async () => {
    const handler = jest.fn()
    const wrapped = withAuth(handler)
    const req = { headers: {} }
    const res = mockRes()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('renvoie 401 si le token est invalide/expiré (Supabase renvoie une erreur)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid token') })
    const handler = jest.fn()
    const wrapped = withAuth(handler)
    const req = { headers: { authorization: 'Bearer token-invalide' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('appelle le handler avec req.user peuplé si le token est valide', async () => {
    const fakeUser = { id: 'user-123', email: 'test@test.com' }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    const handler = jest.fn((req, res) => res.status(200).json({ ok: true }))
    const wrapped = withAuth(handler)
    const req = { headers: { authorization: 'Bearer token-valide' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(req.user).toEqual(fakeUser)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('extrait correctement le token du header "Bearer xxx"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    const handler = jest.fn((req, res) => res.status(200).json({}))
    const wrapped = withAuth(handler)
    const req = { headers: { authorization: 'Bearer mon-super-token' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(mockGetUser).toHaveBeenCalledWith('mon-super-token')
  })
})

describe('withAuth — option requireCoach', () => {
  const fakeUser = { id: 'user-123' }

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
  })

  it("renvoie 403 si requireCoach est vrai mais le profil n'a pas le rôle coach", async () => {
    mockSingle.mockResolvedValue({ data: { role: 'client' }, error: null })
    const handler = jest.fn()
    const wrapped = withAuth(handler, { requireCoach: true })
    const req = { headers: { authorization: 'Bearer token' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('renvoie 403 si la lecture du profil échoue (fail-closed, pas fail-open)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('db error') })
    const handler = jest.fn()
    const wrapped = withAuth(handler, { requireCoach: true })
    const req = { headers: { authorization: 'Bearer token' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('appelle le handler si requireCoach est vrai et le profil a le rôle coach', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'coach' }, error: null })
    const handler = jest.fn((req, res) => res.status(200).json({}))
    const wrapped = withAuth(handler, { requireCoach: true })
    const req = { headers: { authorization: 'Bearer token' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("n'interroge jamais la table profiles quand requireCoach n'est pas demandé", async () => {
    const handler = jest.fn((req, res) => res.status(200).json({}))
    const wrapped = withAuth(handler) // pas de requireCoach
    const req = { headers: { authorization: 'Bearer token' } }
    const res = mockRes()

    await wrapped(req, res)

    expect(mockFrom).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('checkRateLimit', () => {
  it('renvoie false et laisse passer si isAllowed() retourne true', async () => {
    isAllowed.mockResolvedValue(true)
    const req = {}
    const res = mockRes()

    const blocked = await checkRateLimit(req, res, { maxRequests: 5 })

    expect(blocked).toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('renvoie true et répond 429 si isAllowed() retourne false', async () => {
    isAllowed.mockResolvedValue(false)
    const req = {}
    const res = mockRes()

    const blocked = await checkRateLimit(req, res, { maxRequests: 5 })

    expect(blocked).toBe(true)
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('retourne bien une Promise (garde-fou contre le bug "await manquant" documenté dans le fichier)', () => {
    isAllowed.mockResolvedValue(true)
    const result = checkRateLimit({}, mockRes(), {})
    expect(result).toBeInstanceOf(Promise)
  })
})
