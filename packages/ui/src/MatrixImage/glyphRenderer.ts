import { MATRIX_FONT_STACK } from './charset';

export interface GlyphRendererOptions {
  /** Side of one glyph cell, in CSS pixels. Smaller = more detail, more cost. */
  cellSize: number;
  /** Glyph colour, `#rgb` or `#rrggbb`. */
  color: string;
  /** Glyph mutations per second, as a fraction of the whole grid. */
  cycleSpeed: number;
  /** Milliseconds for a full reveal (or a full un-reveal). */
  revealDuration: number;
  /**
   * Glyphs grouped by ink coverage, sparse tier first. A single-entry array
   * disables luminance shading and picks from that one pool at random.
   */
  ramp: readonly string[];
  /** Desaturated image opacity beneath the glyphs, 0..1. */
  underlay: number;
  /** How far to drain colour from the revealed photograph, 0..1. */
  desaturate: number;
  /** Tone curve on the sampled luminance. Below 1 lifts the midtones. */
  gamma: number;
  /** Skip glyph churn and shorten the reveal. */
  reducedMotion: boolean;
  /** `cover` crops the photograph to the frame, `contain` fits it whole. */
  fit: 'cover' | 'contain';
}

interface Cell {
  /** Index into the ramp — fixed by brightness, so tone survives the churn. */
  tier: number;
  /** Index into that tier's glyphs. */
  glyph: number;
  /** Tone-mapped luminance, 0..1 — drives glyph brightness. */
  lum: number;
  /** Position in the dissolve order, 0..1. */
  order: number;
}

/**
 * Width of the dissolve wavefront in `order` units. A wider band means more
 * cells are mid-crossfade at once — softer, mushier. Narrower reads as
 * discrete blocks flipping over.
 */
const REVEAL_BAND = 0.3;
/**
 * Quantisation of glyph alpha, so fillStyle strings can be precomputed. Enough
 * steps that shading reads as continuous rather than posterised.
 */
