import type { EngineInterface, Register, RenderSurface } from 'claude-code'

import { buildBoard, PRIORITIES } from './board'
import type { CardText, Requirement, Status } from './board'
import { DOT_ALT, DOT_PX, DOT_SVG, DOT_TEXT } from './dots'

const PANE = 'moscow'
const TITLE = 'MoSCoW'
const PRD = 'docs/prd.md'
const FEATURES = 'docs/features'

/** Las fichas (todo .md de docs/features menos el README), con su ruta. */
async function readCards($: EngineInterface): Promise<CardText[]> {
  const entries = await $.fs.list(FEATURES).catch(() => [])
  const files = entries
    .filter(f => f.kind === 'file' && f.name.endsWith('.md') && f.name.toLowerCase() !== 'readme.md')
    .map(f => `${FEATURES}/${f.name}`)
  return Promise.all(files.map(async file => ({ file, text: await $.fs.read(file).catch(() => '') })))
}

async function loadBoard($: EngineInterface): Promise<Requirement[] | undefined> {
  const prd = await $.fs.read(PRD).catch(() => undefined)
  if (prd === undefined) return undefined
  return buildBoard(prd, await readCards($))
}

/** Huella barata de los archivos: cambia cuando se edita el PRD o una ficha. */
async function fingerprint($: EngineInterface): Promise<string> {
  const prd = await $.fs.stat(PRD).catch(() => undefined)
  const cards = await $.fs.list(FEATURES).catch(() => [])
  return [
    `${prd?.mtimeMs ?? 0}:${prd?.size ?? 0}`,
    ...cards.map(f => `${f.name}:${f.mtimeMs}:${f.size}`).sort(),
  ].join('|')
}

/**
 * Escribe `text` en el cuadro del chat, donde esté el cursor. Donde la
 * superficie no deja escribir en él, lo copia al portapapeles para pegarlo.
 */
async function addToChat($: EngineInterface, text: string, surface: RenderSurface, what: string) {
  const filled = await $.prompt.fill({ text, mode: 'insert' }).catch(() => undefined)
  if (filled?.isFilled) {
    $.ui.toast(`${what} añadido al chat`)
    return
  }
  const copied = await $.ui.copy({ text, surface }).catch(() => undefined)
  $.ui.toast(
    copied?.isCopied
      ? `${what} copiado: pégalo en el chat con ⌘V`
      : `No se pudo añadir ${what} al chat`,
  )
}

/** Cómo se cita un requisito en el chat: su línea del PRD, como cita. */
const quoteRequirement = (r: Requirement) =>
  `> **[${r.id}] ${r.title}**${r.criterion ? ` — ${r.criterion}` : ''}\n> _(${PRD})_\n\n`

const COLOR: Record<Status, string | undefined> = {
  done: 'success',
  doing: 'warning',
  agreed: undefined,
  none: undefined,
}
const LABEL: Record<Status, string> = {
  done: 'Verificada',
  doing: 'En construcción',
  agreed: 'Acordada',
  none: 'Sin ficha',
}
const isPending = (s: Status) => s === 'agreed' || s === 'none'

