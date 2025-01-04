import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart2, CircleDot } from 'lucide-react';

const TransactionAnalytics = ({ galaxies = [], solitaryPlanets = [], handleTransactionHighlight, onAlertStateChange = () => {} }) => {
  const [newPlanet, setNewPlanet] = useState(null);
  const [prevTransactions, setPrevTransactions] = useState([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const formatNumber = (num) => {
    if (num < 1000) {
      return num.toString();
    }
    if (num >= 1000) {
      const k = (num / 1000).toFixed(1);
      // Remove trailing .0 if present
      return k.endsWith('.0') ? k.slice(0, -2) + 'k' : k + 'k';
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const currentTransactions = [...galaxies.flatMap(g => g.transactions), ...solitaryPlanets];
    
    if (prevTransactions.length < currentTransactions.length) {
      const newestTransaction = currentTransactions[currentTransactions.length - 1];
      setNewPlanet({
        hash: newestTransaction.hash,
        amount: newestTransaction.amount,
        timestamp: Date.now()
      });
      onAlertStateChange(true);
      setTimeout(() => {
        setNewPlanet(null);
        onAlertStateChange(false);
      }, 5000);
    }

    const volume = currentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    setTotalVolume(volume);
    
    setPrevTransactions(currentTransactions);
  }, [galaxies, solitaryPlanets, onAlertStateChange]);

  const containerStyle = {
    position: 'absolute',
    bottom: isMobile ? '0.5rem' : '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    color: 'white',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: isMobile ? '0.75rem' : '1rem',
    borderRadius: '0.5rem',
    fontFamily: 'monospace',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    width: isMobile ? '90%' : 'auto',
    minWidth: isMobile ? 'unset' : '400px',
    maxWidth: isMobile ? '400px' : 'unset',
    fontSize: isMobile ? '12px' : '14px'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.5rem'
      }}>
        <TrendingUp size={isMobile ? 16 : 20} />
        <span style={{ fontWeight: 'bold' }}>Galactic Analytics</span>
      </div>

      {newPlanet && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(74, 222, 128, 0.2)',
          borderRadius: '0.25rem',
          marginBottom: '0.75rem',
          animation: 'fadeIn 0.5s ease-in'
        }}>
          <CircleDot size={isMobile ? 14 : 16} color="#4ade80" />
          <span style={{ color: '#4ade80' }}>New Planet Found!</span>
          <span style={{ opacity: 0.8, fontSize: '0.8em' }}>
            {newPlanet.hash.slice(0, 8)}...
          </span>
        </div>
      )}

<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: isMobile ? '0.5rem' : '1rem',
  marginBottom: isMobile ? '0.5rem' : '1rem',
  textAlign: 'center',
  padding: '0.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '0.25rem'
}}>
  <div>
    <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Star Systems</div>
    <div style={{ fontSize: isMobile ? '1.1em' : '1.2em' }}>
      {formatNumber(galaxies.length)}
    </div>
  </div>
  <div>
    <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Planets</div>
    <div style={{ fontSize: isMobile ? '1.1em' : '1.2em' }}>
      {formatNumber(
        galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + solitaryPlanets.length
      )}
    </div>
  </div>
  <div>
    <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Volume</div>
    <div style={{ fontSize: isMobile ? '1.1em' : '1.2em' }}>
      {formatNumber(totalVolume)}
    </div>
  </div>
</div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default TransactionAnalytics;