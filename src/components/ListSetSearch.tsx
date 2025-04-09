import { useState, useEffect } from 'react';
import { searchCards } from '../services/scryfall';
import { getCardLists, CardList } from '../services/cardLists';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';

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

interface SetData {
  setCode: string;
  setName: string;
  cardCount: number;
  cards: {
    card: CardData;
    printing: SetPrinting;
  }[];
}

type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'timeshifted';

interface SortConfig {
  column: 'name' | 'quantity' | 'collector_number' | 'rarity' | 'type_line' | 'colors' | 'mana_cost';
  direction: 'asc' | 'desc';
}

const ListSetSearch = () => {
  const [selectedList, setSelectedList] = useState<CardList | null>(null);
  const [foundCards, setFoundCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLists, setSavedLists] = useState<CardList[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [allSets, setAllSets] = useState<SetData[]>([]);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [setNames, setSetNames] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'collector_number', direction: 'asc' });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!supabase) {
      console.log('Supabase client not available');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) {
        await loadSavedLists();
      }
    } catch (error: any) {
      console.error('Auth check failed:', error);
    }
  };

  const loadSavedLists = async () => {
    if (!supabase) {
      console.log('Supabase client not available');
      return;
    }

    try {
      const lists = await getCardLists();
      setSavedLists(lists);
    } catch (error: any) {
      console.error('Failed to load lists:', error);
    }
  };

  const handleViewAllSets = async () => {
    if (!selectedList) {
      setError('Please select a list first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cardNames = selectedList.cards.map(card => card.name);
      const { foundCards: allFoundCards } = await searchCards(cardNames, { uniqueSetsPerCard: false });

      // Create a map of sets and their cards with all printings
      const setMap = new Map<string, { card: CardData; printing: SetPrinting }[]>();
      const setNameMap: Record<string, string> = {};
      const uniqueCardCountMap = new Map<string, Set<string>>();
      
      allFoundCards.forEach(card => {
        card.printings.forEach(printing => {
          const setCode = printing.set;
          if (!setMap.has(setCode)) {
            setMap.set(setCode, []);
            uniqueCardCountMap.set(setCode, new Set());
          }
          setMap.get(setCode)?.push({
            card: {
              ...card,
              quantity: selectedList.cards.find(c => 
                c.name.toLowerCase() === card.name.toLowerCase()
              )?.quantity || 1
            },
            printing
          });
          // Store the set name
          setNameMap[setCode] = printing.set_name;
          // Add to unique card count
          uniqueCardCountMap.get(setCode)?.add(card.name);
        });
      });

      setSetNames(setNameMap);

      // Convert the map to an array of SetData objects and sort cards by collector number
      const setsData: SetData[] = Array.from(setMap.entries()).map(([setCode, cardPrintings]) => {
        // Sort cards by collector number
        const sortedCardPrintings = [...cardPrintings].sort((a, b) => {
          // Convert collector numbers to numbers if possible for proper numeric sorting
          const aNum = parseInt(a.printing.collector_number, 10);
          const bNum = parseInt(b.printing.collector_number, 10);
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          
          // Fallback to string comparison if not numeric
          return a.printing.collector_number.localeCompare(b.printing.collector_number);
        });

        return {
          setCode,
          setName: setNameMap[setCode] || setCode,
          cardCount: uniqueCardCountMap.get(setCode)?.size || 0,
          cards: sortedCardPrintings
        };
      });

      // Sort sets by card count in descending order
      setsData.sort((a, b) => b.cardCount - a.cardCount);
      
      setAllSets(setsData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getColorSymbol = (color: string) => {
    const colorMap: { [key: string]: string } = {
      W: '⚪',
      U: '🔵',
      B: '⚫',
      R: '🔴',
      G: '🟢',
    };
    return colorMap[color] || '';
  };

  const getRarityClass = (rarity: string) => {
    const rarityMap: { [key: string]: string } = {
      common: styles.common,
      uncommon: styles.uncommon,
      rare: styles.rare,
      mythic: styles.mythic,
      timeshifted: styles.timeshifted
    };
    return rarityMap[rarity.toLowerCase()] || '';
  };

  const getRowColorClass = (colors: string[]) => {
    if (colors.length > 1) {
      return styles.gold;
    }
    if (colors.length === 0) {
      return styles.colorless;
    }
    const colorMap: { [key: string]: string } = {
      W: styles.white,
      U: styles.blue,
      B: styles.black,
      R: styles.red,
      G: styles.green
    };
    return colorMap[colors[0]] || styles.colorless;
  };

  const handleSort = (column: SortConfig['column']) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedCards = (cards: { card: CardData; printing: SetPrinting }[]) => {
    return [...cards].sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.column) {
        case 'name':
          comparison = a.card.name.localeCompare(b.card.name);
          break;
        case 'quantity':
          comparison = a.card.quantity - b.card.quantity;
          break;
        case 'collector_number':
          const aNum = parseInt(a.printing.collector_number, 10);
          const bNum = parseInt(b.printing.collector_number, 10);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            comparison = aNum - bNum;
          } else {
            comparison = a.printing.collector_number.localeCompare(b.printing.collector_number);
          }
          break;
        case 'type_line':
          // Define type order
          const typeOrder: { [key: string]: number } = {
            'Creature': 0,
            'Planeswalker': 1,
            'Battle': 2,
            'Enchantment': 3,
            'Instant': 4,
            'Sorcery': 5,
            'Kindred': 6,
            'Artifact': 7,
            'Land': 8
          };

          // Helper function to get primary type
          const getPrimaryType = (typeLine: string): string => {
            // Split at " — " and take the first part
            const mainTypes = typeLine.split(' — ')[0].split(' ');
            
            // Special cases that should take priority, in order of importance
            if (mainTypes.includes('Creature')) return 'Creature';
            if (mainTypes.includes('Land')) return 'Land';
            if (mainTypes.includes('Artifact')) return 'Artifact';
            
            // For other cases, return the first type that matches our order
            for (const type of mainTypes) {
              if (typeOrder[type] !== undefined) {
                return type;
              }
            }
            return mainTypes[0]; // Fallback to first type if no match
          };

          const aPrimaryType = getPrimaryType(a.card.type_line);
          const bPrimaryType = getPrimaryType(b.card.type_line);
          
          // Compare primary types
          const aTypeOrder = typeOrder[aPrimaryType] ?? 999;
          const bTypeOrder = typeOrder[bPrimaryType] ?? 999;
          comparison = aTypeOrder - bTypeOrder;

          // If same primary type, sort by full type line
          if (comparison === 0) {
            comparison = a.card.type_line.localeCompare(b.card.type_line);
          }
          break;
        case 'colors':
          // Define color order
          const colorOrder: { [key: string]: number } = {
            'W': 1,
            'U': 2,
            'B': 3,
            'R': 4,
            'G': 5
          };

          // Helper function to determine card's color category
          const getColorCategory = (colors: string[], typeLine: string): number => {
            // Check if it's a land
            if (typeLine.toLowerCase().includes('land')) {
              return 8; // Land Colorless
            }
            
            // Check if it's an artifact
            if (typeLine.toLowerCase().includes('artifact')) {
              return 6; // Artifact Colorless
            }

            // Check if it's multicolored
            if (colors.length > 1) {
              return 7; // Multicolored
            }

            // Check if it's colorless
            if (colors.length === 0) {
              return 0; // Non-Artifact, Non-Land Colorless
            }

            // Return the color's position in the order
            return colorOrder[colors[0]] || 0;
          };

          const aCategory = getColorCategory(a.card.colors, a.card.type_line);
          const bCategory = getColorCategory(b.card.colors, b.card.type_line);
          comparison = aCategory - bCategory;

          // If same category, sort by color order
          if (comparison === 0 && a.card.colors.length > 0 && b.card.colors.length > 0) {
            comparison = colorOrder[a.card.colors[0]] - colorOrder[b.card.colors[0]];
          }
          break;
        case 'mana_cost':
          comparison = a.card.mana_cost.localeCompare(b.card.mana_cost);
          break;
        case 'rarity':
          const rarityOrder: Record<Rarity, number> = {
            common: 0,
            uncommon: 1,
            rare: 2,
            mythic: 3,
            timeshifted: 4
          };
          const aRarity = a.printing.rarity.toLowerCase() as Rarity;
          const bRarity = b.printing.rarity.toLowerCase() as Rarity;
          comparison = (rarityOrder[aRarity] || 0) - (rarityOrder[bRarity] || 0);
          break;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  return (
    <div className={styles.container}>
      <form className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="listSelect">Select a saved list:</label>
          <select
            id="listSelect"
            value={selectedList?.id || ''}
            onChange={(e) => {
              const list = savedLists.find(l => l.id === e.target.value);
              setSelectedList(list || null);
            }}
            className={styles.select}
          >
            <option value="">-- Select a list --</option>
            {savedLists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.buttonGroup}>
          <button 
            type="button" 
            className={styles.submitButton} 
            onClick={handleViewAllSets}
            disabled={isLoading || !selectedList}
          >
            View All Sets
          </button>
        </div>
      </form>

      {!isAuthenticated && (
        <div className={styles.authMessage}>
          <p>Please sign in to search cards from saved lists.</p>
        </div>
      )}

      {foundCards.length > 0 && (
        <div className={styles.results}>
          <h2>Cards Found in Set</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Name</th>
                <th>Set</th>
                <th>Colors</th>
                <th>Mana Cost</th>
                <th>Type</th>
                <th>Rarity</th>
              </tr>
            </thead>
            <tbody>
              {foundCards.map((card, index) => (
                <tr key={index} className={getRowColorClass(card.colors)}>
                  <td>{card.quantity}</td>
                  <td>{card.name}</td>
                  <td>
                    <span className={`${styles.setCode} ${getRarityClass(card.printings[0].rarity)}`}>
                      {card.printings[0].set}
                    </span>
                  </td>
                  <td>
                    {card.colors.map(color => (
                      <span key={color} className={styles.colorSymbol}>
                        {getColorSymbol(color)}
                      </span>
                    ))}
                  </td>
                  <td>{card.mana_cost}</td>
                  <td>{card.type_line}</td>
                  <td>{card.printings[0].rarity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {allSets.length > 0 && (
        <div className={styles.setsContainer}>
          {allSets.map(set => (
            <div key={set.setCode} className={styles.setSection}>
              <div className={styles.setHeader} onClick={() => setExpandedSet(expandedSet === set.setCode ? null : set.setCode)}>
                <div className={styles.setInfo}>
                  <span className={styles.setCode}>{set.setCode}</span>
                  <span className={styles.setName}>{set.setName}</span>
                  <span className={styles.cardCount}>({set.cardCount} cards)</span>
                </div>
                <span className={styles.expandIcon}>
                  {expandedSet === set.setCode ? '▼' : '▶'}
                </span>
              </div>
              <div className={`${styles.setTableContainer} ${expandedSet === set.setCode ? styles.expanded : ''}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('quantity')} className={styles.sortableHeader}>
                        # {sortConfig.column === 'quantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('name')} className={styles.sortableHeader}>
                        Name {sortConfig.column === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('collector_number')} className={styles.sortableHeader}>
                        Col # {sortConfig.column === 'collector_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('type_line')} className={styles.sortableHeader}>
                        Type {sortConfig.column === 'type_line' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('colors')} className={styles.sortableHeader}>
                        Colors {sortConfig.column === 'colors' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('mana_cost')} className={styles.sortableHeader}>
                        Mana Cost {sortConfig.column === 'mana_cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('rarity')} className={styles.sortableHeader}>
                        R {sortConfig.column === 'rarity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedCards(set.cards).map(({ card, printing }, index) => (
                      <tr key={`${card.name}-${printing.set}-${index}`} className={getRowColorClass(card.colors)}>
                        <td>{card.quantity}</td>
                        <td>{card.name}</td>
                        <td>{printing.collector_number}</td>
                        <td>{card.type_line}</td>
                        <td>
                          {card.colors.map(color => (
                            <span key={color} className={styles.colorSymbol}>
                              {getColorSymbol(color)}
                            </span>
                          ))}
                        </td>
                        <td>{card.mana_cost}</td>
                        <td className={getRarityClass(printing.rarity)}>
                          {printing.rarity.charAt(0).toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListSetSearch; 