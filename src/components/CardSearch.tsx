import { useState, useEffect } from 'react';
import { searchCards } from '../services/scryfall';
import { saveCardList, getCardLists, deleteCardList, CardList } from '../services/cardLists';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';

interface CardData {
  name: string;
  quantity: number;
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

const CardSearch = () => {
  const [cardList, setCardList] = useState('');
  const [foundCards, setFoundCards] = useState<CardData[]>([]);
  const [unfoundCards, setUnfoundCards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLists, setSavedLists] = useState<CardList[]>([]);
  const [listName, setListName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [hasListBeenEdited, setHasListBeenEdited] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleSaveList = async () => {
    if (!listName.trim()) {
      setError('Please enter a name for the list');
      return;
    }

    try {
      const cardEntries = parseCardList(cardList);
      await saveCardList(listName, cardEntries);
      setShowSaveDialog(false);
      setListName('');
      await loadSavedLists();
      setError(null);
    } catch (error: any) {
      console.error('Error saving list:', error);
      setError(error.message || 'Failed to save the list. Please try again.');
    }
  };

  const handleCardListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCardList(e.target.value);
    setHasListBeenEdited(true);
  };

  const handleLoadList = (list: CardList) => {
    const cardText = list.cards
      .map(card => `${card.quantity} ${card.name}`)
      .join('\n');
    setCardList(cardText);
    setCurrentListId(list.id);
    setListName(list.name);
    setHasListBeenEdited(false);
  };

  const handleUpdateList = async () => {
    if (!currentListId) return;

    setIsUpdating(true);
    try {
      const cardEntries = parseCardList(cardList);
      await saveCardList(listName, cardEntries, currentListId);
      await loadSavedLists();
      setError(null);
      setHasListBeenEdited(false);
    } catch (error: any) {
      console.error('Error updating list:', error);
      setError(error.message || 'Failed to update the list. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteCardList(id);
      await loadSavedLists();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnfoundCards([]);
    setIsLoading(true);

    try {
      // Parse the card list using our parseCardList function
      const cardEntries = parseCardList(cardList);
      console.log('Parsed card entries:', cardEntries);

      if (cardEntries.length === 0) {
        setError('Please enter at least one card name');
        return;
      }

      // Search for cards using just the names
      const searchResult = await searchCards(cardEntries.map(c => c.name));
      console.log('Raw search results:', searchResult);
      
      // Add quantities to found cards
      const foundCardsWithQuantities = searchResult.foundCards.map(card => {
        const entry = cardEntries.find(c => c.name.toLowerCase() === card.name.toLowerCase());
        return {
          ...card,
          quantity: entry?.quantity || 1
        };
      });
      console.log('Cards with quantities:', foundCardsWithQuantities);

      // Map unfound cards back to their original input
      const unfoundOriginalInputs = searchResult.unfoundCards.map(unfoundName => {
        const entry = cardEntries.find(c => c.name.toLowerCase() === unfoundName.toLowerCase());
        return entry?.name || unfoundName;
      });
      console.log('Unfound cards:', unfoundOriginalInputs);

      setFoundCards(foundCardsWithQuantities);
      setUnfoundCards(unfoundOriginalInputs);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
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

  const parseCardList = (text: string): { name: string; quantity: number }[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(entry => {
        // Try to match various quantity formats:
        // 1. "2 Ghostly Flicker"
        // 2. "Ghostly Flicker x2"
        // 3. "2x Ghostly Flicker"
        // 4. "Ghostly Flicker (2)"
        const quantityMatch = entry.match(/^(\d+)(?:\s*x\s*|\s+)?(.+)$/) || // Matches "2 Ghostly Flicker" or "2x Ghostly Flicker"
                            entry.match(/^(.+?)\s*x\s*(\d+)$/) || // Matches "Ghostly Flicker x2"
                            entry.match(/^(.+?)\s*\(\s*(\d+)\s*\)$/); // Matches "Ghostly Flicker (2)"

        if (quantityMatch) {
          // If the quantity is at the start (first pattern)
          if (quantityMatch[1] && !isNaN(parseInt(quantityMatch[1], 10))) {
            return {
              name: quantityMatch[2].trim(),
              quantity: parseInt(quantityMatch[1], 10)
            };
          }
          // If the quantity is at the end (second or third pattern)
          else if (quantityMatch[2] && !isNaN(parseInt(quantityMatch[2], 10))) {
            return {
              name: quantityMatch[1].trim(),
              quantity: parseInt(quantityMatch[2], 10)
            };
          }
        }

        // If no quantity is found, default to 1
        return {
          name: entry.trim(),
          quantity: 1
        };
      });
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="cardList">Enter card names (one per line):</label>
          <textarea
            id="cardList"
            value={cardList}
            onChange={handleCardListChange}
            placeholder="Enter card names, one per line. You can include quantities like '2 Card Name' or '2x Card Name' or 'Card Name x2'."
            rows={10}
          />
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search Cards'}
          </button>
          {isAuthenticated && cardList.trim() && (
            <>
              <button
                type="button"
                className={styles.saveButton}
                onClick={() => setShowSaveDialog(true)}
              >
                Save
              </button>
              {currentListId && (
                <button
                  type="button"
                  className={`${styles.saveButton} ${!hasListBeenEdited ? styles.disabled : ''}`}
                  onClick={handleUpdateList}
                  disabled={!hasListBeenEdited || isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <span className={styles.spinner}></span>
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {!isAuthenticated && (
        <div className={styles.authMessage}>
          <p>Please sign in to save and load card lists.</p>
        </div>
      )}

      {showSaveDialog && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h3>Save Card List</h3>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              className={styles.input}
            />
            <div className={styles.dialogButtons}>
              <button onClick={handleSaveList} className={styles.saveButton}>
                Save
              </button>
              <button onClick={() => setShowSaveDialog(false)} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && savedLists.length > 0 && (
        <div className={styles.savedLists}>
          <h3>Saved Lists</h3>
          <ul>
            {savedLists.map((list) => (
              <li key={list.id} className={styles.listItem}>
                <span onClick={() => handleLoadList(list)} className={styles.listName}>
                  {list.name}
                </span>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unfoundCards.length > 0 && (
        <div className={styles.error}>
          <h3>Cards not found:</h3>
          <ul>
            {unfoundCards.map((card, index) => (
              <li key={index}>{card}</li>
            ))}
          </ul>
        </div>
      )}

      {foundCards.length > 0 && (
        <div className={styles.results}>
          <h2>Search Results</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Card Name</th>
                  <th>Printings</th>
                  <th>Colors</th>
                  <th>Mana Cost</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {foundCards.map((card, index) => {
                  console.log('Rendering card:', card);
                  return (
                    <tr key={index} className={getRowColorClass(card.colors)}>
                      <td>{card.quantity}</td>
                      <td>{card.name}</td>
                      <td>
                        <div className={styles.printings}>
                          {card.printings.map((printing, i) => (
                            <div key={i} className={styles.printing}>
                              <span className={`${styles.setCode} ${getRarityClass(printing.rarity)}`}>
                                {printing.set}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className={styles.colors}>
                          {card.colors.map((color, i) => (
                            <span key={i} className={styles.colorSymbol}>
                              {getColorSymbol(color)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{card.mana_cost}</td>
                      <td>{card.type_line}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardSearch; 