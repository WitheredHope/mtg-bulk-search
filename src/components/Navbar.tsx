import { Link, useLocation } from 'react-router-dom';
import styles from './CardSearch.module.css';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLinks}>
        <Link 
          to="/dashboard" 
          className={`${styles.navLink} ${location.pathname === '/dashboard' ? styles.active : ''}`}
        >
          Card Search
        </Link>
        <Link 
          to="/list-set-search" 
          className={`${styles.navLink} ${location.pathname === '/list-set-search' ? styles.active : ''}`}
        >
          Set Search
        </Link>
      </div>
    </nav>
  );
};

export default Navbar; 