const ALPHA_BUCKETS = 24;
/** Floor on glyph opacity, so shadow detail stays visible instead of going black. */
const MIN_GLYPH_ALPHA = 0.18;
/** Render cap. Glyph churn past this is invisible; the reveal still reads fine. */
const TARGET_FPS = 30;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function parseColor(color: string): [number, number, number] {
  const hex = color.trim().replace('#', '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (full.length !== 6 || !/^[\da-f]{6}$/i.test(full)) return [0, 255, 65];
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function createLayer(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export interface GlyphRenderer {
  /** Adopt a decoded image. Rebuilds the grid on the next resize/frame. */
  setImage: (image: HTMLImageElement) => void;
  /** Match the backing store to a CSS size and device pixel ratio. */
  resize: (cssWidth: number, cssHeight: number, dpr: number) => void;
  /** Animate towards glyphs (false) or the photograph (true). */
  setRevealed: (revealed: boolean) => void;
  /** Run the loop. Idempotent. */
  start: () => void;
  /** Halt the loop, keeping the last frame on screen. */
  stop: () => void;
}

/**
 * Renders an image as a grid of Matrix glyphs and dissolves block-by-block to
 * the real pixels on demand.
 *
 * Per frame the work is: one black fill, one `fillText` per still-encoded cell,
 * one tiny `fillRect` per in-flight cell on a grid-sized mask, and two
 * full-canvas blits to punch the photograph through that mask. The mask trick
 * is what keeps this affordable — the alternative, one `drawImage` per cell,
 * costs an order of magnitude more on a poster-sized canvas.
 */
export function createGlyphRenderer(
  canvas: HTMLCanvasElement,
  options: GlyphRendererOptions,
): GlyphRenderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('MatrixImage: 2D canvas context unavailable');
  const ctx = maybeCtx;

  const [r, g, b] = parseColor(options.color);
  const glyphStyles = Array.from(
    { length: ALPHA_BUCKETS + 1 },
    (_, index) => `rgba(${r},${g},${b},${(index / ALPHA_BUCKETS).toFixed(3)})`,
  );

  /** Photograph scaled to cover the canvas, in device pixels. */
  let fitLayer: HTMLCanvasElement | null = null;
  /** Desaturated, contrast-lifted copy shown faintly under the glyphs. */
  let underLayer: HTMLCanvasElement | null = null;
  /** One pixel per cell; alpha carries each cell's reveal progress. */
  let maskLayer: HTMLCanvasElement | null = null;
  /** Photograph with the mask applied, ready to blit over the glyphs. */
  let revealLayer: HTMLCanvasElement | null = null;

  let image: HTMLImageElement | null = null;
  let cells: Cell[] = [];
  let cols = 0;
  let rows = 0;
  let cellPx = 0;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let dirty = true;

  let progress = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;
  let running = false;

  function buildGrid() {
    if (!image || width === 0 || height === 0) return;

    cellPx = Math.max(2, Math.round(options.cellSize * pixelRatio));
    cols = Math.max(1, Math.ceil(width / cellPx));
    rows = Math.max(1, Math.ceil(height / cellPx));

    fitLayer = createLayer(width, height);
    const fitCtx = fitLayer.getContext('2d');
    if (!fitCtx) return;

    // Centred either way: cover fills the frame and crops the overflow,
    // contain fits the whole photograph and leaves the margins empty.
    const scale =
      options.fit === 'contain'
        ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
        : Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    // Drain colour once, here, rather than filtering every frame. Everything
    // downstream — underlay and reveal alike — inherits it.
    if (options.desaturate > 0) {
      fitCtx.filter = `grayscale(${options.desaturate})`;
    }
    fitCtx.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );

    maskLayer = createLayer(cols, rows);
    revealLayer = createLayer(width, height);

    // A near-monochrome print of the photo, laid under the glyphs so the tonal
    // mass reads even in the gaps between characters. `ctx.filter` is the only
    // way to desaturate without touching pixels — reading them back would throw
    // on a cross-origin image. Where it is unsupported the underlay simply
    // stays in colour, which degrades gracefully.
    if (options.underlay > 0) {
      underLayer = createLayer(width, height);
      const underCtx = underLayer.getContext('2d');
      if (underCtx) {
        underCtx.filter = 'grayscale(1) contrast(1.25) brightness(1.05)';
        underCtx.drawImage(fitLayer, 0, 0);
      }
    } else {
      underLayer = null;
    }

    // Downsample the fitted image to exactly one pixel per cell: the browser's
    // box filter gives us each cell's average colour for free.
    const sample = createLayer(cols, rows);
    const sampleCtx = sample.getContext('2d');
    if (!sampleCtx) return;
    sampleCtx.drawImage(fitLayer, 0, 0, cols, rows);

    let pixels: Uint8ClampedArray;
    try {
      pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
    } catch {
      // Cross-origin image without CORS headers taints the canvas. Fall back to
      // a flat grid so the effect still runs, just without luminance shading.
      pixels = new Uint8ClampedArray(cols * rows * 4).fill(140);
    }

    const tierCount = options.ramp.length;
    cells = Array.from({ length: cols * rows }, (_, index) => {
      const offset = index * 4;
      const raw =
        (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) / 255;
      const lum = clamp01(raw ** options.gamma);
      const tier = Math.min(tierCount - 1, Math.floor(lum * tierCount));
      return {
        tier,
        glyph: Math.floor(Math.random() * options.ramp[tier].length),
        lum,
        order: Math.random(),
      };
    });

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `${cellPx}px ${MATRIX_FONT_STACK}`;
    dirty = false;
  }

  function cycleGlyphs(delta: number) {
    if (options.reducedMotion || cells.length === 0) return;
    const mutations = Math.ceil(cells.length * options.cycleSpeed * delta);
    for (let i = 0; i < mutations; i++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      // Re-pick inside the cell's own tier: the character changes, its weight
      // does not, so the image never wobbles.
      cell.glyph = Math.floor(Math.random() * options.ramp[cell.tier].length);
    }
  }

  function draw() {
    if (!maskLayer || !revealLayer || !fitLayer) return;
    const maskCtx = maskLayer.getContext('2d');
    const revealCtx = revealLayer.getContext('2d');
    if (!maskCtx || !revealCtx) return;

    const eased = easeInOutCubic(progress);
    // Overshoot the sweep by one band width so `progress === 1` leaves no cell
    // behind and `progress === 0` reveals none.
    const front = eased * (1 + REVEAL_BAND);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    maskCtx.clearRect(0, 0, cols, rows);

    if (underLayer) {
      // Fades out as the photograph arrives, so revealed areas are the real
      // pixels rather than the real pixels over a grey ghost of themselves.
      ctx.globalAlpha = options.underlay * (1 - eased);
      ctx.drawImage(underLayer, 0, 0);
      ctx.globalAlpha = 1;
    }

    const half = cellPx / 2;
    let glintCount = 0;

    for (let index = 0; index < cells.length; index++) {
      const cell = cells[index];
      const alpha = clamp01((front - cell.order) / REVEAL_BAND);
      const col = index % cols;
      const row = (index - col) / cols;

      if (alpha < 1) {
        // Keep a floor under the darkest cells: at zero they punch black holes
        // in the grid, and the eye reads holes as missing rather than as shadow.
        const brightness =
          (MIN_GLYPH_ALPHA + cell.lum * (1 - MIN_GLYPH_ALPHA)) * (1 - alpha);
        const bucket = Math.round(brightness * ALPHA_BUCKETS);
        if (bucket > 0) {
          ctx.fillStyle = glyphStyles[bucket];
          ctx.fillText(
            options.ramp[cell.tier][cell.glyph],
            col * cellPx + half,
            row * cellPx + half,
            cellPx,
          );
        }
      }

      if (alpha > 0) {
        maskCtx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        maskCtx.fillRect(col, row, 1, 1);
        // Cells crossing over flash: the decode "spark" that sells the effect.
        const glint = alpha * (1 - alpha) * 4;
        if (glint > 0.05) {
          ctx.fillStyle = `rgba(${r},${g},${b},${(glint * 0.55).toFixed(3)})`;
          ctx.fillRect(col * cellPx, row * cellPx, cellPx, cellPx);
          glintCount++;
        }
      }
    }

    revealCtx.clearRect(0, 0, width, height);
    revealCtx.globalCompositeOperation = 'source-over';
    revealCtx.drawImage(fitLayer, 0, 0);
    revealCtx.globalCompositeOperation = 'destination-in';
    // Nearest-neighbour upscale is the whole point: it keeps the mask blocky.
    revealCtx.imageSmoothingEnabled = false;
    revealCtx.drawImage(maskLayer, 0, 0, width, height);

    ctx.drawImage(revealLayer, 0, 0);

    // Nothing left in flight, and no churn to animate: the frame is now static.
    const settled = progress === target && glintCount === 0;
    if (settled && (target === 1 || options.reducedMotion)) stop();
  }

  function tick(time: number) {
    frame = requestAnimationFrame(tick);
    const delta = lastTime === 0 ? 0 : Math.min(0.25, (time - lastTime) / 1000);
    if (delta > 0 && delta < 1 / TARGET_FPS) return;
    lastTime = time;

    if (dirty) buildGrid();
    if (cells.length === 0) return;

    if (progress !== target) {
      const duration = options.reducedMotion ? 150 : options.revealDuration;
      const step = (delta * 1000) / Math.max(1, duration);
      progress = target > progress ? Math.min(target, progress + step) : Math.max(target, progress - step);
    }

    cycleGlyphs(delta);
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
  }

  return {
    setImage(next) {
      image = next;
      dirty = true;
      start();
    },
    resize(cssWidth, cssHeight, dpr) {
      const nextWidth = Math.max(1, Math.round(cssWidth * dpr));
      const nextHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      pixelRatio = dpr;
      canvas.width = width;
      canvas.height = height;
      dirty = true;
      start();
    },
    setRevealed(revealed) {
      target = revealed ? 1 : 0;
      if (progress !== target) start();
    },
    start,
    stop,
  };
}
