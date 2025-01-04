import React, { useState } from 'react';

const WalletSearch = ({ 
  galaxies, 
  solitaryPlanets, 
  onTransactionSelect, 
  mainCameraRef, 
  controlsRef,
  calculateGalaxyPosition 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('wallet'); // 'wallet' or 'transaction'
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleTransactionSearch = (hash) => {
    setSearchError('');
    if (!hash || !hash.trim()) return;

    // Search in galaxies
    for (const galaxy of galaxies) {
      if (!galaxy.transactions) continue;
      
      const transaction = galaxy.transactions.find(tx => 
        tx.hash.toLowerCase() === hash.toLowerCase()
      );
      
      if (transaction) {
        setUserTransactions([transaction]);
        setIsWalletView(true);
        handleTransactionHighlight(transaction.hash);
        return;
      }
    }

    // Search in solitary planets
    const solitaryTransaction = solitaryPlanets.find(tx =>
      tx.hash.toLowerCase() === hash.toLowerCase()
    );

    if (solitaryTransaction) {
      setUserTransactions([solitaryTransaction]);
      setIsWalletView(true);
      handleTransactionHighlight(solitaryTransaction.hash);
    } else {
      setSearchError('Transaction not found');
      setUserTransactions([]);
      setIsWalletView(false);
    }
  };

  const handleWalletSearch = (address) => {
    setSearchError('');
    if (!address || !address.trim()) return;

    const seenHashes = new Set();
    const buyTransactions = [];

    // Search in galaxies
    for (const galaxy of galaxies) {
      if (!galaxy.transactions) continue;
      
      for (const tx of galaxy.transactions) {
        if (tx.toAddress && 
            tx.toAddress.toLowerCase() === address.toLowerCase() && 
            !seenHashes.has(tx.hash)) {
          seenHashes.add(tx.hash);
          buyTransactions.push(tx);
        }
      }
    }

    // Search in solitary planets
    const solitaryBuyTransactions = solitaryPlanets.filter(tx =>
      tx.toAddress && 
      tx.toAddress.toLowerCase() === address.toLowerCase() && 
      !seenHashes.has(tx.hash)
    );

    const transactions = [...buyTransactions, ...solitaryBuyTransactions];
    
    if (transactions.length > 0) {
      transactions.sort((a, b) => b.amount - a.amount);
      setUserTransactions(transactions);
      setIsWalletView(true);
    } else {
      setSearchError('No transactions found for this wallet');
      setUserTransactions([]);
      setIsWalletView(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'wallet') {
      handleWalletSearch(searchInput);
    } else {
      handleTransactionSearch(searchInput);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      try {
        const clipText = await navigator.clipboard.readText();
        setSearchInput(clipText);
        setTimeout(() => {
          if (searchType === 'wallet') {
            handleWalletSearch(clipText);
          } else {
            handleTransactionSearch(clipText);
          }
        }, 0);
      } catch (err) {
        console.error('Failed to read clipboard:', err);
      }
    }
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    setSearchInput(pastedText);
    setTimeout(() => {
      if (searchType === 'wallet') {
        handleWalletSearch(pastedText);
      } else {
        handleTransactionSearch(pastedText);
      }
    }, 0);
  };

  const handleTransactionHighlight = (txHash) => {
    const galaxyWithTx = galaxies.find(g => 
      g.transactions.some(tx => tx.hash === txHash)
    );
    
    if (galaxyWithTx) {
      onTransactionSelect(txHash, galaxyWithTx);
    } else {
      const solitaryPlanet = solitaryPlanets.find(tx => tx.hash === txHash);
      
      if (solitaryPlanet) {
        onTransactionSelect(txHash, null);
        const planetPosition = calculateGalaxyPosition(
          solitaryPlanets.indexOf(solitaryPlanet) + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        
        if (mainCameraRef.current && controlsRef.current) {
          const duration = 1500;
          const startPosition = {
            x: mainCameraRef.current.position.x,
            y: mainCameraRef.current.position.y,
            z: mainCameraRef.current.position.z
          };
          
          const distance = 30;
          const angle = Math.atan2(planetPosition[2], planetPosition[0]);
          const endPosition = {
            x: planetPosition[0] + Math.cos(angle) * distance,
            y: planetPosition[1] + 10,
            z: planetPosition[2] + Math.sin(angle) * distance
          };
          
          const startTime = Date.now();
          const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            mainCameraRef.current.position.set(
              startPosition.x + (endPosition.x - startPosition.x) * eased,
              startPosition.y + (endPosition.y - startPosition.y) * eased,
              startPosition.z + (endPosition.z - startPosition.z) * eased
            );
            
            controlsRef.current.target.set(
              planetPosition[0],
              planetPosition[1],
              planetPosition[2]
            );
            controlsRef.current.update();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          animate();
        }
      }
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setUserTransactions([]);
    setIsWalletView(false);
    setSearchError('');
    onTransactionSelect(null, null);
    setIsExpanded(false);
    setIsHovered(false);
  };

  const handleExpand = () => {
    const newExpandedState = true;
    setIsExpanded(newExpandedState);
    onExpandChange?.(newExpandedState);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setUserTransactions([]);
    setIsWalletView(false);
    setSearchError('');
    setIsExpanded(false);
    onExpandChange?.(false);
  };

  return (
    <div 
    style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'inline-flex',
      alignItems: 'center',
      color: '#fff',
      padding: '10px',
      borderRadius: isExpanded ? '12px' : '50px',
      border: `1px solid ${isHovered ? '#24D2FB' : 'rgba(255, 255, 255, 0.2)'}}`,
      transition: 'all 0.4s ease-in-out',
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(4px)',
      minWidth: isExpanded ? 'auto' : '55px',
      width: isExpanded ? 'min(400px, calc(100vw - 100px))' : '55px',
      maxWidth: '400px',
      height: isExpanded ? 'auto' : '55px',
      cursor: 'pointer',
      '@media (max-width: 768px)': {
        width: isExpanded ? 'calc(100vw - 100px)' : '55px'
      }
     }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isExpanded && (
        <button
          onClick={handleExpand}
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '35px',
            height: '35px',
            cursor: 'pointer',
            background: 'transparent',
            color: isHovered ? '#24D2FB' : 'white',
            border: 'none',
            outline: 'none',
            transition: 'all 0.4s ease-in-out',
          }}
        >
          <i className="ri-search-line" style={{ fontSize: '1.2em' }} />
        </button>
      )}

      {isExpanded && (
        <div style={{
          width: '100%',
          opacity: 1,
          visibility: 'visible',
          transition: 'all 0.4s ease-in-out',
          transform: 'scale(1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            width: '100%'
          }}>
            <div style={{
              display: 'flex',
              flex: 1,
              gap: '8px'
            }}>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setSearchError('');
                  setUserTransactions([]);
                  setIsWalletView(false);
                }}
                style={{
                  padding: '10px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '100px'
                }}
              >
                <option value="wallet">Wallet</option>
                <option value="transaction">Transaction</option>
              </select>
              
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={searchType === 'wallet' ? "Enter wallet address..." : "Enter transaction hash..."}
                style={{
                  padding: '10px 15px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${isFocused ? '#24D2FB' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '8px',
                  color: 'white',
                  outline: 'none',
                  width: '100%',
                  backdropFilter: 'blur(10px)',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                }}
              />
            </div>

            <button
              onClick={clearSearch}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                background: 'rgba(255, 77, 77, 0.1)',
                color: '#ff4d4d',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            >
              <i className="ri-close-line" style={{ fontSize: '1.2em' }} />
            </button>
          </div>

          {/* Results section - adjust position for mobile */}
          {(searchError || (isWalletView && userTransactions.length > 0)) && (
            <div style={{
              position: window.innerWidth <= 768 ? 'fixed' : 'static',
              top: window.innerWidth <= 768 ? '90px' : 'auto',
              left: window.innerWidth <= 768 ? '20px' : 'auto',
              right: window.innerWidth <= 768 ? '20px' : 'auto',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '15px',
              borderRadius: '8px',
              width: window.innerWidth <= 768 ? 'calc(100% - 40px)' : '100%',
              maxHeight: '300px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              zIndex: 1001,
            }}>
              {/* Rest of the results content remains the same */}
              {searchError && (
                <div style={{
                  color: '#ff6b6b',
                  background: 'rgba(255, 77, 77, 0.1)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 77, 77, 0.2)'
                }}>
                  {searchError}
                </div>
              )}

              {isWalletView && userTransactions.length > 0 && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    color: 'white',
                    padding: '0 6px',
                    fontSize: '12px'
                  }}>
                    <span>
                      {searchType === 'wallet' 
                        ? `Wallet: ${searchInput.slice(0, 8)}...`
                        : 'Transaction Details'
                      }
                    </span>
                    <span>{userTransactions.length} transaction{userTransactions.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div style={{
                    overflowY: 'auto',
                    maxHeight: '250px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(36, 210, 251, 0.3) transparent',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      color: 'white',
                    }}>
                      <thead style={{
                        position: 'sticky',
                        top: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 1,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <tr>
                          <th style={{padding: '8px 12px', textAlign: 'left'}}>Transaction ID</th>
                          <th style={{padding: '8px 12px', textAlign: 'right'}}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userTransactions.map(tx => (
                          <tr 
                            key={tx.hash} 
                            style={{
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => handleTransactionHighlight(tx.hash)}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(36, 210, 251, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{padding: '8px 12px'}}>{tx.hash.slice(0,10)}...</td>
                            <td style={{padding: '8px 12px', textAlign: 'right'}}>{tx.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletSearch;