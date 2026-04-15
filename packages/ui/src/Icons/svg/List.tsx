import { forwardRef } from 'react'

export const List = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function List(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
)
