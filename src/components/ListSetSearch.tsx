import { useState, useEffect } from 'react';
import { searchCards } from '../services/scryfall';
import { getCardLists, CardList } from '../services/cardLists';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';
import { useLocation, useNavigate } from 'react-router-dom';

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

interface ColumnVisibility {
  colors: boolean;
  rarity: boolean;
  collectorNumber: boolean;
  type: boolean;
}

const ListSetSearch = () => {
  const location = useLocation();
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
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    colors: true,
    rarity: true,
    collectorNumber: true,
    type: false
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [customGroups, setCustomGroups] = useState<any[]>([]);
  const [showGroupedSets, setShowGroupedSets] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadCustomGroups();
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

  const loadCustomGroups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('set_groups')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (error) throw error;
        console.log('Loaded custom groups:', data); // Debug log
        setCustomGroups(data || []);
      }
    } catch (error) {
      console.error('Error loading custom groups:', error);
    }
  };

  const handleViewAllSets = async () => {
    if (!selectedList) {
      setError('Please select a list first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowGroupedSets(false);

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

  const getSortedColors = (colors: string[]) => {
    const colorOrder: { [key: string]: number } = {
      W: 0,
      U: 1,
      B: 2,
      R: 3,
      G: 4
    };
    return [...colors].sort((a, b) => colorOrder[a] - colorOrder[b]);
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

  const toggleColumnVisibility = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const getColumnClass = (column: keyof ColumnVisibility) => {
    return columnVisibility[column] ? '' : styles.hiddenColumn;
  };

  const toggleSet = (setCode: string) => {
    setExpandedSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setCode)) {
        newSet.delete(setCode);
      } else {
        newSet.add(setCode);
      }
      return newSet;
    });
  };

  const toggleAllSetsInGroup = (groupName: string, groupSets: SetData[]) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
        // Hide all sets in the group
        setExpandedSets(prevSets => {
          const newSets = new Set(prevSets);
          groupSets.forEach(set => newSets.delete(set.setCode));
          return newSets;
        });
      } else {
        newSet.add(groupName);
        // Show all sets in the group
        setExpandedSets(prevSets => {
          const newSets = new Set(prevSets);
          groupSets.forEach(set => newSets.add(set.setCode));
          return newSets;
        });
      }
      return newSet;
    });
  };

  const getGroupedSets = () => {
    if (customGroups.length === 0) return null;

    const groupedSets: { [key: string]: SetData[] } = {};
    const ungroupedSets: SetData[] = [];

    // Initialize groups
    customGroups.forEach(group => {
      groupedSets[group.name] = [];
    });

    // Sort sets into groups
    allSets.forEach(set => {
      let addedToGroup = false;
      for (const group of customGroups) {
        // Convert both to uppercase for case-insensitive comparison
        if (group.sets.map((s: string) => s.toUpperCase()).includes(set.setCode.toUpperCase())) {
          if (!groupedSets[group.name]) {
            groupedSets[group.name] = [];
          }
          groupedSets[group.name].push(set);
          addedToGroup = true;
          break;
        }
      }
      if (!addedToGroup) {
        ungroupedSets.push(set);
      }
    });

    // Filter out empty groups
    const nonEmptyGroupedSets: { [key: string]: SetData[] } = {};
    Object.entries(groupedSets).forEach(([groupName, sets]) => {
      if (sets.length > 0) {
        nonEmptyGroupedSets[groupName] = sets;
      }
    });

    // Sort sets within each group by card count
    Object.keys(nonEmptyGroupedSets).forEach(groupName => {
      nonEmptyGroupedSets[groupName].sort((a, b) => b.cardCount - a.cardCount);
    });

    // Sort ungrouped sets by card count
    ungroupedSets.sort((a, b) => b.cardCount - a.cardCount);

    // Natural sort comparison function
    const naturalCompare = (a: string, b: string) => {
      const ax: any[] = [], bx: any[] = [];
      a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { ax.push([$1 || Infinity, $2 || '']); return ''; });
      b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { bx.push([$1 || Infinity, $2 || '']); return ''; });
      while (ax.length && bx.length) {
        const an = ax.shift();
        const bn = bx.shift();
        const nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if (nn) return nn;
      }
      return ax.length - bx.length;
    };

    // Sort group names naturally
    const sortedGroupNames = Object.keys(nonEmptyGroupedSets).sort(naturalCompare);
    const sortedGroupedSets: { [key: string]: SetData[] } = {};
    sortedGroupNames.forEach(groupName => {
      sortedGroupedSets[groupName] = nonEmptyGroupedSets[groupName];
    });

    return { groupedSets: sortedGroupedSets, ungroupedSets };
  };

  const renderSetGroups = () => {
    const groupedData = getGroupedSets();
    if (!groupedData) return null;

    return (
      <>
        {Object.entries(groupedData.groupedSets).map(([groupName, groupSets]) => (
          <div key={groupName} className={styles.setGroup}>
            <div className={styles.groupHeader}>
              <h2 
                className={styles.groupName}
                onClick={() => setExpandedGroups(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(groupName)) {
                    newSet.delete(groupName);
                  } else {
                    newSet.add(groupName);
                  }
                  return newSet;
                })}
              >
                {groupName}
                <span className={styles.expandIcon}>
                  {expandedGroups.has(groupName) ? '▼' : '▶'}
                </span>
              </h2>
              <button 
                className={styles.expandAllButton}
                onClick={() => toggleAllSetsInGroup(groupName, groupSets)}
              >
                {expandedGroups.has(groupName) ? 'Hide All' : 'Expand All'}
              </button>
            </div>
            {expandedGroups.has(groupName) && groupSets.map(set => (
              <div key={set.setCode} className={styles.setSection}>
                <div className={styles.setHeader} onClick={() => toggleSet(set.setCode)}>
                  <div className={styles.setInfo}>
                    <span className={styles.setCode}>{set.setCode}</span>
                    <span className={styles.setName}>{set.setName}</span>
                    <span className={styles.cardCount}>({set.cardCount} cards)</span>
                  </div>
                  <span className={styles.expandIcon}>
                    {expandedSets.has(set.setCode) ? '▼' : '▶'}
                  </span>
                </div>
                <div className={`${styles.setTableContainer} ${expandedSets.has(set.setCode) ? styles.expanded : ''}`}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th 
                          onClick={() => handleSort('quantity')}
                          className={sortConfig.column === 'quantity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                        >
                          Quantity
                        </th>
                        <th 
                          onClick={() => handleSort('name')}
                          className={sortConfig.column === 'name' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                        >
                          Name
                        </th>
                        <th 
                          className={`${getColumnClass('type')} ${sortConfig.column === 'type_line' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('type_line')}
                        >
                          Type
                        </th>
                        <th 
                          className={`${getColumnClass('colors')} ${sortConfig.column === 'colors' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('colors')}
                        >
                          Colors
                        </th>
                        <th 
                          className={`${getColumnClass('rarity')} ${sortConfig.column === 'rarity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('rarity')}
                        >
                          Rarity
                        </th>
                        <th 
                          className={`${getColumnClass('collectorNumber')} ${sortConfig.column === 'collector_number' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('collector_number')}
                        >
                          Collector #
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedCards(set.cards).map(({ card, printing }, index) => (
                        <tr key={`${card.name}-${printing.set}-${index}`} className={getRowColorClass(card.colors)}>
                          <td>{card.quantity}</td>
                          <td>{card.name}</td>
                          <td className={getColumnClass('type')}>
                            {card.type_line}
                          </td>
                          <td className={getColumnClass('colors')}>
                            {getSortedColors(card.colors).map(color => (
                              <span key={color} className={styles.colorSymbol}>
                                {getColorSymbol(color)}
                              </span>
                            ))}
                          </td>
                          <td className={getColumnClass('rarity')}>
                            <span className={getRarityClass(printing.rarity)}>
                              {printing.rarity.charAt(0).toUpperCase()}
                            </span>
                          </td>
                          <td className={getColumnClass('collectorNumber')}>
                            {printing.collector_number}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))}
        {groupedData.ungroupedSets.length > 0 && (
          <div className={styles.setGroup}>
            <h2>Ungrouped Sets</h2>
            {groupedData.ungroupedSets.map(set => (
              <div key={set.setCode} className={styles.setSection}>
                <div className={styles.setHeader} onClick={() => toggleSet(set.setCode)}>
                  <div className={styles.setInfo}>
                    <span className={styles.setCode}>{set.setCode}</span>
                    <span className={styles.setName}>{set.setName}</span>
                    <span className={styles.cardCount}>({set.cardCount} cards)</span>
                  </div>
                  <span className={styles.expandIcon}>
                    {expandedSets.has(set.setCode) ? '▼' : '▶'}
                  </span>
                </div>
                <div className={`${styles.setTableContainer} ${expandedSets.has(set.setCode) ? styles.expanded : ''}`}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th 
                          onClick={() => handleSort('quantity')}
                          className={sortConfig.column === 'quantity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                        >
                          Quantity
                        </th>
                        <th 
                          onClick={() => handleSort('name')}
                          className={sortConfig.column === 'name' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                        >
                          Name
                        </th>
                        <th 
                          className={`${getColumnClass('type')} ${sortConfig.column === 'type_line' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('type_line')}
                        >
                          Type
                        </th>
                        <th 
                          className={`${getColumnClass('colors')} ${sortConfig.column === 'colors' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('colors')}
                        >
                          Colors
                        </th>
                        <th 
                          className={`${getColumnClass('rarity')} ${sortConfig.column === 'rarity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('rarity')}
                        >
                          Rarity
                        </th>
                        <th 
                          className={`${getColumnClass('collectorNumber')} ${sortConfig.column === 'collector_number' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                          onClick={() => handleSort('collector_number')}
                        >
                          Collector #
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedCards(set.cards).map(({ card, printing }, index) => (
                        <tr key={`${card.name}-${printing.set}-${index}`} className={getRowColorClass(card.colors)}>
                          <td>{card.quantity}</td>
                          <td>{card.name}</td>
                          <td className={getColumnClass('type')}>
                            {card.type_line}
                          </td>
                          <td className={getColumnClass('colors')}>
                            {getSortedColors(card.colors).map(color => (
                              <span key={color} className={styles.colorSymbol}>
                                {getColorSymbol(color)}
                              </span>
                            ))}
                          </td>
                          <td className={getColumnClass('rarity')}>
                            <span className={getRarityClass(printing.rarity)}>
                              {printing.rarity.charAt(0).toUpperCase()}
                            </span>
                          </td>
                          <td className={getColumnClass('collectorNumber')}>
                            {printing.collector_number}
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
      </>
    );
  };

  const handleGroupSets = () => {
    if (customGroups.length === 0) {
      setError('No custom groups available. Please create groups in the Set Grouping page.');
      return;
    }
    if (allSets.length === 0) {
      setError('Please load a list first by clicking "View All Sets"');
      return;
    }
    setShowGroupedSets(!showGroupedSets);
  };

  const handleSaveList = async () => {
    if (!selectedList) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get the exact card names from the found cards in the table
      const exactCardNames = new Map<string, string>();
      foundCards.forEach(card => {
        exactCardNames.set(card.name.toLowerCase(), card.name);
      });

      // Update the list with exact card names from the table
      const updatedList = {
        ...selectedList,
        cards: selectedList.cards.map(card => {
          const exactName = exactCardNames.get(card.name.toLowerCase());
          if (exactName) {
            return {
              ...card,
              name: exactName
            };
          }
          return card;
        })
      };

      const { error } = await supabase
        .from('lists')
        .update({
          name: updatedList.name,
          cards: updatedList.cards
        })
        .eq('id', updatedList.id);

      if (error) throw error;

      setSelectedList(updatedList);
      setShowSaveModal(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.navbar}>
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
            <button 
              type="button" 
              className={styles.submitButton} 
              onClick={handleGroupSets}
              disabled={isLoading || !selectedList || allSets.length === 0}
            >
              {showGroupedSets ? 'Ungroup Sets' : 'Group Sets'}
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={(e) => {
                e.preventDefault();
                setShowColumnDropdown(!showColumnDropdown);
              }}
            >
              Columns
            </button>
            {showColumnDropdown && (
              <div className={styles.columnVisibilityDropdown}>
                <div className={styles.columnVisibilityOption}>
                  <input
                    type="checkbox"
                    id="colors"
                    checked={columnVisibility.colors}
                    onChange={() => toggleColumnVisibility('colors')}
                  />
                  <label htmlFor="colors">Colors</label>
                </div>
                <div className={styles.columnVisibilityOption}>
                  <input
                    type="checkbox"
                    id="rarity"
                    checked={columnVisibility.rarity}
                    onChange={() => toggleColumnVisibility('rarity')}
                  />
                  <label htmlFor="rarity">Rarity</label>
                </div>
                <div className={styles.columnVisibilityOption}>
                  <input
                    type="checkbox"
                    id="collectorNumber"
                    checked={columnVisibility.collectorNumber}
                    onChange={() => toggleColumnVisibility('collectorNumber')}
                  />
                  <label htmlFor="collectorNumber">Collector #</label>
                </div>
                <div className={styles.columnVisibilityOption}>
                  <input
                    type="checkbox"
                    id="type"
                    checked={columnVisibility.type}
                    onChange={() => toggleColumnVisibility('type')}
                  />
                  <label htmlFor="type">Type</label>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

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
                    {getSortedColors(card.colors).map(color => (
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

      <div className={styles.setsContainer}>
        {showGroupedSets && customGroups.length > 0 ? renderSetGroups() : (
          allSets.map(set => (
            <div key={set.setCode} className={styles.setSection}>
              <div className={styles.setHeader} onClick={() => toggleSet(set.setCode)}>
                <div className={styles.setInfo}>
                  <span className={styles.setCode}>{set.setCode}</span>
                  <span className={styles.setName}>{set.setName}</span>
                  <span className={styles.cardCount}>({set.cardCount} cards)</span>
                </div>
                <span className={styles.expandIcon}>
                  {expandedSets.has(set.setCode) ? '▼' : '▶'}
                </span>
              </div>
              <div className={`${styles.setTableContainer} ${expandedSets.has(set.setCode) ? styles.expanded : ''}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th 
                        onClick={() => handleSort('quantity')}
                        className={sortConfig.column === 'quantity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                      >
                        Quantity
                      </th>
                      <th 
                        onClick={() => handleSort('name')}
                        className={sortConfig.column === 'name' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}
                      >
                        Name
                      </th>
                      <th 
                        className={`${getColumnClass('type')} ${sortConfig.column === 'type_line' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                        onClick={() => handleSort('type_line')}
                      >
                        Type
                      </th>
                      <th 
                        className={`${getColumnClass('colors')} ${sortConfig.column === 'colors' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                        onClick={() => handleSort('colors')}
                      >
                        Colors
                      </th>
                      <th 
                        className={`${getColumnClass('rarity')} ${sortConfig.column === 'rarity' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                        onClick={() => handleSort('rarity')}
                      >
                        Rarity
                      </th>
                      <th 
                        className={`${getColumnClass('collectorNumber')} ${sortConfig.column === 'collector_number' ? (sortConfig.direction === 'asc' ? styles['sorted-asc'] : styles['sorted-desc']) : ''}`}
                        onClick={() => handleSort('collector_number')}
                      >
                        Collector #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedCards(set.cards).map(({ card, printing }, index) => (
                      <tr key={`${card.name}-${printing.set}-${index}`} className={getRowColorClass(card.colors)}>
                        <td>{card.quantity}</td>
                        <td>{card.name}</td>
                        <td className={getColumnClass('type')}>
                          {card.type_line}
                        </td>
                        <td className={getColumnClass('colors')}>
                          {getSortedColors(card.colors).map(color => (
                            <span key={color} className={styles.colorSymbol}>
                              {getColorSymbol(color)}
                            </span>
                          ))}
                        </td>
                        <td className={getColumnClass('rarity')}>
                          <span className={getRarityClass(printing.rarity)}>
                            {printing.rarity.charAt(0).toUpperCase()}
                          </span>
                        </td>
                        <td className={getColumnClass('collectorNumber')}>
                          {printing.collector_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ListSetSearch;