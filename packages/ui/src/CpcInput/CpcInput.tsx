import { forwardRef, useState } from 'react'
import { cn } from '../utils/cn'

interface CpcInputProps {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  cursorBlink?: boolean
}

const CpcInput = forwardRef<HTMLInputElement, CpcInputProps>(
  ({ value, onChange, onEnter, placeholder = '', cursorBlink = true }, ref) => {
    const [focused, setFocused] = useState(false)

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onEnter) {
        onEnter()
      }
    }

    const showCursor = cursorBlink || focused

    return (
      <div className="relative inline-flex items-baseline">
        <span className="font-cpc">{value || <span className="invisible">{placeholder}</span>}</span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={cn(
            'absolute inset-0 bg-transparent border-none outline-none font-cpc w-full',
            value ? 'text-transparent' : 'text-cpc-green-900',
          )}
          style={{ caretColor: 'transparent' }}
        />
        <span className={cn('inline-block w-2 h-4 ml-0.5', showCursor ? 'cpc-cursor' : 'bg-transparent')} />
      </div>
    )
  },
)

CpcInput.displayName = 'CpcInput'

export { CpcInput }
