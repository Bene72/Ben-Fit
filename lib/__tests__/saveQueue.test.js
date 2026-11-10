import { createSaveQueue } from '../programme/saveQueue'

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it("n'écrit qu'une fois après la dernière frappe, avec la dernière valeur", async () => {
  const writes = []
  const statuses = []
  const q = createSaveQueue({ delay: 500, onStatus: (s) => statuses.push(s) })
  for (const v of ['B', 'Ba', 'Bac', 'Back']) q.schedule('e1:name', async () => writes.push(v))
  expect(writes).toEqual([])
  jest.advanceTimersByTime(500)
  await q.flush()
  expect(writes).toEqual(['Back'])
  expect(statuses.at(-1)).toBe('saved')
})

it('flush écrit immédiatement tous les champs en attente, dans l’ordre', async () => {
  const writes = []
  const q = createSaveQueue({ delay: 5000 })
  q.schedule('e1:sets', async () => writes.push('sets'))
  q.schedule('e1:reps', async () => writes.push('reps'))
  await q.flush()
  expect(writes).toEqual(['sets', 'reps'])
  expect(q.hasPending()).toBe(false)
})

it('signale une erreur', async () => {
  const statuses = []
  const q = createSaveQueue({ delay: 10, onStatus: (s) => statuses.push(s) })
  jest.spyOn(console, 'error').mockImplementation(() => {})
  q.schedule('k', async () => {
    throw new Error('réseau')
  })
  await q.flush()
  expect(statuses.at(-1)).toBe('error')
})
