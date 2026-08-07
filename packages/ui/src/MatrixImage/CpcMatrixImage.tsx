import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { MATRIX_CHARSET, MATRIX_GREEN, MATRIX_RAMP } from './charset';
import { createGlyphRenderer, type GlyphRenderer } from './glyphRenderer';

export type MatrixImageStatus = 'loading' | 'ready' | 'error';

export interface CpcMatrixImageProps {
  /** Image URL, blob URL or data URL. Cross-origin sources need CORS headers. */
  src: string;
  /** Describes the photograph for assistive tech. */
  alt: string;
  /** Side of one glyph cell in CSS pixels. 8–10 for portraits, 14–18 for thumbnails. */
  cellSize?: number;
  /** Glyph colour, `#rgb` or `#rrggbb`. */
  color?: string;
  /** Milliseconds for a full dissolve. */
  revealDuration?: number;
  /** Glyph mutations per second as a fraction of the grid. 0 freezes the churn. */
  cycleSpeed?: number;
  /**
   * Opacity of the desaturated photograph laid under the glyphs, 0..1. Raise it
   * to make the subject read at a glance; drop it to 0 for glyphs alone.
   */
  underlay?: number;
  /**
   * How far to drain colour from the revealed photograph, 0..1. Left at 0 the
   * reveal lands in full colour, which is the loudest payoff; at 1 the whole
   * component stays monochrome from glyphs to photograph.
   */
  desaturate?: number;
  /**
   * Tone curve on the sampled brightness. Below 1 lifts the midtones, which
   * pulls detail out of dark photographs; above 1 deepens the contrast.
   */
  gamma?: number;
  /**
   * Shade the image by picking glyphs from brightness-matched tiers. Turning
   * this off picks at random, which flattens the photo to a uniform texture.
   */
  shaded?: boolean;
  /** Override the glyph pool. Only used when `shaded` is false. */
  charset?: string;
  /**
   * How the photograph fills the box. `cover` crops it, `contain` keeps it
   * whole and lets the glyph grid run on past its edges.
   */
  fit?: 'cover' | 'contain';
  /**
   * Force the reveal state. Omit to let the component drive it from
   * hover, focus and tap.
   */
  revealed?: boolean;
  className?: string;
}

/**
 * Renders a photograph as Matrix code rain, dissolving block-by-block to the
 * real image on hover, focus or tap.
 *
 * The element is focusable and reveals on keyboard focus, so the photograph is
 * reachable without a pointer. On coarse pointers, where there is no hover, a
 * tap toggles it.
 */
export function CpcMatrixImage({
  src,
  alt,
  cellSize = 10,
  color = MATRIX_GREEN,
  revealDuration = 1100,
  cycleSpeed = 6,
  underlay = 0.3,
  desaturate = 0,
  gamma = 0.75,
  shaded = true,
  charset = MATRIX_CHARSET,
  fit = 'cover',
  revealed,
  className,
}: CpcMatrixImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GlyphRenderer | null>(null);
  const [status, setStatus] = useState<MatrixImageStatus>('loading');
  const [hovered, setHovered] = useState(false);

  const isControlled = revealed !== undefined;
  const isRevealed = isControlled ? revealed : hovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A one-tier ramp is exactly the unshaded behaviour, so the renderer needs
    // no branch of its own.
    const ramp = shaded ? MATRIX_RAMP : [charset];

    let renderer: GlyphRenderer;
    try {
      renderer = createGlyphRenderer(canvas, {
        cellSize,
        color,
        cycleSpeed,
        revealDuration,
        ramp,
        underlay,
        desaturate,
        gamma,
        reducedMotion,
        fit,
      });
    } catch {
      setStatus('error');
      return;
    }
    rendererRef.current = renderer;
    setStatus('loading');

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        renderer.resize(width, height, window.devicePixelRatio || 1);
      }
    });
    resizeObserver.observe(container);

    // Off-screen instances stop burning frames — the difference between one
    // of these and a grid of eighty of them.
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        renderer.start();
      } else {
        renderer.stop();
      }
    });
    intersectionObserver.observe(container);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      renderer.setImage(image);
      setStatus('ready');
    });
    image.addEventListener('error', () => setStatus('error'));
    image.src = src;

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderer.stop();
      rendererRef.current = null;
    };
  }, [
    src,
    cellSize,
    color,
    cycleSpeed,
    revealDuration,
    charset,
    underlay,
    desaturate,
    gamma,
    shaded,
    fit,
  ]);

  useEffect(() => {
    rendererRef.current?.setRevealed(isRevealed);
  }, [isRevealed]);

  const handlePointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') setHovered(true);
  };

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') setHovered(false);
  };

  const handleToggle = () => {
    setHovered((previous) => !previous);
  };

  /**
   * Touch has no hover, so a tap toggles instead. Guarded on pointerType:
   * without it, a mouse click on an already-hovered image would toggle the
   * reveal back off while the cursor is still inside.
   */
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

  return (
    <div
      ref={containerRef}
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
      <canvas ref={canvasRef} className="block h-full w-full" />
      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center font-mono text-xs text-cpc-red-500">
          SIGNAL LOST
        </div>
      )}
    </div>
  );
}
