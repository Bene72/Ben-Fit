const calls = []
let rows = []
jest.mock('../supabase', () => {
  const q = {
    select: () => q,
    or: (f) => (calls.push(['or', f]), q),
    order: () => q,
    limit: (n) => (calls.push(['limit', n]), q),
    lt: (c, v) => (calls.push(['lt', v]), q),
    then: (r) => Promise.resolve({ data: rows, error: null }).then(r),
  }
  return { supabase: { from: () => q } }
})
const { loadMessagesPage, PAGE_SIZE } = require('../messagesData')

it('renvoie la dernière page en ordre chronologique et signale la suite', async () => {
  rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({
    id: i,
    created_at: `t${String(999 - i)}`,
  }))
  const page = await loadMessagesPage('x')
  expect(page.messages).toHaveLength(PAGE_SIZE)
  expect(page.hasMore).toBe(true)
  expect(page.messages[0].id).toBe(PAGE_SIZE - 1)
  expect(page.messages.at(-1).id).toBe(0)
})

it('charge les messages plus anciens que le premier affiché', async () => {
  rows = [{ id: 'a', created_at: 't1' }]
  const page = await loadMessagesPage('x', 't5')
  expect(calls).toContainEqual(['lt', 't5'])
  expect(page.hasMore).toBe(false)
})
