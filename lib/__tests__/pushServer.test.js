/** @jest-environment node */
const deleted = []
const subs = [
  { id: 's1', endpoint: 'https://push/1', p256dh: 'k', auth: 'a' },
  { id: 's2', endpoint: 'https://push/2', p256dh: 'k', auth: 'a' },
]
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(async (sub) => {
    if (sub.endpoint.endsWith('/2')) {
      const e = new Error('gone')
      e.statusCode = 410
      throw e
    }
  }),
}))
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => ({
      select: () => ({
        eq: async () => ({ data: table === 'push_subscriptions' ? subs : [], error: null }),
      }),
      delete: () => ({ eq: async (_c, id) => deleted.push(id) }),
      insert: async (row) => (row.ref === 'dup' ? { error: { code: '23505' } } : { error: null }),
    }),
  }),
}))

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub'
process.env.VAPID_PRIVATE_KEY = 'priv'
const { sendPushToUser, sendOnce } = require('../pushServer')

it('envoie à chaque appareil et retire les abonnements expirés', async () => {
  const n = await sendPushToUser('u1', { title: 't' })
  expect(n).toBe(1)
  expect(deleted).toEqual(['s2'])
})

it("sendOnce n'envoie pas deux fois", async () => {
  expect(await sendOnce('u1', 'session', 'dup', {})).toBe(0)
})
