/** @jest-environment node */
jest.mock('../../lib/pushServer', () => ({
  supabaseAdmin: {},
  sendOnce: jest.fn(),
  pushReady: () => true,
}))
const handler = require('../../pages/api/cron/daily').default

const mockRes = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  return res
}

describe('/api/cron/daily', () => {
  it('refuse sans le secret', async () => {
    process.env.CRON_SECRET = 'abc'
    const res = mockRes()
    await handler({ headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })
  it('refuse avec un mauvais secret', async () => {
    process.env.CRON_SECRET = 'abc'
    const res = mockRes()
    await handler({ headers: { authorization: 'Bearer nope' } }, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })
  it('refuse si CRON_SECRET absent côté serveur', async () => {
    delete process.env.CRON_SECRET
    const res = mockRes()
    await handler({ headers: { authorization: 'Bearer undefined' } }, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
