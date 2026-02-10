import { useState, useRef } from 'react'
import tw from 'twin.macro'
import { useTranslation } from 'react-i18next'
import { commands, CommandContext } from './commands'

interface TerminalProps {
  context: CommandContext
}

interface HistoryEntry {
  command: string
  output: string
}

const parseCommandArgs = (input: string): string[] => {
  const args: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current) {
    args.push(current)
  }

  return args
}

export function Terminal({ context }: TerminalProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const focusInput = () => inputRef.current?.focus()

  const handleCommand = async (command: string) => {
    const cmd = command.trim()
    if (!cmd) return

    const parts = parseCommandArgs(cmd.toUpperCase())
    const commandName = parts[0]
    const args = parts.slice(1)

    let output: string

    const commandFn = commands[commandName]
    if (commandFn) {
      const result = await commandFn(args, context, t)
      output = result.output
    } else {
      output = t('terminal.errors.unknownCommand', { command: commandName })
    }

    setHistory(prev => [...prev, { command: cmd, output }])
    setInput('')
    setHistoryIndex(-1)
  }

  const navigateToPreviousCommand = () => {
    if (history.length === 0) return
    const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
    setHistoryIndex(newIndex)
    setInput(history[newIndex].command)
  }

  const navigateToNextCommand = () => {
    if (historyIndex === -1) return
    const newIndex = historyIndex + 1
    if (newIndex >= history.length) {
      setHistoryIndex(-1)
      setInput('')
    } else {
      setHistoryIndex(newIndex)
      setInput(history[newIndex].command)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigateToPreviousCommand()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigateToNextCommand()
    }
  }

  const prompt = context.currentFolder ? `${context.currentFolder.name}>` : 'ROOT>'

  return (
    <div tw="border-t-2 border-cpc-green-500 p-3 cursor-text" onClick={focusInput}>
      {/* History */}
      {history.length > 0 && (
        <div tw="max-h-32 overflow-y-auto mb-2 text-xs font-mono">
          {history.slice(-5).map((entry, i) => (
            <div key={i} tw="mb-1">
              <div tw="text-cpc-yellow-500">&gt; {entry.command}</div>
              <div tw="text-cpc-green-500 whitespace-pre-wrap pl-2">{entry.output}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div tw="flex items-center gap-2">
        <span tw="text-cpc-yellow-500 text-sm font-mono">{prompt}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          tw="flex-1 bg-transparent text-cpc-green-500 text-sm font-mono outline-none"
          placeholder={t('terminal.placeholder')}
          autoComplete="off"
        />
      </div>
    </div>
  )
}
