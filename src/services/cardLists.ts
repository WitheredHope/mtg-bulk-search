import { supabase } from './supabase';

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
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  if (listId) {
    // Update existing list
    const { error } = await supabase
      .from('card_lists')
      .update({
        name,
        cards,
        updated_at: new Date().toISOString()
      })
      .eq('id', listId)
      .eq('user_id', session.user.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    // Create new list
    const { error } = await supabase
      .from('card_lists')
      .insert({
        name,
        cards,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(error.message);
    }
  }
};

export const getCardLists = async () => {
  const { data, error } = await supabase
    .from('card_lists')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting card lists:', error);
    throw error;
  }
  return data;
};

export const deleteCardList = async (id: string) => {
  const { error } = await supabase
    .from('card_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('Error deleting card list:', error);
    throw error;
  }
}; 