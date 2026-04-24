import { Drawer } from '@base-ui/react/drawer';
import type { Movie } from '@/types/movie';
import { MovieDetails } from './MovieDetails';

interface MovieDrawerProps {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function MovieDrawer({ movie, open, onOpenChange, onDeleted }: MovieDrawerProps) {
  if (!movie) return null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <Drawer.Portal>
        <Drawer.Backdrop className="moovi-drawer-backdrop" />
        <Drawer.Viewport>
          <Drawer.Popup className="moovi-drawer-popup md:w-[600px] lg:w-[700px]">
            {/* Close button */}
            <div className="absolute top-3 right-3 z-20">
              <Drawer.Close className="border-2 border-cpc-green-500 text-cpc-green-500 px-3 py-1 text-xs hover:bg-cpc-green-500 hover:text-cpc-grey-900 transition-colors cursor-pointer">
                X
              </Drawer.Close>
            </div>

            <Drawer.Title className="sr-only">{movie.title}</Drawer.Title>
            <Drawer.Description className="sr-only">{movie.title} details</Drawer.Description>

            <Drawer.Content className="flex-1 overflow-y-auto" key={movie.id}>
              <MovieDetails
                tmdbId={movie.tmdb_id}
                onDeleted={() => {
                  onOpenChange(false);
                  onDeleted?.();
                }}
              />
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
