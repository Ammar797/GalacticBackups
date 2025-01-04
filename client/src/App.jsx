import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landing';
import Welcome from './components/Welcome';
import Universe from './components/Universe';

const UniverseWithWelcome = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        opacity: showWelcome ? 0.3 : 1,
        transition: 'opacity 0.3s ease',
        position: 'absolute',
        inset: 0
      }}>
        <Universe />
      </div>
      {showWelcome && <Welcome onClose={() => setShowWelcome(false)} />}
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/universe" element={<UniverseWithWelcome />} />
    </Routes>
  );
};

export default App;