// Los cuatro círculos de estado, dibujados como SVG del mismo tamaño: los
// glifos de texto (● ◐ ◍ ○) vienen de fuentes distintas y no miden igual.
// Cuanto más relleno, más avanzada: vacío, trama, medio, lleno.

import type { Status } from './board'

export const DOT_PX = 12

const GREEN = '#06D6A0'
const AMBER = '#FFBE0B'
const GREY = '#8b8b8b'

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DOT_PX}" height="${DOT_PX}" viewBox="0 0 12 12">${body}</svg>`

const ring = (color: string) =>
  `<circle cx="6" cy="6" r="5" fill="none" stroke="${color}" stroke-width="1.4"/>`

// La trama: puntitos en rejilla, recortados al círculo.
const stipple = [2.5, 4.75, 7, 9.25]
  .flatMap((y, row) =>
    [2.5, 4.75, 7, 9.25].map(x => `<circle cx="${x + (row % 2 ? 1.1 : 0)}" cy="${y}" r="0.75" fill="${GREY}"/>`),
  )
  .join('')

export const DOT_SVG: Record<Status, string> = {
  done: svg(`<circle cx="6" cy="6" r="5.7" fill="${GREEN}"/>`),
  doing: svg(`<path d="M6 1 A5 5 0 0 0 6 11 Z" fill="${AMBER}"/>${ring(AMBER)}`),
  agreed: svg(
    `<defs><clipPath id="c"><circle cx="6" cy="6" r="4.3"/></clipPath></defs>` +
      `<g clip-path="url(#c)">${stipple}</g>${ring(GREY)}`,
  ),
  none: svg(ring(GREY)),
}

/** Respaldo para el terminal, que no dibuja SVG. */
export const DOT_TEXT: Record<Status, string> = { done: '●', doing: '◐', agreed: '◍', none: '○' }

export const DOT_ALT: Record<Status, string> = {
  done: 'Verificada',
  doing: 'En construcción',
  agreed: 'Acordada',
  none: 'Sin ficha',
}
