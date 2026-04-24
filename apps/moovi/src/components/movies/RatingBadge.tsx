import { getRatingColor } from "@/utils/ratings";

interface RatingBadgeProps {
  label: string;
  value: number | null;
  max: number;
  suffix?: string;
}

export function RatingBadge({ label, value, max, suffix = "" }: RatingBadgeProps) {
  if (value === null || value === undefined) return null;

  const color = getRatingColor(value, max);

  return (
    <div className="flex items-center gap-1">
      <span className="text-cpc-green-900 text-xs uppercase">{label}</span>
      <span className="text-xs font-bold px-1 border" style={{ color, borderColor: color }}>
        {value}
        {suffix}
      </span>
    </div>
  );
}
