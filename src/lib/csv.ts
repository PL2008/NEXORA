/** CSV no padrão brasileiro (Excel pt-BR): separador ';', BOM UTF-8 e quebras CRLF. */

export type CsvCell = string | number | null | undefined

function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return ''
  let s = String(cell)
  // Evita injeção de fórmulas ao abrir no Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?[\d.]+(,\d+)?$/.test(s)) s = `'${s}`
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(';'))
  return `\ufeff${lines.join('\r\n')}\r\n`
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
