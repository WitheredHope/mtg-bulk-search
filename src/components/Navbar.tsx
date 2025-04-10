import { Link } from 'react-router-dom';
import styles from './CardSearch.module.css';

const Navbar = () => {
  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.navbarContainer}>
        <nav className={styles.navbar}>
          <div className={styles.navLinks}>
            <Link to="/" className={styles.navLink}>
              Card Search
            </Link>
            <Link to="/list-set-search" className={styles.navLink}>
              Set Search
            </Link>
            <Link to="/set-grouping" className={styles.navLink}>
              Manage Set Groups
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Navbar; 