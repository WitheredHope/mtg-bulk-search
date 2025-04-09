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
): Promise<{ foundCards: CardData[], unfoundCards: string[] }> => {
  const foundCards: CardData[] = [];
  const unfoundCards: string[] = [];

  for (const cardName of cardNames) {
    try {
      // Parse quantity from card name (e.g., "Lightning Bolt x2" -> "Lightning Bolt" and 2)
      const quantityMatch = cardName.match(/x(\d+)$/);
      const baseCardName = quantityMatch ? cardName.slice(0, -quantityMatch[0].length).trim() : cardName;
      const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

      const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(baseCardName)}"`);
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const card = data.data[0];
        const printings: SetPrinting[] = [];
        const seenSets = new Set<string>();

        // Get all printings of the card
        const printingsResponse = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(baseCardName)}"&unique=prints`);
        const printingsData = await printingsResponse.json();

        if (printingsData.data) {
          for (const printing of printingsData.data) {
            // If uniqueSetsPerCard is true, only add each set once
            if (options.uniqueSetsPerCard) {
              if (!seenSets.has(printing.set)) {
                seenSets.add(printing.set);
                printings.push({
                  set: printing.set,
                  set_name: printing.set_name,
                  rarity: printing.rarity,
                  collector_number: printing.collector_number
                });
              }
            } else {
              // If uniqueSetsPerCard is false, add all printings
              printings.push({
                set: printing.set,
                set_name: printing.set_name,
                rarity: printing.rarity,
                collector_number: printing.collector_number
              });
            }
          }
        }

        foundCards.push({
          name: card.name,
          quantity: quantity,
          printings: printings,
          colors: card.colors || [],
          mana_cost: card.mana_cost || '',
          type_line: card.type_line || ''
        });
      } else {
        unfoundCards.push(cardName);
      }
    } catch (error) {
      console.error(`Error searching for card ${cardName}:`, error);
      unfoundCards.push(cardName);
    }
  }

  return { foundCards, unfoundCards };
}; 