export const register: Register = on => {
  let lastPrint = ''
  let timer: { cancel: () => void } | undefined
  /** La fila desplegada; vuelve a ninguna tras una recarga del mod. */
  let expanded: string | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'moscow',
      description: 'Abre el panel MoSCoW con el estado de las funcionalidades del PRD',
    })

    // Se abre solo en proyectos con PRD; en los demás, con /moscow.
    const board = await loadBoard($)
    if (board && board.length > 0) void $.ui.open({ id: PANE, title: TITLE })

    lastPrint = await fingerprint($)
    timer?.cancel()
    timer = $.clock.every(2000, () => {
      void fingerprint($).then(print => {
        if (print === lastPrint) return
        lastPrint = print
        $.ui.invalidate('ui.render')
      })
    })

    return next(e)
  })

  on('command.run', { command: 'moscow' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Panel MoSCoW abierto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    // El terminal no dibuja SVG: allí van los glifos de texto.
    const Svg = 'Svg' in elements ? elements.Svg : undefined
    const dot = (s: Status) =>
      Svg ? (
        <Svg source={DOT_SVG[s]} alt={DOT_ALT[s]} width={DOT_PX} height={DOT_PX} />
      ) : (
        <Text color={COLOR[s]} dimColor={isPending(s)}>{DOT_TEXT[s]}</Text>
      )
    const board = await loadBoard($)

    if (board === undefined) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No hay {PRD} en este proyecto.</Text>
        </Box>
      )
    }
    if (board.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>El PRD todavía no tiene funcionalidades con ID (M-01, S-01, C-01…).</Text>
        </Box>
      )
    }

    const count = (s: Status) => board.filter(r => r.status === s).length
    const toggle = (id: string) => () => {
      expanded = expanded === id ? undefined : id
      $.ui.invalidate('ui.render')
    }

    // El color va en Text fuera del botón: la app de escritorio dibuja lo que
    // hay dentro de un Button con su propio estilo y descarta los colores.
    const row = (r: Requirement) => (
      <Box flexDirection="row" gap={1} alignItems="center">
        {dot(r.status)}
        <Text color={COLOR[r.status]} dimColor={isPending(r.status)} mono weight="semibold">{r.id}</Text>
        <Button plain key={r.id} dimColor={isPending(r.status)} label={r.title} onPress={toggle(r.id)} />
      </Box>
    )

    const detail = (r: Requirement) => (
      <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
        {r.criterion !== '' && <Text dimColor>{r.criterion}</Text>}
        {r.cards.length === 0 && <Text dimColor italic>Todavía no tiene ficha.</Text>}
        {r.cards.map(c => (
          <Box flexDirection="row" gap={1}>
            <Button
              plain
              dimColor
              key={`open:${r.id}:${c.file}`}
              label={`+ ${c.file.replace(`${FEATURES}/`, '')}`}
              onPress={press => void addToChat($, `@${c.file} `, press.surface, 'La ficha')}
            />
            <Text color={COLOR[c.status]} dimColor={isPending(c.status)}>· {LABEL[c.status]}</Text>
          </Box>
        ))}
        <Button
          plain
          dimColor
          key={`prd:${r.id}`}
          label={`+ Añadir ${r.id} al chat`}
          onPress={press => void addToChat($, quoteRequirement(r), press.surface, r.id)}
        />
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text weight="bold">{count('done')}/{board.length}</Text>
          <Text dimColor> hechas · </Text>
          <Text color="warning">{count('doing')}</Text>
          <Text dimColor> en curso · {count('none')} sin ficha</Text>
        </Text>

        {PRIORITIES.map(({ key, label }) => {
          const group = board.filter(r => r.priority === key)
          if (group.length === 0) return null
          const groupDone = group.filter(r => r.status === 'done').length
          return (
            <Box flexDirection="column">
              <Text weight="bold">
                {label} <Text dimColor tabular>{groupDone}/{group.length}</Text>
              </Text>
              {group.map(r => (
                <Box flexDirection="column">
                  {row(r)}
                  {expanded === r.id && detail(r)}
                </Box>
              ))}
            </Box>
          )
        })}

        <Box flexDirection="column">
          <Text dimColor>{'– '.repeat(8).trim()}</Text>
          <Text dimColor size="footnote" weight="semibold">Leyenda:</Text>
          {(
            [
              ['done', 'Hecha'],
              ['doing', 'En curso'],
              ['agreed', 'Acordada'],
              ['none', 'Sin ficha'],
            ] as const
          ).map(([s, label]) => (
            <Box flexDirection="row" gap={1} alignItems="center">
              {dot(s)}
              <Text dimColor size="footnote">{label}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
