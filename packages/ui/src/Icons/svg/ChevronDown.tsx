import { forwardRef } from 'react'

export const ChevronDown = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function ChevronDown(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
)
