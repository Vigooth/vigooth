import { forwardRef } from 'react';

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z';

export const StarOutlined = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function StarOutlined(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d={STAR_PATH}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  },
);

export const StarFilled = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function StarFilled(props, ref) {
    return (
      <svg ref={ref} viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d={STAR_PATH} />
      </svg>
    );
  },
);
