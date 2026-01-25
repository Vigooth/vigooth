import { useState, useEffect, useRef } from 'react';
import tw from 'twin.macro'
import { cpcCursor } from '@vigooth/styles'

interface TerminalProps {
  onCommand?: (command: string) => void;
  prompt?: string;
}

export function Terminal({ onCommand, prompt = 'READY' }: TerminalProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'Amstrad CPC 6128 64K Microcomputer (v3)',
    'Copyright 1985 Amstrad Consumer Electronics plc',
    'and Locomotive Software Ltd.',
    'BASIC 1.1',
    '',
    'READY'
  ]);
  const [showCursor, setShowCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      const newHistory = [...history, currentInput];
      setHistory(newHistory);
      onCommand?.(currentInput);
      setCurrentInput('');

      // Simulate response
      setTimeout(() => {
        setHistory(prev => [...prev, 'OK', '', prompt]);
      }, 100);
    }
  };

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      tw="bg-cpc-grey-900 text-cpc-green-500 font-cpc text-sm p-4 min-h-screen cursor-text overflow-hidden relative border border-cpc-magenta-900"
      onClick={handleClick}
    >
      <div tw="whitespace-pre-wrap">
        {history.map((line, index) => (
          <div key={index} tw="leading-tight">
            {line}
          </div>
        ))}
        <div tw="flex items-baseline leading-tight relative">
          <span tw="text-cpc-green-500 mr-1">&gt;</span>
          <span tw="font-cpc text-cpc-green-500">{currentInput}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onSubmit={handleSubmit}
            tw="absolute opacity-0 bg-transparent border-none outline-none font-cpc w-full"
            style={{ caretColor: 'transparent' }}
          />
          <span css={[tw`inline-block w-2 h-4 ml-1`, cpcCursor]} />
        </div>
      </div>

      {/* Hidden form for Enter key handling */}
      <form onSubmit={handleSubmit} tw="hidden">
        <button type="submit" />
      </form>
    </div>
  );
}
