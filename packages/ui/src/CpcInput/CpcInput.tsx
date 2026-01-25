import { useState, useEffect, forwardRef } from 'react';
import tw from 'twin.macro'
import { cpcCursor } from '@vigooth/styles'

interface CpcInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  cursorColor?: string;
}

const CpcInput = forwardRef<HTMLInputElement, CpcInputProps>(({
  value,
  onChange,
  onEnter,
  placeholder = '',
  cursorColor = 'cpc-green-500'
}, ref) => {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530); // Authentic CPC cursor blink rate

    return () => clearInterval(interval);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  return (
    <div tw="relative inline-flex items-baseline">
      <span tw="font-cpc">{value}</span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        tw="absolute inset-0 bg-transparent border-none outline-none font-cpc text-transparent w-full"
        style={{ caretColor: 'transparent' }}
      />
      <span css={[tw`inline-block w-2 h-4 ml-0.5`, cpcCursor]} />
    </div>
  );
});

CpcInput.displayName = 'CpcInput';

export { CpcInput };
