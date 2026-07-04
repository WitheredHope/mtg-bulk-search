import { apiFetch } from './api';

export interface CardList {
  id: string;
  name: string;
  cards: {
    name: string;
    quantity: number;
  }[];
  created_at: string;
  updated_at: string;
}

export const saveCardList = async (
  name: string,
  cards: { name: string; quantity: number }[],
  listId?: string
): Promise<void> => {
  if (listId) {
    await apiFetch(`/api/lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, cards }),
    });
  } else {
    await apiFetch('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name, cards }),
    });
  }
};

export const getCardLists = async (): Promise<CardList[]> => {
  return apiFetch<CardList[]>('/api/lists');
};

export const deleteCardList = async (id: string): Promise<void> => {
  await apiFetch(`/api/lists/${id}`, { method: 'DELETE' });
};
