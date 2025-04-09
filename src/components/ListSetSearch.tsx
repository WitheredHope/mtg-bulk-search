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

const ListSetSearch = () => {
  const [selectedList, setSelectedList] = useState<CardList | null>(null);
  const [setCode, setSetCode] = useState('');
  const [foundCards, setFoundCards] = useState<CardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLists, setSavedLists] = useState<CardList[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [allSets, setAllSets] = useState<SetData[]>([]);
  const [expandedSet, setExpandedSet] = useState<string | null>(null);
  const [setNames, setSetNames] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!selectedList) {
      setError('Please select a list');
      setIsLoading(false);
      return;
    }

    if (!setCode.trim()) {
      setError('Please enter a set code');
      setIsLoading(false);
      return;
    }

    try {
      const cardNames = selectedList.cards.map(card => card.name);
      const { foundCards: allFoundCards } = await searchCards(cardNames);
      
      // Filter cards that were printed in the specified set
      const cardsInSet = allFoundCards.filter(card => 
        card.printings.some(printing => 
          printing.set.toLowerCase() === setCode.toLowerCase()
        )
      );

      // Add quantities from the original list
      const cardsWithQuantities = cardsInSet.map(card => {
        const listEntry = selectedList.cards.find(c => 
          c.name.toLowerCase() === card.name.toLowerCase()
        );
        return {
          ...card,
          quantity: listEntry?.quantity || 1
        };
      });

      setFoundCards(cardsWithQuantities);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
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

  return (
    <div className={styles.container}>
      <h1>Search Cards by Set</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
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

        <div className={styles.inputGroup}>
          <label htmlFor="setCode">Enter set code:</label>
          <input
            id="setCode"
            type="text"
            value={setCode}
            onChange={(e) => setSetCode(e.target.value)}
            placeholder="e.g., MOM for March of the Machine"
            className={styles.input}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search Cards'}
          </button>
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
        <div className={styles.results}>
          <h2>All Sets</h2>
          <div className={styles.accordion}>
            {allSets.map((setData) => (
              <div key={setData.setCode} className={styles.accordionItem}>
                <button
                  className={styles.accordionHeader}
                  onClick={() => setExpandedSet(expandedSet === setData.setCode ? null : setData.setCode)}
                >
                  <span className={styles.setHeader}>
                    <span className={styles.setCode}>{setData.setCode.toUpperCase()}</span>
                    <span className={styles.setName}> - {setData.setName}</span>
                    <span className={styles.cardCount}>
                      ({setData.cardCount} {setData.cardCount === 1 ? 'card' : 'cards'})
                    </span>
                  </span>
                </button>
                {expandedSet === setData.setCode && (
                  <div className={styles.accordionContent}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Collector #</th>
                          <th>Quantity</th>
                          <th>Name</th>
                          <th>Colors</th>
                          <th>Mana Cost</th>
                          <th>Type</th>
                          <th>Rarity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {setData.cards.map(({ card, printing }, index) => (
                          <tr key={`${card.name}-${printing.collector_number}`} className={getRowColorClass(card.colors)}>
                            <td>{printing.collector_number}</td>
                            <td>{card.quantity}</td>
                            <td>{card.name}</td>
                            <td>
                              {card.colors.map(color => (
                                <span key={color} className={styles.colorSymbol}>
                                  {getColorSymbol(color)}
                                </span>
                              ))}
                            </td>
                            <td>{card.mana_cost}</td>
                            <td>{card.type_line}</td>
                            <td>{printing.rarity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListSetSearch; 