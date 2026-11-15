// Minimal CSV reader for the config/ files, no library. It handles quoted
// fields (commas and doubled quotes inside), CRLF and LF line endings, a
// trailing newline and empty cells. Lines that are blank or start with `#`
// are skipped, so placeholder files can carry a comment header.

export class CsvError extends Error {
  readonly line: number

  constructor(line: number, message: string) {
    super(message)
    this.name = 'CsvError'
    this.line = line
  }
}

interface Row {
  lineNumber: number
  content: string
}

interface CsvTable {
  headers: string[]
  records: Record<string, string>[]
}

export function parseCsv(text: string): Record<string, string>[] {
  return parseCsvTable(text).records
}

export function parseCsvTable(text: string): CsvTable {
  // Strip a UTF-8 BOM so a file saved from a spreadsheet still parses.
  const cleaned = text.replace(/^\uFEFF/, '')
  if (cleaned.trim() === '') return { headers: [], records: [] }

  const rows = splitRows(cleaned)
  if (rows.length === 0) return { headers: [], records: [] }
  const headers = parseRow(rows[0].content).map((header) => header.trim())
  const records: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const cells = parseRow(rows[i].content)
    if (cells.length !== headers.length) {
      throw new CsvError(
        rows[i].lineNumber,
        `Line ${rows[i].lineNumber} has ${cells.length} columns; expected ${headers.length}.`,
      )
    }
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cells[index]
    })
    records.push(record)
  }

  return { headers, records }
}

// Runs parseCsv and turns a malformed-row error into a problem instead of
// letting one bad line blank the whole app. The `required` columns are checked
// against the header first, so a file with an older column shape reports each
// missing column once by name and yields no rows, instead of one malformed row
// per line.
export function parseCsvFile(
  fileName: string,
  text: string,
  problems: string[],
  required: readonly string[] = [],
): Record<string, string>[] {
  try {
    const table = parseCsvTable(text)
    const missing = required.filter(
      (column) => !table.headers.includes(column),
    )
    for (const column of missing) {
      problems.push(`Missing column '${column}' in ${fileName}.`)
    }
    if (missing.length > 0) return []
    return table.records
  } catch (error) {
    if (error instanceof CsvError) {
      problems.push(`Malformed row in ${fileName}: ${error.message}`)
      return []
    }
    throw error
  }
}

// Reads one numeric cell. An empty or whitespace cell and a non-numeric cell
// are both null, so the caller can report a problem instead of reading 0.
export function parseNumber(cell: string): number | null {
  const trimmed = cell.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function splitRows(text: string): Row[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: Row[] = []
  normalized.split('\n').forEach((content, index) => {
    const trimmed = content.trim()
    if (trimmed === '' || trimmed.startsWith('#')) return
    rows.push({ lineNumber: index + 1, content })
  })
  return rows
}

function parseRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}
