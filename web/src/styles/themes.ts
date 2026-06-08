import { useBoardStore } from '../store'

export type Theme = 'dark' | 'light'

export interface Tokens {
  theme: Theme
  // surfaces
  bg: string
  bgSurface: string
  bgElevated: string
  bgHover: string
  bgInput: string
  // lines
  border: string
  borderFocus: string
  hairline: string
  // text
  text: string
  textDim: string
  textMuted: string
  // brand accent
  accent: string
  accentDim: string
  accentSoft: string
  accentGlow: string
  // semantic
  success: string
  warning: string
  info: string
  // graph
  grid: string
  edgeLabelBg: string
  edgeColors: Record<string, { stroke: string; strokeDasharray?: string }>
  // type palette (shared by nodes / legend / minimap)
  types: Record<string, string>
  // typography
  fontDisplay: string
  fontMono: string
  // shape
  radius: number
  shadow: string
}

const FONT_DISPLAY = "'Archivo', system-ui, sans-serif"
const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace"

const TYPES_DARK = {
  action:     '#34d399',
  host:       '#38bdf8',
  identity:   '#fb923c',
  credential: '#fbbf24',
  finding:    '#f43f5e',
  question:   '#a78bfa',
}

const TYPES_LIGHT = {
  action:     '#0d9488',
  host:       '#0284c7',
  identity:   '#ea580c',
  credential: '#b45309',
  finding:    '#e11d48',
  question:   '#7c3aed',
}

export const DARK: Tokens = {
  theme:        'dark',
  bg:           '#08090c',
  bgSurface:    '#101218',
  bgElevated:   '#0c0e13',
  bgHover:      '#171a22',
  bgInput:      '#0a0b0f',
  border:       '#23262f',
  borderFocus:  '#3a3f4b',
  hairline:     '#1a1d24',
  text:         '#e6e8ec',
  textDim:      '#8b909c',
  textMuted:    '#4a4f5a',
  accent:       '#ff3344',
  accentDim:    '#c0202f',
  accentSoft:   'rgba(255,51,68,0.12)',
  accentGlow:   'rgba(255,51,68,0.45)',
  success:      '#34d399',
  warning:      '#fbbf24',
  info:         '#38bdf8',
  grid:         '#14161d',
  edgeLabelBg:  '#0a0b0f',
  edgeColors: {
    confirmed:    { stroke: '#34d399' },
    hypothetical: { stroke: '#6b7280', strokeDasharray: '6 4' },
    blocked:      { stroke: '#f43f5e', strokeDasharray: '2 4' },
    interrupted:  { stroke: '#52525b', strokeDasharray: '11 5' },
  },
  types:        TYPES_DARK,
  fontDisplay:  FONT_DISPLAY,
  fontMono:     FONT_MONO,
  radius:       10,
  shadow:       '0 18px 50px -12px rgba(0,0,0,0.7)',
}

export const LIGHT: Tokens = {
  theme:        'light',
  bg:           '#e7e3da',
  bgSurface:    '#ffffff',
  bgElevated:   '#f3efe8',
  bgHover:      '#e3ded4',
  bgInput:      '#ffffff',
  border:       '#c3bcac',
  borderFocus:  '#6e675a',
  hairline:     '#d6cfc1',
  text:         '#191713',
  textDim:      '#5a554b',
  textMuted:    '#97907f',
  accent:       '#cc1122',
  accentDim:    '#a30e1c',
  accentSoft:   'rgba(204,17,34,0.09)',
  accentGlow:   'rgba(204,17,34,0.32)',
  success:      '#0f7a5f',
  warning:      '#b45309',
  info:         '#0e7490',
  grid:         '#d4cdbf',
  edgeLabelBg:  '#f3efe8',
  edgeColors: {
    confirmed:    { stroke: '#0d9488' },
    hypothetical: { stroke: '#9a958a', strokeDasharray: '6 4' },
    blocked:      { stroke: '#e11d48', strokeDasharray: '2 4' },
    interrupted:  { stroke: '#bdb9af', strokeDasharray: '11 5' },
  },
  types:        TYPES_LIGHT,
  fontDisplay:  FONT_DISPLAY,
  fontMono:     FONT_MONO,
  radius:       10,
  shadow:       '0 18px 50px -16px rgba(60,55,45,0.35)',
}

export function useTokens(): Tokens {
  const theme = useBoardStore((s) => s.theme)
  return theme === 'dark' ? DARK : LIGHT
}
