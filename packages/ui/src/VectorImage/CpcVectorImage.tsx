import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/cn';
// Constants module, so this does not pull the glyph component into the bundle.
import { MATRIX_GREEN } from '../MatrixImage/charset';
import { buildRamp } from './palette';
import { sampleLuminance, traceBands, type Band } from './traceContours';

export type VectorImageStatus = 'loading' | 'ready' | 'error';

export interface CpcVectorImageProps {
  /** Image URL, blob URL or data URL. Cross-origin sources need CORS headers. */
  src: string;
  /** Describes the photograph for assistive tech. */
  alt: string;
  /** Number of intensity bands. 4–6 reads as screen-print; past ~8 it muddies. */
  levels?: number;
  /**
   * Longest side of the luminance grid the trace runs on. This is the detail
   * dial: 80 is poster-like, 200 catches fine structure at a real cost in path
   * data. Tracing happens once per image, not per resize.
   */
  resolution?: number;
  /** Douglas-Peucker tolerance in grid units. Higher = fewer, straighter points. */
  simplify?: number;
  /** Chaikin rounding passes. 0 keeps the stair-steps, 2 is generously curved. */
  smoothing?: number;
  /** Tone curve on the normalised luminance. Below 1 lifts the midtones. */
  gamma?: number;
  /** Ink colour the band ramp is built from, `#rgb` or `#rrggbb`. */
  color?: string;
  /** Milliseconds for the bands to dissolve into the photograph. */
  revealDuration?: number;
  /** Force the reveal state. Omit to drive it from hover, focus and tap. */
  revealed?: boolean;
  className?: string;
}

/**
 * Renders a photograph as stacked vector intensity bands — a screen-print of
 * itself — that dissolve into the real image on hover, focus or tap.
 *
 * Unlike the glyph renderer, this holds no animation loop: the artwork is a
 * handful of real `<path>` elements, so it stays crisp at any zoom and the
 * reveal is a plain CSS opacity transition the compositor handles on its own.
 */
export function CpcVectorImage({
  src,
  alt,
  levels = 5,
  resolution = 120,
  simplify = 0.6,
  smoothing = 1,
  gamma = 0.9,
  color = MATRIX_GREEN,
  revealDuration = 900,
  revealed,
  className,
}: CpcVectorImageProps) {
  const [bands, setBands] = useState<Band[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState<VectorImageStatus>('loading');
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useRef(false);

  const isControlled = revealed !== undefined;
  const isRevealed = isControlled ? revealed : hovered;

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setBands([]);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';

    const handleLoad = () => {
      if (cancelled) return;
      const field = sampleLuminance(image, resolution);
      if (!field) {
        setStatus('error');
        return;
      }
      setSize({ width: field.width, height: field.height });
      setBands(traceBands(field, { levels, simplify, smoothing, gamma }));
      setStatus('ready');
    };

    image.addEventListener('load', handleLoad);
    image.addEventListener('error', () => {
      if (!cancelled) setStatus('error');
    });
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, levels, resolution, simplify, smoothing, gamma]);

  // One shade per band, plus the backdrop the darkest band sits on.
  const ramp = useMemo(() => buildRamp(color, bands.length + 1), [color, bands.length]);

  const handlePointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') setHovered(true);
  };

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') setHovered(false);
  };

  const handleToggle = () => {
    setHovered((previous) => !previous);
  };

  /** Touch has no hover; a tap toggles instead. Mouse clicks must not, or a
   * click inside an already-revealed image would flip it back. */
  const handlePointerUp = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch') handleToggle();
  };

  const handleFocus = () => {
    setHovered(true);
  };

  const handleBlur = () => {
    setHovered(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const duration = reducedMotion.current ? 0 : revealDuration;
  /**
   * Bands leave brightest-first, each a beat behind the last, so the photograph
   * emerges out of the highlights instead of the whole print blinking off. The
   * stagger eats half the budget; the rest is the fade itself.
   */
  const stagger = duration * 0.5;
  const layerCount = bands.length + 1;

  return (
    <div
      className={cn('relative overflow-hidden bg-black select-none', className)}
      onPointerEnter={isControlled ? undefined : handlePointerEnter}
      onPointerLeave={isControlled ? undefined : handlePointerLeave}
      onPointerUp={isControlled ? undefined : handlePointerUp}
      onFocus={isControlled ? undefined : handleFocus}
      onBlur={isControlled ? undefined : handleBlur}
      onKeyDown={isControlled ? undefined : handleKeyDown}
      tabIndex={isControlled ? undefined : 0}
      role="img"
      aria-label={alt}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: isRevealed ? 1 : 0,
          transition: `opacity ${duration}ms ease-out`,
        }}
      />

      {status === 'ready' && size.width > 0 && (
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* Backdrop for the darkest band, sized to the grid so it cannot
              leave a seam at the edges. */}
          <rect
            width={size.width}
            height={size.height}
            fill={ramp[0]}
            style={{
              opacity: isRevealed ? 0 : 1,
              transition: `opacity ${duration - stagger}ms ease-out`,
              transitionDelay: `${isRevealed ? stagger : 0}ms`,
            }}
          />
          {bands.map((band, index) => {
            // Brightest band (last) leaves first, so invert the index.
            const delay = ((layerCount - 1 - (index + 1)) / layerCount) * stagger;
            return (
              <path
                key={band.threshold}
                d={band.d}
                fill={ramp[index + 1]}
                fillRule="nonzero"
                style={{
                  opacity: isRevealed ? 0 : 1,
                  transition: `opacity ${duration - stagger}ms ease-out`,
                  transitionDelay: `${isRevealed ? delay : 0}ms`,
                }}
              />
            );
          })}
        </svg>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center font-mono text-xs text-cpc-red-500">
          SIGNAL LOST
        </div>
      )}
    </div>
  );
}
