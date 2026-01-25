import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Door, CpcLayout } from '@vigooth/ui'
import { animateFadeIn } from '@vigooth/styles'
import tw from 'twin.macro'

export function HomePreviewPage() {
  const navigate = useNavigate()
  const [isEntering, setIsEntering] = useState(false)

  const handleDoorOpen = () => {
    setIsEntering(true)
    setTimeout(() => {
      navigate('/home')
    }, 500)
  }

  return (
    <CpcLayout>
      <div
        css={[
          tw`p-2 h-full overflow-auto flex flex-col items-center justify-center transition-opacity duration-1000`,
          isEntering ? tw`opacity-0` : tw`opacity-100`,
          isEntering && animateFadeIn
        ]}
      >
        <div tw="text-center mb-8 border-b-2 border-cpc-green-500 pb-4">
          <div tw="text-cpc-yellow-500 text-2xl font-bold">WELCOME TO</div>
          <div tw="text-cpc-cyan-500 text-4xl font-bold mt-2">VIGOOTH SYSTEM</div>
          <div tw="text-cpc-green-500 text-sm mt-2">v1.0 - Amstrad CPC 6128</div>
        </div>

        <Door onOpen={handleDoorOpen} />

        <div tw="text-center mt-8 text-cpc-cyan-500 text-xs">
          <div>Copyright 2025 - Retro Computing Experience</div>
        </div>
      </div>
    </CpcLayout>
  )
}
