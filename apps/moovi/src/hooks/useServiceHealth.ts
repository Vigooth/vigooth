import { useQuery } from '@tanstack/react-query';
import { getServiceHealth } from '@/lib/api/health';
import type { HealthResponse } from '@/lib/api/health';

export function useServiceHealth() {
  return useQuery<HealthResponse>({
    queryKey: ['health', 'services'],
    queryFn: getServiceHealth,
    staleTime: 30 * 1000,
  });
}
