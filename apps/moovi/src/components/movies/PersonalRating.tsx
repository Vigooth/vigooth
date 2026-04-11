import { cn } from '@vigooth/ui'

interface PersonalRatingProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

export function PersonalRating({ value, onChange, disabled }: PersonalRatingProps) {
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            disabled={disabled}
            className={cn(
              "size-6 border text-xs md:size-8 md:border-2 md:text-sm font-bold transition-colors",
              value !== null && n <= value
                ? "border-cpc-cyan-500 bg-cpc-cyan-500 text-black"
                : "border-cpc-green-900 text-cpc-green-900 hover:border-cpc-cyan-500 hover:text-cpc-cyan-500",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
