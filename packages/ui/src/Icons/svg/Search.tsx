import { forwardRef } from "react";

export const Search = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function Search(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  },
);
