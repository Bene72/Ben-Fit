import { escapeHtml, safeImageSrc } from '../html'

describe('escapeHtml', () => {
  it('neutralise une injection de balise', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    )
  })
  it('gère null / nombres', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(12)).toBe('12')
  })
})

describe('safeImageSrc', () => {
  it('accepte une image base64', () => {
    expect(safeImageSrc('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA')
  })
  it('refuse javascript: et les guillemets', () => {
    expect(safeImageSrc('javascript:alert(1)')).toBe('')
    expect(safeImageSrc('data:image/png;base64,AA" onerror="x')).toBe('')
  })
})
