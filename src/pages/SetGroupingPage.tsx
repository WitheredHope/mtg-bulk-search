import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import SetGrouping from '../components/SetGrouping';
import styles from '../components/CardSearch.module.css';

const SetGroupingPage: React.FC = () => {
  const navigate = useNavigate();
  const [availableSets, setAvailableSets] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();

    // Load available sets from the card list
    const cardList = localStorage.getItem('cardList');
    if (cardList) {
      const sets = new Set(JSON.parse(cardList).map((card: any) => card.set));
      setAvailableSets(Array.from(sets).sort() as string[]);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.navbar}>
        <h1>Set Grouping</h1>
      </div>
      
      {userId ? (
        <SetGrouping 
          onGroupsChange={() => {}} 
          availableSets={availableSets}
          userId={userId}
        />
      ) : (
        <div>Please log in to manage set groups</div>
      )}
    </div>
  );
};

export default SetGroupingPage; 