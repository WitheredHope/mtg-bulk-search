import { useState, useEffect } from 'react';
import { searchCards, isDigitalOnlySet } from '../services/scryfall';
import { getCardLists, CardList, saveCardList } from '../services/cardLists';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';
import { useLocation, useNavigate } from 'react-router-dom';
import CardPreview from './CardPreview';

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
  const [selectedRarities, setSelectedRarities] = useState<Set<Rarity>>(new Set(['common', 'uncommon', 'rare', 'mythic', 'timeshifted']));
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [previewCard, setPreviewCard] = useState<{
    name: string;
    setCode: string;
    collectorNumber: string;
    position: { x: number; y: number };
  } | null>(null);
  const [showColorGroups, setShowColorGroups] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const navigate = useNavigate();

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
    setShowColorGroups(false);

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

      // Get all unique set codes
      const setCodes = Array.from(setMap.keys());
      
      // Check which sets are digital
      const digitalSetChecks = await Promise.all(
        setCodes.map(async (setCode) => {
          const isDigital = await isDigitalOnlySet(setCode);
          return { setCode, isDigital };
        })
      );

      // Filter out digital sets
      const physicalSetCodes = digitalSetChecks
        .filter(({ isDigital }) => !isDigital)
        .map(({ setCode }) => setCode);

      // Convert the map to an array of SetData objects and sort cards by collector number
      const setsData: SetData[] = Array.from(setMap.entries())
        .filter(([setCode]) => physicalSetCodes.includes(setCode))
        .map(([setCode, cardPrintings]) => {
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

  // Add a new function to calculate filtered card count
  const getFilteredCardCount = (cards: { card: CardData; printing: SetPrinting }[]) => {
    const uniqueCards = new Set<string>();
    cards.forEach(({ card, printing }) => {
      if (selectedRarities.has(printing.rarity.toLowerCase() as Rarity)) {
        uniqueCards.add(card.name);
      }
    });
    return uniqueCards.size;
  };

  // Add useEffect to update card counts when rarities change
  useEffect(() => {
    if (allSets.length > 0) {
      setAllSets(prevSets => 
        prevSets.map(set => ({
          ...set,
          cardCount: getFilteredCardCount(set.cards)
        }))
      );
    }
  }, [selectedRarities]);

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

  const getPrimaryType = (typeLine: string): string => {
    const mainTypes = typeLine.split(' — ')[0].split(' ');
    
    if (mainTypes.includes('Creature')) return 'Creature';
    if (mainTypes.includes('Land')) return 'Land';
    if (mainTypes.includes('Artifact')) return 'Artifact';
    
    for (const type of mainTypes) {
      if (typeOrder[type] !== undefined) {
        return type;
      }
    }
    return mainTypes[0];
  };

  const getSortedCards = (cards: { card: CardData; printing: SetPrinting }[]) => {
    const seenCardNames = new Set<string>();
    
    return [...cards]
      .filter(({ card, printing }) => {
        if (!selectedRarities.has(printing.rarity.toLowerCase() as Rarity)) {
          return false;
        }
        if (!showDuplicates) {
          const cardNameLower = card.name.toLowerCase();
          if (seenCardNames.has(cardNameLower)) {
            return false;
          }
          seenCardNames.add(cardNameLower);
        }
        return true;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.column === 'name' || sortConfig.column === 'quantity' || sortConfig.column === 'type_line' || sortConfig.column === 'colors' || sortConfig.column === 'mana_cost') {
          aValue = a.card[sortConfig.column];
          bValue = b.card[sortConfig.column];
        } else {
          aValue = a.printing[sortConfig.column];
          bValue = b.printing[sortConfig.column];
        }

        if (sortConfig.column === 'collector_number') {
          const aNum = parseInt(aValue as string);
          const bNum = parseInt(bValue as string);
          
          if (aNum === bNum) {
            return (aValue as string).localeCompare(bValue as string);
          }
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (sortConfig.column === 'colors') {
          const aColors = a.card.colors || [];
          const bColors = b.card.colors || [];
          return sortConfig.direction === 'asc' 
            ? aColors.length - bColors.length 
            : bColors.length - aColors.length;
        }

        if (sortConfig.column === 'type_line') {
          const aType = getPrimaryType(a.card.type_line);
          const bType = getPrimaryType(b.card.type_line);
          return sortConfig.direction === 'asc' 
            ? aType.localeCompare(bType)
            : bType.localeCompare(aType);
        }

        if (sortConfig.column === 'rarity') {
          const rarityOrder = { common: 0, uncommon: 1, rare: 2, mythic: 3, timeshifted: 4 };
          const aRarity = rarityOrder[a.printing.rarity.toLowerCase() as Rarity] || 0;
          const bRarity = rarityOrder[b.printing.rarity.toLowerCase() as Rarity] || 0;
          return sortConfig.direction === 'asc' ? aRarity - bRarity : bRarity - aRarity;
        }

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        return sortConfig.direction === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
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

  const getColorGroup = (colors: string[]): string => {
    if (colors.length === 0) return 'Colorless';
    if (colors.length > 1) return 'Multicolored';
    const colorMap: { [key: string]: string } = {
      W: 'White',
      U: 'Blue',
      B: 'Black',
      R: 'Red',
      G: 'Green'
    };
    return colorMap[colors[0]] || 'Colorless';
  };

  const renderColorGroups = () => {
    const colorOrder = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolored', 'Colorless'];
    const colorGroups: { [key: string]: { card: CardData; printing: SetPrinting }[] } = {};

    // Initialize color groups
    colorOrder.forEach(color => {
      colorGroups[color] = [];
    });

    // Group cards by color
    allSets.forEach(set => {
      set.cards.forEach(({ card, printing }) => {
        if (selectedRarities.has(printing.rarity.toLowerCase() as Rarity)) {
          const colorGroup = getColorGroup(card.colors);
          colorGroups[colorGroup].push({ card, printing });
        }
      });
    });

    return (
      <>
        {colorOrder.map(color => {
          const cards = colorGroups[color];
          if (cards.length === 0) return null;

          return (
            <div key={color} className={styles.setSection}>
              <div className={styles.setHeader} onClick={() => toggleSet(color)}>
                <div className={styles.setInfo}>
                  <span className={styles.setName}>{color}</span>
                  <span className={styles.cardCount}>({cards.length} cards)</span>
                </div>
                <span className={styles.expandIcon}>
                  {expandedSets.has(color) ? '▼' : '▶'}
                </span>
              </div>
              <div className={`${styles.setTableContainer} ${expandedSets.has(color) ? styles.expanded : ''}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('quantity')}>Quantity</th>
                      <th onClick={() => handleSort('name')}>Name</th>
                      <th className={getColumnClass('type')} onClick={() => handleSort('type_line')}>Type</th>
                      <th className={getColumnClass('colors')} onClick={() => handleSort('colors')}>Colors</th>
                      <th className={getColumnClass('rarity')} onClick={() => handleSort('rarity')}>Rarity</th>
                      <th className={getColumnClass('collectorNumber')} onClick={() => handleSort('collector_number')}>Collector #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedCards(cards).map(({ card, printing }, index) => (
                      <tr key={`${card.name}-${printing.set}-${index}`} className={getRowColorClass(card.colors)}>
                        <td>{card.quantity}</td>
                        <td 
                          className={styles.cardName}
                          onMouseEnter={(e) => handleCardHover(e, card, printing)}
                          onMouseLeave={handleCardLeave}
                        >
                          {card.name}
                        </td>
                        <td className={getColumnClass('type')}>{card.type_line}</td>
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
                        <td className={getColumnClass('collectorNumber')}>{printing.collector_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </>
    );
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
                          <td 
                            className={styles.cardName}
                            onMouseEnter={(e) => handleCardHover(e, card, printing)}
                            onMouseLeave={handleCardLeave}
                          >
                            {card.name}
                          </td>
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
                          <td 
                            className={styles.cardName}
                            onMouseEnter={(e) => handleCardHover(e, card, printing)}
                            onMouseLeave={handleCardLeave}
                          >
                            {card.name}
                          </td>
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
      setError('Please load a list first by clicking "Group by Set"');
      return;
    }
    setShowGroupedSets(!showGroupedSets);
  };

  const handleSaveList = async () => {
    if (!selectedList) return;
    
    try {
      setIsUpdating(true);
      const cardEntries = parseCardList(selectedList.cards);
      await saveCardList(selectedList.name, cardEntries);
      await loadSavedLists();
    } catch (error: any) {
      console.error('Error saving list:', error);
      setError(error.message || 'Failed to save the list. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const parseCardList = (cards: { name: string; quantity: number }[]): { name: string; quantity: number }[] => {
    return cards.map(card => ({
      name: card.name,
      quantity: card.quantity
    }));
  };

  const handleCardHover = (e: React.MouseEvent, card: CardData, printing: SetPrinting) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPreviewCard({
      name: card.name,
      setCode: printing.set,
      collectorNumber: printing.collector_number,
      position: { x: rect.left, y: rect.top }
    });
  };

  const handleCardLeave = () => {
    setPreviewCard(null);
  };

  const handleExpandAll = () => {
    if (showColorGroups) {
      // For color groups, we need to expand all color sections
      const allColors = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolored', 'Colorless'];
      setExpandedSets(new Set(allColors));
    } else if (showGroupedSets) {
      // For grouped sets, we need to expand all set groups and their sets
      const groupedData = getGroupedSets();
      if (groupedData) {
        const allGroupNames = Object.keys(groupedData.groupedSets);
        setExpandedGroups(new Set(allGroupNames));
        
        // Get all set codes from both grouped and ungrouped sets
        const allSetCodes = [
          ...Object.values(groupedData.groupedSets).flatMap(sets => sets.map(set => set.setCode)),
          ...groupedData.ungroupedSets.map(set => set.setCode)
        ];
        setExpandedSets(new Set(allSetCodes));
      }
    } else {
      // For regular set view, we need to expand all sets
      const allSetCodes = allSets.map(set => set.setCode);
      setExpandedSets(new Set(allSetCodes));
    }
    setAllExpanded(!allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedSets(new Set());
    setExpandedGroups(new Set());
    setAllExpanded(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.columnControls}>
          <button 
            className={styles.columnButton}
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
          >
            Columns
          </button>
          {showColumnDropdown && (
            <div className={styles.columnDropdown}>
              <label>
                <input
                  type="checkbox"
                  checked={columnVisibility.colors}
                  onChange={() => toggleColumnVisibility('colors')}
                />
                Colors
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={columnVisibility.rarity}
                  onChange={() => toggleColumnVisibility('rarity')}
                />
                Rarity
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={columnVisibility.collectorNumber}
                  onChange={() => toggleColumnVisibility('collectorNumber')}
                />
                Collector Number
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={columnVisibility.type}
                  onChange={() => toggleColumnVisibility('type')}
                />
                Type
              </label>
            </div>
          )}
        </div>
        <div className={styles.rarityFilter}>
          <h4>Filter Rarities:</h4>
          <div className={styles.rarityCheckboxes}>
            {(['common', 'uncommon', 'rare', 'mythic', 'timeshifted'] as Rarity[]).map(rarity => (
              <label key={rarity}>
                <input
                  type="checkbox"
                  checked={selectedRarities.has(rarity)}
                  onChange={() => {
                    const newRarities = new Set(selectedRarities);
                    if (newRarities.has(rarity)) {
                      newRarities.delete(rarity);
                    } else {
                      newRarities.add(rarity);
                    }
                    setSelectedRarities(newRarities);
                  }}
                />
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </label>
            ))}
          </div>
          <div className={styles.duplicateFilter}>
            <label>
              <input
                type="checkbox"
                checked={showDuplicates}
                onChange={() => setShowDuplicates(!showDuplicates)}
              />
              Show Duplicates
            </label>
          </div>
        </div>
      </div>
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
              Group by Set
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
              onClick={() => {
                if (allSets.length === 0) {
                  handleViewAllSets();
                }
                setShowColorGroups(!showColorGroups);
                setShowGroupedSets(false);
                setAllExpanded(false);
              }}
              disabled={isLoading || !selectedList}
            >
              {showColorGroups ? 'Ungroup Colors' : 'Group by Color'}
            </button>
            <button 
              type="button" 
              className={styles.submitButton} 
              onClick={allExpanded ? handleCollapseAll : handleExpandAll}
              disabled={isLoading || !selectedList || allSets.length === 0}
            >
              {allExpanded ? 'Hide All' : 'Expand All'}
            </button>
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
        {showColorGroups ? renderColorGroups() : (
          showGroupedSets && customGroups.length > 0 ? renderSetGroups() : (
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
                          <td 
                            className={styles.cardName}
                            onMouseEnter={(e) => handleCardHover(e, card, printing)}
                            onMouseLeave={handleCardLeave}
                          >
                            {card.name}
                          </td>
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
          )
        )}
      </div>
      {previewCard && (
        <CardPreview
          cardName={previewCard.name}
          setCode={previewCard.setCode}
          collectorNumber={previewCard.collectorNumber}
          isVisible={true}
          position={previewCard.position}
        />
      )}
    </div>
  );
};

export default ListSetSearch;