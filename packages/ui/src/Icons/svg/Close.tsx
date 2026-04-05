import { forwardRef } from 'react'

export const Close = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function Close(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
)
