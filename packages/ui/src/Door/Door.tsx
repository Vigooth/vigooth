import { useState } from 'react'
import { cn } from '../utils/cn'

import type { ReactNode } from 'react'

interface DoorProps {
  onOpen?: () => void
  showLock?: boolean
  icon?: ReactNode
}

export function Door({ onOpen, showLock, icon }: DoorProps) {
  const [phase, setPhase] = useState<'idle' | 'opening'>('idle')

  const handleClick = () => {
    if (phase !== 'idle') return
    setPhase('opening')
    setTimeout(() => onOpen?.(), 700)
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-8 relative">
      <div className="relative">
        {/* Door frame */}
        <div className="relative border-4 border-cpc-yellow-500 p-2 overflow-hidden" style={{ width: '200px', height: '300px', background: '#0a0a0a' }}>
          {/* Room behind door */}
          <div className="absolute inset-0 flex items-center justify-center">
            {phase !== 'idle' && (
              <div className="text-cpc-green-500 text-center">
                <div className="text-2xl mb-4 animate-pulse-cpc">···</div>
                <div className="text-sm">ENTERING...</div>
              </div>
            )}
          </div>

          {/* Door panel */}
          <div
            className={cn(
              'relative w-full h-full border-4 border-cpc-green-500 bg-gradient-to-b from-cpc-grey-900 to-cpc-blue-900 cursor-pointer origin-left',
              phase === 'idle' && 'hover:brightness-110 transition-all duration-300',
              phase !== 'idle' && 'door-swing',
            )}
            onClick={handleClick}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Door panels */}
            <div className="absolute inset-4 border-2 border-cpc-cyan-500" />
            <div className="absolute inset-4 top-1/2 border-t-2 border-cpc-cyan-500" />

            {/* Door handle */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 bg-cpc-yellow-500 border-2 border-cpc-yellow-500 rounded-full shadow-lg shadow-cpc-yellow-500/50" />
            </div>

            {/* Door icon */}
            {(showLock || icon) && (
              <div className="absolute inset-0 flex items-center justify-center">
                {showLock ? (
                  <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 22V16C10 9.4 14.5 4 20 4C25.5 4 30 9.4 30 16V22" stroke="#00FF00" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <rect x="4" y="22" width="32" height="26" rx="2" fill="#1a1a1a" stroke="#00FF00" strokeWidth="2.5" />
                    <circle cx="20" cy="33" r="4" fill="#00FF00" />
                    <rect x="18.5" y="36" width="3" height="6" rx="1" fill="#00FF00" />
                  </svg>
                ) : icon}
              </div>
            )}

            {/* Door texture lines */}
            <div className="absolute inset-0 flex flex-col justify-around p-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-px bg-cpc-green-500 opacity-30" />
              ))}
            </div>

            {/* Door shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cpc-green-500/5 to-transparent" />
          </div>
        </div>

        {/* Door step */}
        <div className="w-full h-2 bg-cpc-yellow-500 border-2 border-cpc-yellow-500" />
      </div>
    </div>
  )
}
