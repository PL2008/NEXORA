import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('usa ; , BOM e CRLF, escapando aspas e quebras', () => {
    const csv = toCsv(
      ['Nome', 'Valor'],
      [
        ['Ana; Silva', '1.234,56'],
        ['Diz "oi"', null],
        ['linha\nquebrada', 3],
      ],
    )
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toBe('\ufeffNome;Valor\r\n"Ana; Silva";1.234,56\r\n"Diz ""oi""";\r\n"linha\nquebrada";3\r\n')
  })
  it('neutraliza fórmulas mas mantém números negativos', () => {
    const csv = toCsv(['a'], [['=SOMA(A1)'], ['-1.234,56'], ['@x']])
    expect(csv).toContain("'=SOMA(A1)")
    expect(csv).toContain('\r\n-1.234,56\r\n')
    expect(csv).toContain("'@x")
  })
})
