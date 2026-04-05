import { forwardRef } from 'react'

type Size = 'sm' | 'md' | 'lg'
type IconVariant = 'filled' | 'outlined'

type SvgComponent = React.FunctionComponent<
  React.SVGProps<SVGSVGElement> & { title?: string }
>

type VariantDef = {
  size: Size
  variant: IconVariant
  component: SvgComponent
}

type IconConfig = {
  default: { size: Size; variant: IconVariant }
  variants: VariantDef[]
}

type CreateIconProps = {
  size?: Size
  variant?: IconVariant
  className?: string
} & React.SVGProps<SVGSVGElement>

const SIZE_PX: Record<Size, number> = { sm: 16, md: 20, lg: 24 }

function resolve(
  config: IconConfig,
  size: Size,
  variant: IconVariant,
): VariantDef {
  const exact = config.variants.find(
    (v) => v.size === size && v.variant === variant,
  )
  if (exact) return exact

  const sameVariant = config.variants.find((v) => v.variant === variant)
  if (sameVariant) return sameVariant

  const def = config.variants.find(
    (v) =>
      v.size === config.default.size &&
      v.variant === config.default.variant,
  )
  if (!def)
    throw new Error(
      `[createIcon] Default variant not found in config for icon`,
    )
  return def
}

function createIcon(name: string, config: IconConfig) {
  const IconComponent = forwardRef<SVGSVGElement, CreateIconProps>(
    function IconComponent(
      { size = 'md', variant = 'outlined', className, ...svgProps },
      ref,
    ) {
      const resolved = resolve(config, size, variant)
      const Component = resolved.component
      const px = SIZE_PX[size]

      return (
        <Component
          ref={ref}
          width={px}
          height={px}
          className={className}
          aria-hidden="true"
          {...svgProps}
        />
      )
    },
  )

  IconComponent.displayName = `${name}Icon`

  return IconComponent
}

export { createIcon, resolve }
export type { CreateIconProps, IconConfig, VariantDef, Size, IconVariant }
