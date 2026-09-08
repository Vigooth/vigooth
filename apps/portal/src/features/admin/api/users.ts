import { request } from '@/lib/api/client';
import type { AdminUser } from '../types/user';

interface UsersResponse {
  users: AdminUser[];
}

export function fetchUsers(): Promise<AdminUser[]> {
  return request<UsersResponse>('/api/admin/users').then((response) => response.users);
}
