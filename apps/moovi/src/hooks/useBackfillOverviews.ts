import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { backfillOverviews } from "@/lib/api/movies";
import { MOVIES_QUERY_KEY } from "@/hooks/useMoviesQuery";

export function useBackfillOverviews() {
  const queryClient = useQueryClient();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    backfillOverviews()
      .then((res) => {
        if (res.updated > 0) {
          queryClient.invalidateQueries({ queryKey: MOVIES_QUERY_KEY });
        }
      })
      .catch(() => {});
  }, [queryClient]);
}
