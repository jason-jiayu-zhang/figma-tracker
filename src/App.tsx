import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Embed from './pages/Embed';
import { useFigmaData } from './useFigmaData';

function Header() {
  const { stats } = useFigmaData();
  
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-brand">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#A259FF"/>
              <rect x="13" y="4" width="7" height="7" rx="3.5" fill="#F24E1E"/>
              <rect x="4" y="13" width="7" height="7" rx="3.5" fill="#0ACF83"/>
              <circle cx="16.5" cy="16.5" r="3.5" fill="#1ABCFE"/>
              <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#FF7262"/>
            </svg>
            <span className="brand-name">figma<span className="brand-accent">tracker</span></span>
          </Link>
        </div>
        <div className="topbar-user">
          <span className="user-handle">{stats?.myFigmaUserId ? 'Authenticated' : '—'}</span>
          {/* Avatar could be fetched from stats as well if needed */}
          <div className="user-avatar" />
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<><Header /><Dashboard /></>} />
        <Route path="/embed" element={<Embed />} />
      </Routes>
    </Router>
  );
}

export default App;
