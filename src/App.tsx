import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Embed from './pages/Embed';
import { useFigmaData } from './useFigmaData';

function Header() {
  const { stats } = useFigmaData();
  
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(3,4,7,0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div className="w-full max-w-[1100px] px-6 py-0 h-[60px] flex items-center justify-between">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#A259FF"/>
            <rect x="13" y="4" width="7" height="7" rx="3.5" fill="#F24E1E"/>
            <rect x="4" y="13" width="7" height="7" rx="3.5" fill="#0ACF83"/>
            <circle cx="16.5" cy="16.5" r="3.5" fill="#1ABCFE"/>
            <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#FF7262"/>
          </svg>
          <span style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif', fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', color: '#f0f0f0' }}>
            figma<span style={{ color: '#818cf8' }}>tracker</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            color: stats?.myFigmaUserId ? '#0acf83' : 'var(--text-muted)',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: stats?.myFigmaUserId ? '#0acf83' : '#5a6070',
              display: 'inline-block',
              boxShadow: stats?.myFigmaUserId ? '0 0 8px #0acf8380' : 'none',
            }} />
            {stats?.myFigmaUserId ? 'Connected' : 'Not connected'}
          </div>
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
