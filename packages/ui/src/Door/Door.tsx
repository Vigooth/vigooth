import { useState } from 'react'
import tw from 'twin.macro'
import { animateEnterDoor, animateZoomIn, animatePulse } from '@vigooth/styles'

interface DoorProps {
  onOpen?: () => void
}

export function Door({ onOpen }: DoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  const handleClick = () => {
    setIsOpen(true)

    // Start entering animation almost immediately for smooth transition
    setTimeout(() => {
      setIsEntering(true)
      onOpen?.()
    }, 300)
  }

  return (
    <div tw="flex flex-col items-center justify-center gap-8 p-8 relative">
      {/* Door frame and structure */}
      <div css={[tw`relative transition-all`, isEntering && animateEnterDoor]}>
        {/* Door frame */}
        <div tw="relative border-4 border-cpc-yellow-500 bg-cpc-grey-900 p-2" style={{ width: '200px', height: '300px' }}>
          {/* Dark space behind door (shows when door opens) */}
          {isOpen && (
            <div
              css={[tw`absolute inset-0 bg-black transition-opacity duration-300`, !isEntering && tw`opacity-100`, isEntering && animateZoomIn]}
            >
              <div tw="w-full h-full flex items-center justify-center">
                <div tw="text-cpc-green-500 text-center">
                  <div css={[tw`text-2xl mb-4`, animatePulse]}>···</div>
                  <div tw="text-sm">ENTERING...</div>
                </div>
              </div>
            </div>
          )}

          {/* Door itself */}
          <div
            css={[
              tw`relative w-full h-full border-4 border-cpc-green-500 bg-gradient-to-b from-cpc-grey-900 to-cpc-blue-900 cursor-pointer transition-all duration-500 origin-left`,
              isOpen ? tw`opacity-0` : tw`opacity-100 hover:brightness-110`
            ]}
            onClick={handleClick}
            style={{
              transformStyle: 'preserve-3d',
              transform: isOpen ? 'perspective(1000px) rotateY(-90deg)' : 'perspective(1000px) rotateY(0deg)',
            }}
          >
            {/* Door panels */}
            <div tw="absolute inset-4 border-2 border-cpc-cyan-500" />
            <div tw="absolute inset-4 top-1/2 border-t-2 border-cpc-cyan-500" />

            {/* Door handle */}
            <div tw="absolute right-4 top-1/2 -translate-y-1/2">
              <div tw="w-3 h-3 bg-cpc-yellow-500 border-2 border-cpc-yellow-500 rounded-full shadow-lg shadow-cpc-yellow-500/50" />
            </div>

            {/* Door texture lines */}
            <div tw="absolute inset-0 flex flex-col justify-around p-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} tw="h-px bg-cpc-green-500 opacity-30" />
              ))}
            </div>

            {/* Door shine effect */}
            <div tw="absolute inset-0 bg-gradient-to-r from-transparent via-cpc-green-500/5 to-transparent" />
          </div>
        </div>

        {/* Door step */}
        <div tw="w-full h-2 bg-cpc-yellow-500 border-2 border-cpc-yellow-500" />
      </div>

      {/* Instruction text */}
      {!isOpen && (
        <div css={[tw`text-center text-cpc-green-500`, animatePulse]}>
          <div tw="text-lg mb-2">CLICK THE DOOR TO ENTER</div>
          <div tw="text-sm text-cpc-cyan-500">▼</div>
        </div>
      )}
    </div>
  )
}
