import 'twin.macro'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search movies...' }: SearchBarProps) {
  return (
    <div tw="relative">
      <span tw="absolute left-3 top-1/2 -translate-y-1/2 text-cpc-cyan-500">&gt;</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        tw="w-full bg-transparent border-2 border-cpc-cyan-500 text-cpc-cyan-500 pl-8 pr-4 py-2 font-cpc outline-none focus:border-cpc-yellow-500 placeholder:text-cpc-green-900"
        autoFocus
      />
    </div>
  )
}
