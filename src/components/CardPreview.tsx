import { useEffect, useState } from 'react';
import styles from './CardSearch.module.css';

interface CardPreviewProps {
  cardName: string;
  setCode: string;
  collectorNumber: string;
  isVisible: boolean;
  position: { x: number; y: number };
}

const CardPreview = ({ cardName, setCode, collectorNumber, isVisible, position }: CardPreviewProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCardImage = async () => {
      if (!cardName || !setCode || !collectorNumber) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/${setCode}/${collectorNumber}`
        );
        const data = await response.json();
        setImageUrl(data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || null);
      } catch (error) {
        console.error('Error fetching card image:', error);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (isVisible) {
      fetchCardImage();
    }
  }, [cardName, setCode, collectorNumber, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className={styles.cardPreview}
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y}px`,
      }}
    >
      {isLoading ? (
        <div className={styles.loading}>Loading...</div>
      ) : imageUrl ? (
        <img src={imageUrl} alt={cardName} className={styles.previewImage} />
      ) : (
        <div className={styles.noImage}>No image available</div>
      )}
    </div>
  );
};

export default CardPreview; 