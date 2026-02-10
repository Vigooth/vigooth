import { useState, useRef, useEffect } from 'react'
import { CpcLayout, AppMenu, Navigation, CpcInput } from '@vigooth/ui'
import { getAppsConfig, apps, getAppUrl } from '@vigooth/config'
import 'twin.macro'

export function HomePage() {
  const appsConfig = getAppsConfig('portal')
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<string[]>([
    'Amstrad CPC 6128 - VIGOOTH OS',
    'Ready',
    ''
  ])
    const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCommand = () => {
    const cmd = command.trim().toUpperCase()
    setHistory(prev => [...prev, `>${command}`])
    setCommand('')
    
    // Parse RUN "APP" or just APP
    const runMatch = cmd.match(/^RUN\s*"?([^"]+)"?$/)
    const appName = runMatch ? runMatch[1] : cmd

    // CAT command - list available disks
    if (cmd === 'CAT' || cmd === 'DIR') {
      const diskList = apps
        .filter(a => a.id !== 'portal')
        .map(a => `  ${a.name}.BAS`)
        .join('\n')
      setHistory(prev => [...prev, 'Drive A:', diskList, '', 'Ready', ''])
      return
    }

    // HELP command
    if (cmd === 'HELP') {
      setHistory(prev => [...prev,
        'Commands:',
        '  CAT         - List available programs',
        '  RUN "name"  - Run a program',
        '  HELP        - Show this help',
        '',
        'Ready',
        ''
      ])
      return
    }

    // Find app by name
    const app = apps.find(a =>
      a.name === appName ||
      a.id.toUpperCase() === appName ||
      a.name.replace('-', '') === appName.replace('-', '')
    )

    if (app && app.id !== 'portal') {
      setHistory(prev => [...prev, `Loading ${app.name}...`])
      setTimeout(() => {
        window.location.href = getAppUrl(app.id)
      }, 500)
    } else if (cmd) {
      setHistory(prev => [...prev, `Syntax error`, '', 'Ready', ''])
          }
  }

  return (
    <CpcLayout>
      <div tw="h-full overflow-auto flex flex-col">
        <Navigation />

        <div tw="text-center py-4 border-b-2 border-cpc-green-500">
          <div tw="text-cpc-yellow-500 text-2xl font-bold">VIGOOTH SYSTEM</div>
          <div tw="text-cpc-cyan-500 text-sm mt-1">Type CAT to list programs, RUN "name" to launch</div>
        </div>

        {/* Terminal */}
        <div
          tw="flex-1 p-4 font-mono text-sm cursor-text text-left"
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((line, i) => (
            <div key={i} tw="text-cpc-green-500 leading-relaxed whitespace-pre">{line}</div>
          ))}

          <div tw="flex items-baseline">
            <span tw="text-cpc-green-500 mr-1">&gt;</span>
            <CpcInput
              ref={inputRef}
              value={command}
              onChange={setCommand}
              onEnter={handleCommand}
            />
          </div>
        </div>

        {/* Quick access */}
        <div tw="border-t-2 border-cpc-green-500">
          <div tw="text-cpc-green-900 text-xs px-4 py-2">Quick access:</div>
          <AppMenu apps={appsConfig} />
        </div>

        <div tw="text-center py-2 border-t-2 border-cpc-green-500 text-cpc-green-900 text-xs">
          Copyright 2025 - Retro Computing Experience
        </div>
      </div>
    </CpcLayout>
  )
}
