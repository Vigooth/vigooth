export type ColorType = 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'

export const VALID_COLORS: ColorType[] = ['green', 'red', 'cyan', 'yellow', 'magenta']

export function isValidColor(color: string | undefined): color is ColorType {
  return VALID_COLORS.includes(color as ColorType)
}
