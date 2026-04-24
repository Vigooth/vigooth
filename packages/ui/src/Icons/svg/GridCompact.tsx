import { forwardRef } from "react";

export const GridCompact = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function GridCompact(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  },
);
