// Lectura del PRD y de las fichas de docs/features/, sin tocar el disco:
// recibe textos y devuelve el tablero. Así se prueba sin archivos.

export type Priority = 'M' | 'S' | 'C'
/** done: Verificada · doing: En construcción · agreed: Acordada · none: sin ficha */
export type Status = 'done' | 'doing' | 'agreed' | 'none'

export type CardRef = { file: string; status: Status }

export type Requirement = {
  id: string
  priority: Priority
  title: string
  /** El "Dado…, cuando…, entonces…" del PRD, tal cual. */
  criterion: string
  status: Status
  /** Las fichas que dicen cerrarlo. */
  cards: CardRef[]
}

export type CardText = { file: string; text: string }

export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'M', label: 'MUST' },
  { key: 'S', label: 'SHOULD' },
  { key: 'C', label: 'COULD' },
]

const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '')

type PrdItem = Omit<Requirement, 'status' | 'cards'>

/** Las líneas `- **[M-01] Título** — Dado…` del PRD, en su orden. */
export function parsePrd(text: string): PrdItem[] {
  const seen = new Set<string>()
  const list: PrdItem[] = []
  for (const line of stripComments(text).split('\n')) {
    const m = line.match(/^\s*-\s*\*\*\[([MSC])-(\d+)\]\s*(.*?)\*\*\s*(.*)$/)
    if (!m) continue
    const id = `${m[1]}-${m[2]}`
    if (seen.has(id)) continue
    seen.add(id)
    list.push({
      id,
      priority: m[1] as Priority,
      title: (m[3] ?? '').trim() || '(sin título)',
      criterion: (m[4] ?? '').replace(/^[—–-]\s*/, '').trim(),
    })
  }
  return list
}

const RANK: Record<Status, number> = { none: 0, agreed: 1, doing: 2, done: 3 }

/** Estado y requisitos de una ficha; nada si la ficha no declara un estado único. */
export function parseCard(text: string): { status: Status; ids: string[] } | undefined {
  const body = stripComments(text)
  const estado = body.match(/\*\*Estado:\*\*\s*(.+)/i)?.[1] ?? ''
  const found: Status[] = []
  if (/verificada/i.test(estado)) found.push('done')
  if (/en construcci[oó]n/i.test(estado)) found.push('doing')
  if (/acordada/i.test(estado)) found.push('agreed')
  // La línea de formato del README lista los tres: no es una ficha real.
  const status = found[0]
  if (found.length !== 1 || status === undefined) return undefined
  const cierra = body.match(/\*\*Requisitos que cierra:\*\*\s*(.+)/i)?.[1] ?? ''
  const ids = [...cierra.matchAll(/\b([MSC]-\d+)\b/g)].map(m => m[1] ?? '').filter(Boolean)
  return { status, ids }
}

/** Cruza el PRD con las fichas: gana el estado más avanzado de las que cierran cada ID. */
export function buildBoard(prd: string, cards: CardText[]): Requirement[] {
  const byId = new Map<string, CardRef[]>()
  for (const { file, text } of cards) {
    const card = parseCard(text)
    if (!card) continue
    for (const id of new Set(card.ids)) {
      byId.set(id, [...(byId.get(id) ?? []), { file, status: card.status }])
    }
  }
  return parsePrd(prd).map(r => {
    const refs = byId.get(r.id) ?? []
    const status = refs.reduce<Status>(
      (best, c) => (RANK[c.status] > RANK[best] ? c.status : best),
      'none',
    )
    return { ...r, status, cards: refs }
  })
}
