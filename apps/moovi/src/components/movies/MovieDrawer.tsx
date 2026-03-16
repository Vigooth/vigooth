import { Drawer } from '@base-ui/react/drawer'
import { css } from '@emotion/react'
import tw from 'twin.macro'
import type { Movie } from '@/types/movie'
import { MovieDetails } from './MovieDetails'

interface MovieDrawerProps {
  movie: Movie | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

const backdropStyles = css`
  ${tw`fixed inset-0 bg-black z-40`}
  --backdrop-opacity: 0.7;
  opacity: calc(var(--backdrop-opacity) * (1 - var(--drawer-swipe-progress)));
  transition-property: opacity;
  transition-duration: 0.3s;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
  }

  &[data-swiping] {
    transition-duration: 0ms;
  }

  &[data-ending-style] {
    transition-duration: calc(var(--drawer-swipe-strength) * 400ms);
  }
`

const popupStyles = css`
  ${tw`fixed top-0 right-0 bottom-0 z-50 w-full md:w-[600px] lg:w-[700px] bg-cpc-grey-900 border-l-4 border-cpc-cyan-500 flex flex-col`}
  transform: translateX(var(--drawer-swipe-movement-x));
  transition-property: transform;
  transition-duration: 0.3s;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);

  &[data-starting-style],
  &[data-ending-style] {
    transform: translateX(100%);
  }

  &[data-swiping] {
    transition-duration: 0ms;
    user-select: none;
  }

  &[data-ending-style] {
    transition-duration: calc(var(--drawer-swipe-strength) * 400ms);
  }
`

export function MovieDrawer({ movie, open, onOpenChange, onDeleted }: MovieDrawerProps) {
  if (!movie) return null

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <Drawer.Portal>
        <Drawer.Backdrop css={backdropStyles} />
        <Drawer.Viewport>
          <Drawer.Popup css={popupStyles}>
            {/* Close button */}
            <div tw="absolute top-3 right-3 z-20">
              <Drawer.Close tw="border-2 border-cpc-green-500 text-cpc-green-500 px-3 py-1 text-xs hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors cursor-pointer">
                X
              </Drawer.Close>
            </div>

            <Drawer.Title tw="sr-only">{movie.title}</Drawer.Title>
            <Drawer.Description tw="sr-only">{movie.title} details</Drawer.Description>

            <Drawer.Content tw="flex-1 overflow-y-auto" key={movie.id}>
              <MovieDetails
                tmdbId={movie.tmdb_id}
                onDeleted={() => {
                  onOpenChange(false)
                  onDeleted?.()
                }}
              />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
