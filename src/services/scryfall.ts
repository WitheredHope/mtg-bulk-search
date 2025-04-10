interface SetPrinting {
  set: string;
  set_name: string;
  rarity: string;
  collector_number: string;
}

interface CardData {
  name: string;
  quantity: number;
  printings: SetPrinting[];
  colors: string[];
  mana_cost: string;
  type_line: string;
}

interface SearchOptions {
  uniqueSetsPerCard?: boolean;
}

interface SearchResult {
  foundCards: CardData[];
  unfoundCards: string[];
}

export const searchCards = async (
  cardNames: string[],
  options: SearchOptions = { uniqueSetsPerCard: true }
): Promise<SearchResult> => {
  const foundCards: CardData[] = [];
  const unfoundCards: string[] = [];

  for (const cardName of cardNames) {
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints`
      );
      const data = await response.json();
      if (data.object === 'error') {
        unfoundCards.push(cardName);
        continue;
      }

      if (data.data && data.data.length > 0) {
        const card = data.data[0];

        // Get all printings of the card
        const printingsResponse = await fetch(
          `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints`
        );
        const printingsData = await printingsResponse.json();

        // Extract colors from the card data
        const colors = card.colors || [];
        if (card.card_faces && card.card_faces.length > 0) {
          // For double-faced cards, combine colors from both faces
          const allColors = new Set<string>();
          card.card_faces.forEach((face: { colors?: string[] }) => {
            if (face.colors) {
              face.colors.forEach((color: string) => allColors.add(color));
            }
          });
          colors.push(...Array.from(allColors));
        }

        foundCards.push({
          name: card.name,
          quantity: 1, // Default quantity, will be updated by the component
          printings: printingsData.data.map((printing: any) => ({
            set: printing.set,
            set_name: printing.set_name,
            rarity: printing.rarity,
            collector_number: printing.collector_number
          })),
          colors,
          mana_cost: card.mana_cost || '',
          type_line: card.type_line || ''
        });
      } else {
        unfoundCards.push(cardName);
      }
    } catch (error) {
      unfoundCards.push(cardName);
    }
  }

  return { foundCards, unfoundCards };
}; 