import { useQuery } from "@tanstack/react-query";
import { fetchOwnedGames } from "@/lib/api/steam";
import { useAuth } from "@/app/providers";

export function useOwnedGames(steamId?: string) {
  const { user } = useAuth();
  const id = steamId || user?.steamId || "";

  return useQuery({
    queryKey: ["ownedGames", id],
    queryFn: () => fetchOwnedGames(id),
    enabled: !!id,
    select: (data) => data.response,
  });
}
