import tw from 'twin.macro'

interface PersonalRatingProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

export function PersonalRating({ value, onChange, disabled }: PersonalRatingProps) {
  return (
    <div>
      <div tw="flex gap-1 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            disabled={disabled}
            css={[
              tw`size-6 border text-xs md:(size-8 border-2 text-sm) font-bold transition-colors`,
              value !== null && n <= value
                ? tw`border-cpc-cyan-500 bg-cpc-cyan-500 text-black`
                : tw`border-cpc-green-900 text-cpc-green-900 hover:border-cpc-cyan-500 hover:text-cpc-cyan-500`,
              disabled && tw`opacity-50 cursor-not-allowed`,
            ]}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
