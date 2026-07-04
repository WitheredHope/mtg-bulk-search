import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CardSearch from './components/CardSearch';
import ListSetSearch from './components/ListSetSearch';
import Navbar from './components/Navbar';
import SetGroupingPage from './pages/SetGroupingPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div className="content-container">
          <Routes>
            <Route path="/" element={<CardSearch />} />
            <Route path="/list-set-search" element={<ListSetSearch />} />
            <Route path="/set-grouping" element={<SetGroupingPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
