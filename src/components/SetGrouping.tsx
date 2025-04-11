import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';

// Function to fetch valid set codes from Scryfall API
const fetchValidSetCodes = async () => {
  try {
    const response = await fetch('https://api.scryfall.com/sets');
    const data = await response.json();
    
    // Filter for paper sets only (excluding digital-only sets and promo sets)
    return data.data
      .filter((set: any) => 
        set.digital === false && 
        !set.set_type.includes('promo') &&
        !set.set_type.includes('token') &&
        !set.set_type.includes('memorabilia')
      )
      .map((set: any) => set.code.toUpperCase());
  } catch (error) {
    console.error('Error fetching set codes:', error);
    return [];
  }
};

interface SetGroup {
  id: string;
  name: string;
  sets: string[];
  user_id: string;
}

interface SetGroupingProps {
  onGroupsChange: (groups: SetGroup[]) => void;
  availableSets: string[];
  userId: string;
}

const SetGrouping: React.FC<SetGroupingProps> = ({ onGroupsChange, availableSets, userId }) => {
  const [groups, setGroups] = useState<SetGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newSetInput, setNewSetInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validSetCodes, setValidSetCodes] = useState<string[]>([]);

  useEffect(() => {
    loadGroups();
    fetchValidSetCodes().then(codes => setValidSetCodes(codes));
  }, [userId]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('set_groups')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      
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

      // Sort groups by name using natural sort
      const sortedGroups = (data || []).sort((a: SetGroup, b: SetGroup) => 
        naturalCompare(a.name.toLowerCase(), b.name.toLowerCase())
      );
      
      setGroups(sortedGroups);
      onGroupsChange(sortedGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetInputChange = (value: string) => {
    setNewSetInput(value.toUpperCase());
    if (value.length > 0) {
      const filtered = validSetCodes.filter(set => 
        set.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (setCode: string) => {
    setNewSetInput(setCode);
    setShowSuggestions(false);
  };

  const addGroup = async () => {
    if (newGroupName.trim()) {
      try {
        const newGroup = {
          name: newGroupName.trim(),
          sets: [],
          user_id: userId
        };

        const { data, error } = await supabase
          .from('set_groups')
          .insert([newGroup])
          .select()
          .single();

        if (error) throw error;
        setGroups([...groups, data]);
        setNewGroupName('');
      } catch (error) {
        console.error('Error adding group:', error);
      }
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('set_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      setGroups(groups.filter(group => group.id !== groupId));
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<SetGroup>) => {
    try {
      const { data, error } = await supabase
        .from('set_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      setGroups(groups.map(group => 
        group.id === groupId ? data : group
      ));
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const addSetToGroup = async (groupId: string, setCode: string) => {
    if (!validSetCodes.includes(setCode)) {
      alert('Invalid set code');
      return;
    }

    const group = groups.find(g => g.id === groupId);
    if (group) {
      const updatedSets = [...group.sets, setCode];
      await updateGroup(groupId, { sets: updatedSets });
    }
  };

  const removeSetFromGroup = async (groupId: string, setCode: string) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const updatedSets = group.sets.filter(set => set !== setCode);
      
      const { error } = await supabase
        .from('set_groups')
        .update({ sets: updatedSets })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.map(g => 
        g.id === groupId ? { ...g, sets: updatedSets } : g
      ));
    } catch (error) {
      console.error('Error removing set from group:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.setGrouping}>
      <h2>Custom Set Groups</h2>
      
      <div className={styles.groupInput}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addGroup)}
          placeholder="New group name"
        />
        <button onClick={addGroup}>Add Group</button>
      </div>

      <div className={styles.groupsList}>
        {groups.map(group => (
          <div key={group.id} className={styles.groupItem}>
            <div className={styles.groupHeader}>
              <h3>{group.name}</h3>
              <button onClick={() => deleteGroup(group.id)}>Delete</button>
            </div>
            
            <div className={styles.groupSets}>
              <h4>Sets in this group:</h4>
              <div className={styles.setList}>
                {group.sets.map(setCode => (
                  <div key={setCode} className={styles.setItem}>
                    <span>{setCode}</span>
                    <button 
                      onClick={() => removeSetFromGroup(group.id, setCode)}
                      className={styles.removeSetButton}
                      aria-label="Remove set"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div className={styles.addSetContainer}>
                <div className={styles.setInputContainer}>
                  <input
                    type="text"
                    value={newSetInput}
                    onChange={(e) => handleSetInputChange(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => {
                      if (newSetInput) {
                        addSetToGroup(group.id, newSetInput);
                        setNewSetInput('');
                      }
                    })}
                    placeholder="Enter set code"
                    className={styles.setInput}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className={styles.suggestions}>
                      {suggestions.map(setCode => (
                        <div
                          key={setCode}
                          className={styles.suggestion}
                          onClick={() => handleSuggestionClick(setCode)}
                        >
                          {setCode}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (newSetInput) {
                      addSetToGroup(group.id, newSetInput);
                      setNewSetInput('');
                    }
                  }}
                  className={styles.addSetButton}
                >
                  Add Set
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetGrouping; 