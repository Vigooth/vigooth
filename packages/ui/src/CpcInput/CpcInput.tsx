import { forwardRef } from 'react'

interface CpcInputProps {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  placeholder?: string
}

const CpcInput = forwardRef<HTMLInputElement, CpcInputProps>(
  ({ value, onChange, onEnter, placeholder = '' }, ref) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onEnter) {
        onEnter()
      }
    }

    return (
      <div className="relative inline-flex items-baseline">
        <span className="font-cpc">{value}</span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="absolute inset-0 bg-transparent border-none outline-none font-cpc text-transparent w-full"
          style={{ caretColor: 'transparent' }}
        />
        <span className="inline-block w-2 h-4 ml-0.5 cpc-cursor" />
      </div>
    )
  },
)

CpcInput.displayName = 'CpcInput'

export { CpcInput }
