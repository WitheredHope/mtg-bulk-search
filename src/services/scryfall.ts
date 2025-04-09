interface CardData {
  name: string;
  printings: {
    set: string;
    set_name: string;
    rarity: string;
    collector_number: string;
  }[];
  colors: string[];
  mana_cost: string;
  type_line: string;
}

interface SearchResult {
  foundCards: CardData[];
  unfoundCards: string[];
}

export const searchCards = async (cardNames: string[]): Promise<SearchResult> => {
  const foundCards: CardData[] = [];
  const unfoundCards: string[] = [];
  
  for (const name of cardNames) {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=prints`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Get the first card to get the base card data
        const firstCard = data.data[0];
        
        // Collect all paper printings
        const printings = data.data
          .filter((card: any) => card.games?.includes('paper'))
          .map((card: any) => ({
            set: card.set,
            set_name: card.set_name,
            rarity: card.rarity,
            collector_number: card.collector_number
          }));

        foundCards.push({
          name: firstCard.name,
          printings,
          colors: firstCard.colors || [],
          mana_cost: firstCard.mana_cost,
          type_line: firstCard.type_line
        });
      } else {
        unfoundCards.push(name);
      }
    } catch (error) {
      unfoundCards.push(name);
    }
  }
  
  return { foundCards, unfoundCards };
}; 