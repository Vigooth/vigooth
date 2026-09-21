import { useQuery } from '@tanstack/react-query';
import { getRecommendationModel } from '@/lib/api/recommendations';

/** Name of the LLM behind "generate IA", or undefined while loading or if the API has none. */
export function useRecommendationModel(): string | undefined {
  const { data } = useQuery({
    queryKey: ['recommendations', 'model'],
    queryFn: getRecommendationModel,
    staleTime: Infinity,
    retry: false,
  });
  return data?.model;
}
