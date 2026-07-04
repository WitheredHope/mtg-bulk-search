import React, { useState, useEffect } from 'react';
import SetGrouping from '../components/SetGrouping';
import styles from '../components/CardSearch.module.css';

const SetGroupingPage: React.FC = () => {
  const [availableSets, setAvailableSets] = useState<string[]>([]);

  useEffect(() => {
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

      <SetGrouping
        onGroupsChange={() => {}}
        availableSets={availableSets}
      />
    </div>
  );
};

export default SetGroupingPage;
