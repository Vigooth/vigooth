import tw from 'twin.macro'

export type ColorType = 'green' | 'red' | 'cyan' | 'yellow' | 'magenta'

export const colorStyles = {
  green: { border: tw`border-cpc-green-500`, text: tw`text-cpc-green-500`, bg: tw`bg-cpc-green-500` },
  red: { border: tw`border-cpc-red-500`, text: tw`text-cpc-red-500`, bg: tw`bg-cpc-red-500` },
  cyan: { border: tw`border-cpc-cyan-500`, text: tw`text-cpc-cyan-500`, bg: tw`bg-cpc-cyan-500` },
  yellow: { border: tw`border-cpc-yellow-500`, text: tw`text-cpc-yellow-500`, bg: tw`bg-cpc-yellow-500` },
  magenta: { border: tw`border-cpc-magenta-500`, text: tw`text-cpc-magenta-500`, bg: tw`bg-cpc-magenta-500` },
}

export interface EntryFormData {
  name: string
  username: string
  password: string
  url: string
}
