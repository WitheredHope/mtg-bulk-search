import { apiFetch } from './api';

export interface SetGroup {
  id: string;
  name: string;
  sets: string[];
}

export const getSetGroups = (): Promise<SetGroup[]> =>
  apiFetch<SetGroup[]>('/api/set-groups');

export const createSetGroup = (name: string, sets: string[] = []): Promise<SetGroup> =>
  apiFetch<SetGroup>('/api/set-groups', {
    method: 'POST',
    body: JSON.stringify({ name, sets }),
  });

export const updateSetGroup = (
  id: string,
  updates: Partial<Pick<SetGroup, 'name' | 'sets'>>
): Promise<SetGroup> =>
  apiFetch<SetGroup>(`/api/set-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteSetGroup = (id: string): Promise<{ ok: boolean }> =>
  apiFetch<{ ok: boolean }>(`/api/set-groups/${id}`, {
    method: 'DELETE',
  });
