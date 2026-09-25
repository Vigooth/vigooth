import { forwardRef } from 'react';

export const Spinner = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function Spinner(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  },
);
