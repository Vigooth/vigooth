import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { css } from '@emotion/react'
import tw from 'twin.macro'

type CpcColor = 'green' | 'cyan' | 'red' | 'yellow' | 'magenta' | 'blue' | 'orange'
type CpcVariant = 'outlined' | 'filled' | 'text'

interface CpcButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: CpcVariant
  color?: CpcColor
}

const colorMap = {
  green: { base: '#00FF00', dark: '#008000' },
  cyan: { base: '#00FFFF', dark: '#008080' },
  red: { base: '#FF0000', dark: '#800000' },
  yellow: { base: '#FFFF00', dark: '#808000' },
  magenta: { base: '#FF00FF', dark: '#800080' },
  blue: { base: '#0000FF', dark: '#000080' },
  orange: { base: '#FF8000', dark: '#804000' },
}

function getStyles(variant: CpcVariant, color: CpcColor) {
  const c = colorMap[color]

  const base = css`
    ${tw`inline-flex items-center px-3 py-1 text-xs font-cpc cursor-pointer transition-colors outline-none bg-transparent`}
    &:disabled {
      ${tw`opacity-40 cursor-not-allowed`}
    }
  `

  switch (variant) {
    case 'outlined':
      return css`
        ${base}
        border: 2px solid ${c.base};
        color: ${c.base};
        &:hover:not(:disabled) {
          background: ${c.base};
          color: black;
        }
      `
    case 'filled':
      return css`
        ${base}
        border: 2px solid ${c.base};
        background: ${c.base};
        color: black;
        &:hover:not(:disabled) {
          background: ${c.dark};
          border-color: ${c.dark};
        }
      `
    case 'text':
      return css`
        ${base}
        border: 2px solid transparent;
        color: ${c.base};
        &:hover:not(:disabled) {
          color: ${c.dark};
          background: ${c.base}1a;
        }
      `
  }
}

export function CpcButton({
  children,
  variant = 'outlined',
  color = 'green',
  ...props
}: CpcButtonProps) {
  return (
    <button css={getStyles(variant, color)} {...props}>
      {children}
    </button>
  )
}
