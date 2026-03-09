/// <reference types="vite/client" />

import 'twin.macro'
import { css as cssImport } from '@emotion/react'
import styledImport from '@emotion/styled'
import { TwStyle } from 'twin.macro'

declare module 'twin.macro' {
  const styled: typeof styledImport
  const css: typeof cssImport
}

declare module 'react' {
  interface DOMAttributes<T> {
    tw?: string
    css?: TwStyle | TwStyle[] | (TwStyle | false | undefined)[]
  }
}
