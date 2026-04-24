type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "number") {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    }
  }

  // Deduplicate and let last occurrence win (simple tailwind-merge)
  const seen = new Map<string, number>();
  const all = classes.join(" ").split(/\s+/).filter(Boolean);

  for (let i = 0; i < all.length; i++) {
    seen.set(all[i], i);
  }

  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([cls]) => cls)
    .join(" ");
}
