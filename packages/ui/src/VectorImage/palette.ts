function parseHex(color: string): [number, number, number] {
  const hex = color.trim().replace('#', '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (full.length !== 6 || !/^[\da-f]{6}$/i.test(full)) return [0, 255, 65];
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * A ramp of `steps` shades from a deep tint of `color` up to `color` itself.
 *
 * The darkest step is a dimmed version of the hue rather than pure black, so the
 * shadows read as part of the same ink instead of as holes in the artwork.
 */
export function buildRamp(color: string, steps: number): string[] {
  const [r, g, b] = parseHex(color);
  const floor = 0.08;
  return Array.from({ length: steps }, (_, index) => {
    const t = steps === 1 ? 1 : index / (steps - 1);
    const level = floor + (1 - floor) * t;
    const channel = (value: number) => Math.round(value * level);
    return `rgb(${channel(r)},${channel(g)},${channel(b)})`;
  });
}
