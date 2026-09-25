import { useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
}

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // A callback ref, so the observer follows the sentinel when it remounts.
  const [sentinel, sentinelRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return { scrollRef, sentinelRef };
}
