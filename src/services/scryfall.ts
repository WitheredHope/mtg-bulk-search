interface SetPrinting {
  set: string;
  set_name: string;
  rarity: string;
  collector_number: string;
  set_type: string;
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

export const isDigitalOnlySet = async (setCode: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.scryfall.com/sets/${setCode}`);
    const data = await response.json();
    
    // Check if the set is digital-only based on Scryfall's data
    return data.digital || data.set_type === 'digital' || data.parent_set_code === 'VMA';
  } catch (error) {
    console.error('Error checking set type:', error);
    return false;
  }
};

export const searchCards = async (
  cardNames: string[],
  options: SearchOptions = { uniqueSetsPerCard: true }
): Promise<SearchResult> => {
  const foundCards: CardData[] = [];
  const unfoundCards: string[] = [];
  const foundCardNames = new Set<string>();

  console.log('Starting search for cards:', cardNames);

  // First try batch search for efficiency
  const batchSize = 5;
  for (let i = 0; i < cardNames.length; i += batchSize) {
    const batch = cardNames.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1}:`, batch);
    
    try {
      // Make a single API call for the batch of cards
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${batch.map(name => `!"${name}"`).join(' OR ')}&unique=prints`
      );
      
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Rate limited, waiting ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter || '1') * 1000)));
        i -= batchSize;
        continue;
      }

      const data = await response.json();
      if (data.object === 'error') {
        console.log('Batch search error:', data);
        unfoundCards.push(...batch);
        continue;
      }

      if (data.data && data.data.length > 0) {
        console.log(`Found ${data.data.length} cards in batch search`);
        // Group cards by name for easier processing
        const cardsByName = new Map<string, any>();
        data.data.forEach((card: any) => {
          const name = card.name.toLowerCase();
          if (!cardsByName.has(name)) {
            cardsByName.set(name, card);
          }
        });

        // Process each card in the batch
        for (const cardName of batch) {
          const normalizedName = cardName.toLowerCase();
          const card = cardsByName.get(normalizedName);
          
          if (card) {
            console.log(`Found card in batch: ${cardName} -> ${card.name}`);
            foundCardNames.add(cardName);
            // Remove from unfoundCards if it was added earlier
            const index = unfoundCards.indexOf(cardName);
            if (index !== -1) {
              unfoundCards.splice(index, 1);
            }
            // Extract colors from the card data
            const colors = card.colors || [];
            if (card.card_faces && card.card_faces.length > 0) {
              const allColors = new Set<string>();
              card.card_faces.forEach((face: { colors?: string[] }) => {
                if (face.colors) {
                  face.colors.forEach((color: string) => allColors.add(color));
                }
              });
              colors.push(...Array.from(allColors));
            }

            // Get all printings of the card
            const printings = data.data
              .filter((c: any) => c.name.toLowerCase() === normalizedName)
              .map((printing: any) => ({
                set: printing.set,
                set_name: printing.set_name,
                rarity: printing.rarity,
                collector_number: printing.collector_number,
                set_type: printing.set_type
              }));

            foundCards.push({
              name: card.name,
              quantity: 1,
              printings,
              colors,
              mana_cost: card.mana_cost || '',
              type_line: card.type_line || ''
            });
          } else {
            console.log(`Card not found in batch: ${cardName}`);
            // Only add to unfoundCards if not already found
            if (!foundCardNames.has(cardName)) {
              unfoundCards.push(cardName);
            }
          }
        }
      } else {
        console.log('No cards found in batch search');
        // Only add to unfoundCards if not already found
        batch.forEach(cardName => {
          if (!foundCardNames.has(cardName)) {
            unfoundCards.push(cardName);
          }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error in batch search:', error);
      // Only add to unfoundCards if not already found
      batch.forEach(cardName => {
        if (!foundCardNames.has(cardName)) {
          unfoundCards.push(cardName);
        }
      });
    }
  }

  // Now search individually for any cards that weren't found in the batch search
  const remainingCards = cardNames.filter(name => !foundCardNames.has(name));
  console.log('Cards to search individually:', remainingCards);

  for (const cardName of remainingCards) {
    try {
      console.log(`Searching individually for: ${cardName}`);
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints`
      );
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Rate limited, waiting ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter || '1') * 1000)));
        continue;
      }

      const data = await response.json();
      if (data.object === 'error' || !data.data || data.data.length === 0) {
        console.log(`Card not found in individual search: ${cardName}`);
        // Only add to unfoundCards if not already found
        if (!foundCardNames.has(cardName)) {
          unfoundCards.push(cardName);
        }
        continue;
      }

      const card = data.data[0];
      console.log(`Found card in individual search: ${cardName} -> ${card.name}`);
      // Remove from unfoundCards if it was added earlier
      const index = unfoundCards.indexOf(cardName);
      if (index !== -1) {
        unfoundCards.splice(index, 1);
      }
      const colors = card.colors || [];
      if (card.card_faces && card.card_faces.length > 0) {
        const allColors = new Set<string>();
        card.card_faces.forEach((face: { colors?: string[] }) => {
          if (face.colors) {
            face.colors.forEach((color: string) => allColors.add(color));
          }
        });
        colors.push(...Array.from(allColors));
      }

      const printings = data.data.map((printing: any) => ({
        set: printing.set,
        set_name: printing.set_name,
        rarity: printing.rarity,
        collector_number: printing.collector_number,
        set_type: printing.set_type
      }));

      foundCards.push({
        name: card.name,
        quantity: 1,
        printings,
        colors,
        mana_cost: card.mana_cost || '',
        type_line: card.type_line || ''
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error searching for ${cardName}:`, error);
      // Only add to unfoundCards if not already found
      if (!foundCardNames.has(cardName)) {
        unfoundCards.push(cardName);
      }
    }
  }

  console.log('Search complete. Found:', foundCards.length, 'Unfound:', unfoundCards.length);
  return { foundCards, unfoundCards };
}; 