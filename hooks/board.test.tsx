import { expect, test } from 'claude-code/testing'

import { buildBoard } from './board'

const PRD = `
<!-- - **[M-99] Comentada** — no cuenta -->
### MUST
- **[M-01] Registro** — Dado un visitante, cuando se registra, entonces entra.
- **[M-02] Login** — Dado ...
### SHOULD
- **[S-01] Invitar** — Dado ...
- **[S-02] Avisos** — Dado ...
### COULD
- **[C-01] Modo oscuro** — Dado ...
### WON'T
- App móvil
`

const CARDS = [
  { file: 'docs/features/a.md', text: '**Estado:** Verificada\n**Requisitos que cierra:** M-01' },
  { file: 'docs/features/b.md', text: '**Estado:** En construcción\n**Requisitos que cierra:** M-02, S-01' },
  { file: 'docs/features/c.md', text: '**Estado:** Acordada\n**Requisitos que cierra:** M-02, S-02' },
  // La línea de formato del README no es una ficha.
  { file: 'docs/features/d.md', text: '**Estado:** Acordada · En construcción · Verificada\n**Requisitos que cierra:** C-01' },
]

test('cruza el PRD con las fichas', async () => {
  const board = buildBoard(PRD, CARDS)
  expect(board.map(r => `${r.id}:${r.status}`)).toEqual([
    'M-01:done',
    'M-02:doing',
    'S-01:doing',
    'S-02:agreed',
    'C-01:none',
  ])
  expect(board[0]?.title).toBe('Registro')
  expect(board[0]?.criterion).toBe('Dado un visitante, cuando se registra, entonces entra.')
  expect(board[1]?.cards.map(c => c.file)).toEqual(['docs/features/b.md', 'docs/features/c.md'])
})

const PANE = {
  plugin: 'moscow-panel',
  component: 'Pane',
  requestId: 'moscow',
  props: {
    title: 'MoSCoW',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

test('el panel pinta IDs, recuento, despliega una fila y añade al chat', async ($, on) => {
  const filled: string[] = []
  on('prompt.fill', (_, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  on('fs.read', (_, e) => {
    const path = String(e.path)
    if (path.endsWith('prd.md')) return { value: PRD }
    const card = CARDS.find(c => path.endsWith(c.file))
    return { value: card?.text ?? '' }
  })
  on('fs.list', () => ({
    value: ['a.md', 'b.md', 'c.md', 'README.md'].map(name => ({
      name, kind: 'file' as const, size: 1, mtimeMs: 1, isLink: false,
    })),
  }))

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /hechas/ }))?.text).toContain('1/5')
    expect((await ui.find({ type: 'Text', text: /sin ficha/ }))?.text).toContain('1 sin ficha')
    expect(await ui.find({ type: 'Text', text: /Ver en el PRD/ })).toBeUndefined()

    await ui.press({ key: 'M-02' })
    expect(await ui.find({ key: 'open:M-02:docs/features/b.md' })).toBeDefined()
    expect(await ui.find({ key: 'prd:M-02' })).toBeDefined()

    filled.length = 0
    await ui.press({ key: 'prd:M-02' })
    await ui.press({ key: 'open:M-02:docs/features/b.md' })
    expect(filled[0]).toContain('**[M-02] Login**')
    expect(filled[1]).toBe('@docs/features/b.md ')

    await ui.press({ key: 'M-02' })
    expect(await ui.find({ key: 'prd:M-02' })).toBeUndefined()
    await ui.unmount()
  }
})
