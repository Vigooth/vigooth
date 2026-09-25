import { forwardRef } from 'react';

export const Plus = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function Plus(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  },
);
