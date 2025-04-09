import { supabase } from '../config/supabase';

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

export const saveCardList = async (name: string, cards: { name: string; quantity: number }[]) => {
  const { data, error } = await supabase
    .from('card_lists')
    .insert([
      {
        name,
        cards,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving card list:', error);
    throw error;
  }
  return data;
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