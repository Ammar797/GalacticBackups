import { useState, useEffect, useRef, useCallback, memo, useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet.jsx';
import UniverseSpheres from './UniverseSperese.jsx';
import DynamicStarfield from './DynamicStarfield.jsx';
import MapNavigation from './Minimap';
import CullingManager from './CullingManager';
import UniverseReveal from './UniverseReveal.jsx';
import AudioManager from './AudioManager';
import WalletSearch from './WalletSearch';
import  TransactionAnalytics from './TransactionAnalytics'
import UniverseOptimizer from './UniverseOptimizer';
import WebGL from './WebGL'


// Constants
const WS_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`; 
//const WS_URL = 'ws://localhost:3000';
const TARGET_GALAXY_AMOUNT = 6000;
const MAX_GALAXY_AMOUNT = 7000;
const PLANETS_PER_GALAXY = 10;


const UniverseUpdater = ({ universeOptimizer, mainCameraRef, setFps }) => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    if (universeOptimizer.current && mainCameraRef.current) {
      universeOptimizer.current.updateVisibleChunks();
      
      // FPS calculation
      frameCount.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime.current;
      
      if (elapsed >= 1000) { // Update every second
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
    }
  });
  return null;
};


const Universe = () => {

  // State Management
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [walletSearchError, setWalletSearchError] = useState('');
  const [visibleObjects, setVisibleObjects] = useState(new Set());
  const [objectLODs, setObjectLODs] = useState(new Map());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [zoomPhase, setZoomPhase] = useState('none');
  const [universeRevealActive, setUniverseRevealActive] = useState(false);
  const [statusInfo, setStatusInfo] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [wsReconnectAttempt, setWsReconnectAttempt] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const universeOptimizer = useRef(new UniverseOptimizer());
  const [fps, setFps] = useState(60);
  const fpsInterval = useRef(null);
  const [isAlertShowing, setIsAlertShowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const mainCameraRef = useRef();
  const controlsRef = useRef();
  const wsRef = useRef(null);
  const lastGalaxyRef = useRef(null);
  const processedTransactions = useRef(new Set());
  const wheelSpeed = useRef(1);
  const allTransactionsRef = useRef(new Set());
  const galaxyPositionsRef = useRef(new Map());

  useEffect(() => {
    // Check both if it's first time ever AND first load this session
    const firstTimeEver = !localStorage.getItem('hasLoadedBefore');
    const hasReloadedThisSession = sessionStorage.getItem('hasReloadedThisSession');
    
    if (!hasReloadedThisSession) {
      // Set both flags
      localStorage.setItem('hasLoadedBefore', 'true');
      sessionStorage.setItem('hasReloadedThisSession', 'true');
      localStorage.setItem('skipWelcome', 'true');
      
      // Wait for initial load then reload
      const reloadTimer = setTimeout(() => {
        window.location.reload();
      }, 2500);
  
      return () => clearTimeout(reloadTimer);
    }
  }, []);



  const checkBounds = (position) => {
    const universeRadius = selectedGalaxy ? 40 : 2400;
    const distance = Math.sqrt(position.x * position.x + position.z * position.z);
    if (distance > universeRadius) {
      const ratio = universeRadius / distance;
      position.x *= ratio;
      position.z *= ratio;
    }
    
    const maxY = selectedGalaxy ? 30 : 1200;
    const minY = selectedGalaxy ? -30 : -1200;
    position.y = Math.max(minY, Math.min(maxY, position.y));
    
    return position;
  };

 
// Galaxy Position Calculator
  const calculateGalaxyPosition = useCallback((index, total) => {
    if (galaxyPositionsRef.current.has(index)) {
      return galaxyPositionsRef.current.get(index);
    }

    // Calculate position with improved distribution
    const layerSize = Math.ceil(Math.sqrt(total));
    const layer = Math.floor(index / layerSize);
    const indexInLayer = index % layerSize;
    
    const minRadius = 240;
    const maxRadius = 960;
    const verticalSpread = 360;
    const spiralFactor = 6;
    
    const layerRadiusMultiplier = (layer + 1) / Math.ceil(total / layerSize);
    const baseRadius = minRadius + (maxRadius - minRadius) * layerRadiusMultiplier;
    
    const angleOffset = (layer * Math.PI * 0.5) + (Math.random() * Math.PI * 0.25);
    const layerHeight = (layer - Math.floor(total / layerSize) / 2) * (verticalSpread / 2);
    
    const angle = (indexInLayer / layerSize) * Math.PI * 2 * spiralFactor + angleOffset;
    const radiusJitter = (Math.random() - 0.5) * baseRadius * 0.3;
    const finalRadius = baseRadius + radiusJitter;
    
    const position = [
      Math.cos(angle) * finalRadius,
      layerHeight + (Math.random() - 0.5) * verticalSpread,
      Math.sin(angle) * finalRadius
    ];
    
    galaxyPositionsRef.current.set(index, position);
    return position;
  }, []);

  const handleGalaxyClick = useCallback((galaxy) => {
    if (!mainCameraRef.current || !controlsRef.current) {
      console.warn('Camera or controls not initialized');
      return;
    }
  
    
    const initialGalaxy = {
      ...galaxy,
      transactions: galaxy.transactions.slice(0, 15) 
    };
    setSelectedGalaxy(initialGalaxy);
    
    const camera = mainCameraRef.current;
    const controls = controlsRef.current;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 2000;
    const startTime = Date.now();
  
    // Side view position (more to the side and slightly elevated)
    const finalPosition = new THREE.Vector3(50, 15, 0);
    const finalTarget = new THREE.Vector3(0, 0, 0);
    
    const zoomAnimation = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 4);
      
      // Calculate spiral path but maintaining side view approach
      const angle = progress * Math.PI * 1.5; // Reduced rotation for side approach
      const radius = startPosition.length() * (1 - eased) + 50 * eased;
      const spiralX = Math.cos(angle) * radius * (1 - eased) + finalPosition.x * eased;
      const spiralZ = Math.sin(angle) * radius * (1 - eased);
      const height = startPosition.y * (1 - eased) + finalPosition.y * eased;
      
      camera.position.set(
        spiralX,
        height,
        spiralZ
      );
      
      // Smoothly move target
      controls.target.lerpVectors(startTarget, finalTarget, eased);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(zoomAnimation);
      } else {
        // Animation complete - now progressively add remaining planets
        loadRemainingPlanets();
      }
    };
    
    const loadRemainingPlanets = () => {
      let currentCount = 15;
      const batchSize = 5; // Add 5 planets at a time
      const totalPlanets = galaxy.transactions.length;
      
      const addNextBatch = () => {
        if (currentCount >= totalPlanets) return;
        
        const nextBatch = Math.min(currentCount + batchSize, totalPlanets);
        setSelectedGalaxy(prev => ({
          ...galaxy,
          transactions: galaxy.transactions.slice(0, nextBatch)
        }));
        
        currentCount = nextBatch;
        
        // Schedule next batch
        setTimeout(() => requestAnimationFrame(addNextBatch), 50);
      };
      
      // Start adding planets
      requestAnimationFrame(addNextBatch);
    };
    
    // Start the animation
    zoomAnimation();
  }, [galaxies, calculateGalaxyPosition]);

  const handleBackToUniverse = useCallback(() => {
    if (!mainCameraRef.current || !controlsRef.current) {
      console.warn('Camera or controls not initialized');
      return;
    }
  
    console.log('Back to Universe clicked');
    setStatusInfo('');
    
    const camera = mainCameraRef.current;
    const controls = controlsRef.current;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 2000;
    const startTime = Date.now();

    // Final universe view position
    const finalPosition = new THREE.Vector3(0, 50, 100);
    const finalTarget = new THREE.Vector3(0, 0, 0);
    
    const zoomOutAnimation = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 4);
      
      // Calculate spiral path outward
      const angle = progress * Math.PI * 1.5; // Matching zoom-in rotation
      const radius = startPosition.length() * (1 - eased) + finalPosition.length() * eased;
      const spiralX = Math.cos(angle) * radius;
      const spiralZ = Math.sin(angle) * radius;
      const height = startPosition.y * (1 - eased) + finalPosition.y * eased;
      
      camera.position.set(
        spiralX,
        height,
        spiralZ
      );
      
      // Smoothly move target
      controls.target.lerpVectors(startTarget, finalTarget, eased);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(zoomOutAnimation);
      } else {
        // Only reset selection after animation completes
        setSelectedGalaxy(null);
        setSearchResult(null);
      }
    };
    
    zoomOutAnimation();
  }, [selectedGalaxy, galaxies, calculateGalaxyPosition]);

// Add useEffect to monitor state changes

useEffect(() => {
  console.log('Universe reveal active:', universeRevealActive);
}, [universeRevealActive]);// Add galaxies to dependencies

const handleKeyDown = useCallback((e) => {
  if (!controlsRef.current || !mainCameraRef.current) return;
  
  const camera = mainCameraRef.current;
  const controls = controlsRef.current;
  const moveSpeed = 50;
  
  const newPosition = camera.position.clone();
  const newTarget = controls.target.clone();
  
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      newPosition.z -= moveSpeed;
      newTarget.z -= moveSpeed;
      break;
    case 'ArrowDown':
    case 's':
      newPosition.z += moveSpeed;
      newTarget.z += moveSpeed;
      break;
    case 'ArrowLeft':
    case 'a':
      newPosition.x -= moveSpeed;
      newTarget.x -= moveSpeed;
      break;
    case 'ArrowRight':
    case 'd':
      newPosition.x += moveSpeed;
      newTarget.x += moveSpeed;
      break;
    case 'q':
      newPosition.y += moveSpeed;
      newTarget.y += moveSpeed;
      break;
    case 'e':
      newPosition.y -= moveSpeed;
      newTarget.y -= moveSpeed;
      break;
  }
  
  // Check and apply bounds
  camera.position.copy(checkBounds(newPosition));
  controls.target.copy(checkBounds(newTarget));
  controls.update();
}, [selectedGalaxy]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (!controlsRef.current || !mainCameraRef.current) return;
  
      const camera = mainCameraRef.current;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
  
      // Add distance check
      const currentDistance = camera.position.length();
      const maxDistance = selectedGalaxy ? 60 : 1200;
      const minDistance = selectedGalaxy ? 5 : 50;
  
      // Check current position bounds first
      if (selectedGalaxy) {
        const distanceToCenter = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
        if (distanceToCenter > maxDistance || distanceToCenter < minDistance) {
          return; // Already outside bounds, don't allow further movement
        }
      }
  
      // Calculate new position
      const delta = -Math.sign(e.deltaY);
      const speed = 15;
      const newPosition = camera.position.clone().addScaledVector(forward, delta * speed);
  
      // Check if new position would exceed bounds
      if (newPosition.length() > maxDistance || newPosition.length() < minDistance) {
        return; // Don't move if it would exceed bounds
      }
  
      // Apply movement if within bounds
      camera.position.copy(newPosition);
      controlsRef.current.target.addScaledVector(forward, delta * speed);
      controlsRef.current.update();
    };
  
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [selectedGalaxy]);


  useEffect(() => {
    let totalPlanets = 0;
    galaxies.forEach((galaxy, index) => {
      console.log(`Galaxy ${index} has ${galaxy.transactions.length} planets`);
      totalPlanets += galaxy.transactions.length;
    });
    console.log(`Total planets in galaxies: ${totalPlanets}`);
    console.log(`Solitary planets: ${solitaryPlanets.length}`);
  }, [galaxies, solitaryPlanets]);

  const groupTransactionsIntoGalaxies = useCallback((transactions) => {
    if (!transactions || transactions.length === 0) {
      return { galaxies: [], solitaryPlanets: [] };
    }

    const uniqueTransactions = Array.from(
      new Map(transactions.map(tx => [tx.hash, tx])).values()
    );
    
    const sortedTransactions = [...uniqueTransactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    
    for (const tx of sortedTransactions) {
      currentGalaxy.push(tx);
      currentSum += tx.amount;
      
      if (currentGalaxy.length >= PLANETS_PER_GALAXY) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
        currentGalaxy = [];
        currentSum = 0;
      }
    }

    if (currentGalaxy.length > 0) {
      if (currentGalaxy.length >= 13) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
      } else {
        currentGalaxy.forEach((tx, index) => {
          const targetGalaxy = galaxies[index % galaxies.length];
          targetGalaxy.transactions.push(tx);
          targetGalaxy.totalAmount += tx.amount;
        });
      }
    }

    return { galaxies, solitaryPlanets: [] };
  }, []);
 


  // Add smart galaxy management
  const handleNewTransaction = useCallback((newTransaction) => {
    console.log('Processing new transaction:', newTransaction.hash);
    
    // Don't process if already seen
    if (processedTransactions.current.has(newTransaction.hash)) {
      console.log('Transaction already processed:', newTransaction.hash);
      return;
    }
    
    processedTransactions.current.add(newTransaction.hash);
    
    // Update state
    setGalaxies(prevGalaxies => {
      const existingTransactions = prevGalaxies.flatMap(g => g.transactions);
      const allTransactions = [...existingTransactions, ...solitaryPlanets, newTransaction];
      
      const { galaxies: newGalaxies, solitaryPlanets: newSolitaryPlanets } = 
        groupTransactionsIntoGalaxies(allTransactions);
      
      // Update solitary planets
      setSolitaryPlanets(newSolitaryPlanets);
      
      return newGalaxies;
    });
    
    console.log('Transaction processed:', newTransaction.hash);
  }, [solitaryPlanets, groupTransactionsIntoGalaxies]);

  const transactionProcessor = useMemo(() => {
    let processingQueue = [];
    let isProcessing = false;
    
    return {
      addTransaction: (transaction) => {
        processingQueue.push(transaction);
        if (!isProcessing) {
          isProcessing = true;
          setTimeout(() => {
            const batch = processingQueue.splice(0, 50);
            batch.forEach(tx => handleNewTransaction(tx));
            isProcessing = false;
          }, 100);
        }
      }
    };
  }, [handleNewTransaction]);

  useEffect(() => {
    console.log('Establishing WebSocket connection...');
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'requestInitial' }));
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'initial') {
          if (galaxies.length === 0 && solitaryPlanets.length === 0) {
            const { galaxies: newGalaxies, solitaryPlanets: newPlanets } = 
              groupTransactionsIntoGalaxies(message.data);
            setGalaxies(newGalaxies);
            setSolitaryPlanets(newPlanets);
          }
        } else if (message.type === 'update') {
          transactionProcessor.addTransaction(message.data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
  
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    ws.onclose = (event) => {
      if (event.code !== 1000) {
        console.log('WebSocket disconnected unexpectedly, attempting to reconnect...');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          wsRef.current = new WebSocket(WS_URL);
        }, 5000);
      }
    };
  
    wsRef.current = ws;
  
    // Cleanup function


    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [transactionProcessor]); // Empty dependency array - only run on mount

  useEffect(() => {
    const totalTransactions = galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
      solitaryPlanets.length;
    console.log('Processed Transactions:', processedTransactions.current.size);
    console.log('Total Transactions in State:', totalTransactions);
  }, [galaxies, solitaryPlanets]);
  
  // Add smooth transition for new elements
  const getTransitionState = useCallback((transaction) => {
    const transitionStates = useRef(new Map());
    
    if (!transitionStates.current.has(transaction.hash)) {
      transitionStates.current.set(transaction.hash, {
        scale: 0,
        opacity: 0
      });
      
      // Animate in
      requestAnimationFrame(() => {
        transitionStates.current.set(transaction.hash, {
          scale: 1,
          opacity: 1
        });
      });
    }
    
    return transitionStates.current.get(transaction.hash);
  }, []);

  useEffect(() => {
    if (galaxies.length > 0) {
      lastGalaxyRef.current = galaxies.length - 1;
    }
  }, [galaxies]);

 
  const handleSearch = (e) => {
    e.preventDefault(); // Prevent form submission
    if (!searchQuery) return; // Guard against empty searches
    setSearchError('');
      
    try {
      // Search in galaxies
      for (const galaxy of galaxies) {
        const foundTransaction = galaxy.transactions.find(tx => 
          tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (foundTransaction) {
          setSelectedGalaxy(galaxy);
          setSearchResult(foundTransaction.hash);
          // Center camera on found transaction
          if (mainCameraRef.current && controlsRef.current) {
            const duration = 1000;
            const startTime = Date.now();
            const startPosition = {
              x: mainCameraRef.current.position.x,
              y: mainCameraRef.current.position.y,
              z: mainCameraRef.current.position.z
            };
            const endPosition = {
              x: 0,
              y: 25,
              z: 30
            };
            
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
              
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            
            animate();
          }
          return;
        }
      }
  
      // Search in solitary planets if not found in galaxies
      const foundPlanet = solitaryPlanets.find(tx => 
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
      if (foundPlanet) {
        setSearchResult(foundPlanet.hash);
        setSelectedGalaxy(null);
        // Your existing planet highlighting code...
      } else {
        setSearchError('Transaction not found');
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Error performing search');
    }
  };

  useEffect(() => {
    const fetchAndProcessTransactions = async () => {
      try {
        setLoading(true);
        let offset = 0;
        let allTransactions = [];
        let hasMore = true;
        let total = 0;
      
        // First get the total count
        try {
          const initialResponse = await fetch('http://localhost:3000/api/transactions?offset=0&limit=1');
          if (!initialResponse.ok) {
            throw new Error(`HTTP error! status: ${initialResponse.status}`);
          }
          const initialData = await initialResponse.json();
          total = initialData.total;
          console.log(`Total transactions to load: ${total}`);
        } catch (error) {
          console.error('Error fetching initial count:', error);
          setLoading(false);
          return;
        }
      
        // Then fetch all transactions in batches
        while (offset < total) {
          try {
            const response = await fetch(
              `http://localhost:3000/api/transactions?offset=${offset}&limit=1000`
            );
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.transactions || !Array.isArray(data.transactions)) {
              throw new Error("Received invalid data format");
            }
      
            allTransactions = [...allTransactions, ...data.transactions];
            console.log(`Loaded ${allTransactions.length}/${total} transactions`);
            
            // Do not update state during batch loading to improve performance
            offset += data.transactions.length;
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error('Error fetching batch:', error);
            break;
          }
        }
  
        // Process all transactions at once after loading is complete
        const { galaxies: finalGalaxies, solitaryPlanets: finalPlanets } = 
          groupTransactionsIntoGalaxies(allTransactions);
        
        // Update state only once at the end
        setGalaxies(finalGalaxies);
        setSolitaryPlanets(finalPlanets);
        setInitialLoadComplete(true);
        setLoading(false);
  
        console.log(`Final load complete. Total transactions: ${allTransactions.length}`);
        
      } catch (error) {
        console.error('Error in fetchAndProcessTransactions:', error);
        setLoading(false);
      }
    };
  
    fetchAndProcessTransactions();
  }, [groupTransactionsIntoGalaxies]);

  const galaxyPositions = galaxies.map((_, index) => 
    calculateGalaxyPosition(index, galaxies.length)
  );


  
  const handleWalletSearch = async (e) => {
    e.preventDefault();
    setWalletSearchError('');
    
    // Create a Set to store unique transaction hashes
    const seenHashes = new Set();
    
    // Get transactions from galaxies, ensuring uniqueness
    const buyTransactions = galaxies.flatMap(galaxy => 
      galaxy.transactions.filter(tx => {
        if (tx.toAddress.toLowerCase() === walletAddress.toLowerCase() && !seenHashes.has(tx.hash)) {
          seenHashes.add(tx.hash);
          return true;
        }
        return false;
      })
    );
  
    // Get transactions from solitary planets, ensuring uniqueness
    const solitaryBuyTransactions = solitaryPlanets.filter(tx =>
      tx.toAddress.toLowerCase() === walletAddress.toLowerCase() && !seenHashes.has(tx.hash)
    );
  
    // Combine unique transactions
    const transactions = [...buyTransactions, ...solitaryBuyTransactions];
    
    // Sort by amount (optional)
    transactions.sort((a, b) => b.amount - a.amount);
    
    setUserTransactions(transactions);
    setIsWalletView(true);
  
    if (transactions.length === 0) {
      setWalletSearchError('No transactions found for this wallet');
    }
  };
  
  const handleTransactionHighlight = (txHash) => {
    setSearchResult(txHash);
    
    const galaxyWithTx = galaxies.find(g => 
      g.transactions.some(tx => tx.hash === txHash)
    );
    
    if (galaxyWithTx) {
      setSelectedGalaxy(galaxyWithTx);
      setStatusInfo(`Selected Transaction: ${txHash.slice(0, 8)}... in Galaxy with ${galaxyWithTx.transactions.length} planets`);
    } else {
      const solitaryPlanet = solitaryPlanets.find(tx => tx.hash === txHash);
      if (solitaryPlanet) {
        setSelectedGalaxy(null);
        setStatusInfo(`Selected Solitary Planet - Amount: ${solitaryPlanet.amount.toFixed(2)}`);
        const planetPosition = calculateGalaxyPosition(
          solitaryPlanets.indexOf(solitaryPlanet) + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        
        // Animate camera to focus on the solitary planet
        if (mainCameraRef.current && controlsRef.current) {
          const duration = 1500; // Increased duration for smoother animation
          const startPosition = {
            x: mainCameraRef.current.position.x,
            y: mainCameraRef.current.position.y,
            z: mainCameraRef.current.position.z
          };
          
          // Calculate a better viewing position
          const distance = 30; // Closer view of the planet
          const angle = Math.atan2(planetPosition[2], planetPosition[0]);
          const endPosition = {
            x: planetPosition[0] + Math.cos(angle) * distance,
            y: planetPosition[1] + 10, // Slight elevation
            z: planetPosition[2] + Math.sin(angle) * distance
          };
          
          const startTime = Date.now();
          const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic easing
            
            // Update camera position
            mainCameraRef.current.position.set(
              startPosition.x + (endPosition.x - startPosition.x) * eased,
              startPosition.y + (endPosition.y - startPosition.y) * eased,
              startPosition.z + (endPosition.z - startPosition.z) * eased
            );
            
            // Update controls target to center on planet
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
  
    const clearWalletSearch = () => {
      setWalletAddress('');
      setUserTransactions([]);
      setIsWalletView(false);
      setWalletSearchError('');
      setSearchResult(null);
    };

    const handleSetVisible = useCallback((newVisible) => {
      setVisibleObjects(newVisible);
    }, []);

    useEffect(() => {
      const camera = mainCameraRef.current;
      const controls = controlsRef.current;
      if (camera && controls) {
        console.log('Camera and controls initialized');
        universeOptimizer.current.initializeChunks(camera);
      }
    }, [mainCameraRef, controlsRef]);

    useEffect(() => {
      if (galaxies.length > 0 && mainCameraRef.current) {
        const positions = galaxies.map((_, index) => 
          calculateGalaxyPosition(index, galaxies.length)
        );
        universeOptimizer.current.updateChunks(galaxies, positions);
      }
    }, [galaxies, calculateGalaxyPosition]);
    
  
    useEffect(() => {
      if (selectedGalaxy) {
        console.log('Selected galaxy:', galaxies.indexOf(selectedGalaxy));
        console.log('Galaxy transactions:', selectedGalaxy.transactions.length);
      }
    }, [selectedGalaxy, galaxies]);

  


   

    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
       <AudioManager 
  isMapExpanded={isMapExpanded}
  selectedGalaxy={selectedGalaxy}
  // Remove the onBackToUniverse prop to prevent duplicate back button
  onChange={setIsMuted}
/>
  
  <div style={{
  position: 'fixed',
  top: '0px', // Align with minimap height
  right: '0px',
  zIndex: 1000,
  width: 'auto',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  '@media (max-width: 768px)': {
    top: '30px' // Slightly adjust for mobile if needed
  }
}}>
  <WalletSearch 
    galaxies={galaxies}
    solitaryPlanets={solitaryPlanets}
    onTransactionSelect={(hash, galaxy) => {
      setSearchResult(hash);
      setSelectedGalaxy(galaxy);
    }}
    mainCameraRef={mainCameraRef}
    controlsRef={controlsRef}
    calculateGalaxyPosition={calculateGalaxyPosition}
  />
</div>

<div style={{
  position: 'fixed',
  bottom: 0,
  right: '8px',  // Always align to right
  width: window.innerWidth <= 768 ? '100%' : '400px',
  padding: window.innerWidth <= 768 ? '10px' : '20px',
  zIndex: 10,
  display: 'flex',
  justifyContent: 'flex-end', // Align content to right
  alignItems: 'center'
}}>
  <div style={{ 
    width: window.innerWidth <= 768 ? 'auto' : '400px',
    maxWidth: '100%'
  }}>
    <TransactionAnalytics 
      galaxies={galaxies}
      solitaryPlanets={solitaryPlanets}
      handleTransactionHighlight={handleTransactionHighlight}
      onAlertStateChange={setIsAlertShowing}
    />
  </div>
</div>
  
        {/* Main Canvas */}
        <Canvas 
          camera={{ 
            position: [0, 50, 100], 
            fov: 65,
            far: 2000,
            near: 0.1,
            up: [0, 1, 0]
          }} 
          onCreated={({ gl, camera }) => {
            mainCameraRef.current = camera;
            
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.powerPreference = 'high-performance';
            gl.preserveDrawingBuffer = true;
            universeOptimizer.current.initializeChunks(camera);
          }}
          fallback={
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              background: 'rgba(0,0,0,0.8)',
              padding: '20px',
              borderRadius: '10px'
            }}>
              Loading 3D Scene...
            </div>
          }
        >
          <Suspense fallback={null}>
            <WebGL/>
            <UniverseUpdater 
      universeOptimizer={universeOptimizer}
      mainCameraRef={mainCameraRef}
      setFps={setFps}
    />
  
            {universeRevealActive && (
              <UniverseReveal active={true} />
            )}
  
            {!universeRevealActive && (
              <>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.2} />
                <UniverseSpheres 
                  selectedGalaxy={selectedGalaxy}
                  zoomPhase={zoomPhase}
                />
                <DynamicStarfield />
                
                <CullingManager
                  galaxies={galaxies}
                  solitaryPlanets={solitaryPlanets}
                  selectedGalaxy={selectedGalaxy}
                  searchResult={searchResult}
                  calculateGalaxyPosition={calculateGalaxyPosition}
                  onSetVisible={handleSetVisible}
                />
  
                {selectedGalaxy ? (
                  <SpiralGalaxy 
                    transactions={selectedGalaxy.transactions}
                    position={[0, 0, 0]}
                    isSelected={true}
                    colorIndex={galaxies.findIndex(g => g === selectedGalaxy)}
                    highlightedHash={searchResult}
                    lodLevel={objectLODs.get(`galaxy-${galaxies.findIndex(g => g === selectedGalaxy)}`) || 'HIGH'}
                  />
                ) : (
                  <>
                    {galaxies.map((galaxy, index) => {
  const position = calculateGalaxyPosition(index, galaxies.length);
  return visibleObjects.has(`galaxy-${index}`) && 
        universeOptimizer.current.shouldRenderGalaxy(index, position) && (
    <SpiralGalaxy
      key={index}
      transactions={galaxy.transactions}
      position={position}
      onClick={() => handleGalaxyClick(galaxy)}
      isSelected={false}
      colorIndex={index}
      // Remove the isMuted prop since it's handled centrally by AudioManager
      lodLevel={universeOptimizer.current.getLODLevel(
        mainCameraRef.current ? 
          mainCameraRef.current.position.distanceTo(new THREE.Vector3(...position))
          : 1000,
        fps
      )}
    />
  );
})}
  
                    {solitaryPlanets.map((tx, index) => (
                      visibleObjects.has(`planet-${index}`) && (
                        <Planet
                          key={tx.hash}
                          transaction={tx}
                          position={calculateGalaxyPosition(
                            index + galaxies.length,
                            solitaryPlanets.length + galaxies.length
                          )}
                          baseSize={2}
                          colorIndex={index}
                          isHighlighted={tx.hash === searchResult}
                          lodLevel={objectLODs.get(`planet-${index}`) || 'HIGH'}
                        />
                      )
                    ))}
                  </>
                )}
                
                <OrbitControls 
  ref={controlsRef}
  enableZoom={true}
  maxDistance={selectedGalaxy ? 60 : 1200}
  minDistance={selectedGalaxy ? 5 : 50}
  onChange={() => {
    if (!mainCameraRef.current || !controlsRef.current) return;
    
    // Throttle the optimizer updates to prevent excessive calls
    if (!controlsRef.current._optimizerTimeout) {
      controlsRef.current._optimizerTimeout = setTimeout(() => {
        universeOptimizer.current.updateVisibleChunks();
        controlsRef.current._optimizerTimeout = null;
      }, 16); // Roughly one frame
    }
    
    const camera = mainCameraRef.current;
    const controls = controlsRef.current;
    
    // Get boundaries based on current mode
    const maxRadius = selectedGalaxy ? 60 : 1200;
    const minRadius = selectedGalaxy ? 5 : 50;
    const maxY = selectedGalaxy ? 30 : 600;
    const minY = selectedGalaxy ? -30 : -600;
    
    // Get current camera direction and up vector
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Calculate bounds
    const targetDistance = camera.position.distanceTo(controls.target);
    
    // Handle zoom bounds
    if (targetDistance > maxRadius || targetDistance < minRadius) {
      const clampedDistance = Math.min(Math.max(targetDistance, minRadius), maxRadius);
      const offset = direction.multiplyScalar(-clampedDistance);
      camera.position.copy(controls.target).add(offset);
    }
    
    // Handle Y-axis bounds without affecting direction
    if (camera.position.y > maxY || camera.position.y < minY) {
      camera.position.y = Math.min(Math.max(camera.position.y, minY), maxY);
    }
    
    // Handle radial bounds for panning while preserving direction
    const horizontalPosition = new THREE.Vector2(camera.position.x, camera.position.z);
    const horizontalDistance = horizontalPosition.length();
    
    if (horizontalDistance > maxRadius) {
      const scale = maxRadius / horizontalDistance;
      camera.position.x *= scale;
      camera.position.z *= scale;
      
      // Adjust target proportionally to maintain viewing angle
      const targetHorizontal = new THREE.Vector2(controls.target.x, controls.target.z);
      const targetDistance = targetHorizontal.length();
      if (targetDistance > maxRadius) {
        const targetScale = maxRadius / targetDistance;
        controls.target.x *= targetScale;
        controls.target.z *= targetScale;
      }
    }
  }}
  autoRotate={!selectedGalaxy}
  autoRotateSpeed={0.2} // Reduced for smoother default rotation
  maxPolarAngle={Math.PI * 0.75}
  minPolarAngle={Math.PI * 0.25}
  zoomSpeed={0.6} // Further reduced for more controlled zoom
  rotateSpeed={0.5} // Slightly increased for smoother rotation
  panSpeed={1.5} // Reduced for more controlled panning
  enableDamping={true}
  dampingFactor={0.15} // Adjusted for smoother movement
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }}
  screenSpacePanning={false} // Changed to false to prevent vertical panning issues
  enablePan={true}
  keyPanSpeed={15} // Reduced for more controlled keyboard panning
/>
              </>
            )}
          </Suspense>
        </Canvas>
  
        {/* Status Info */}
        {
        <div style={{ 
          bottom: '5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    color: 'white',
    background: 'rgba(0,0,0,0.7)',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontFamily: 'monospace',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    fontSize: '1.1rem',
    maxWidth: '80%',
    textAlign: 'center',
    opacity: statusInfo ? 1 : 0,
    transition: 'opacity 0.3s ease'
        }}>
          {statusInfo}
        </div>
}
  
        {/* Minimap */}
        {!selectedGalaxy && (
  <MapNavigation 
    mainCamera={mainCameraRef.current}
    controlsRef={controlsRef}
    galaxyPositions={galaxyPositions}
    onNavigate={() => {}}
    selectedGalaxy={null}
    onExpandChange={setIsMapExpanded} 
  />
)}
  
        {/* Stats */}
        {process.env.NODE_ENV === 'development' && (
  <div style={{
    position: 'absolute',
    bottom: window.innerWidth <= 768 
      ? isAlertShowing ? '200px' : '150px'
      : '20px',
    left: '20px',
    color: 'white',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '12px 15px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: window.innerWidth <= 480 ? '11px' : '14px',
    zIndex: 10,
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    width: window.innerWidth <= 768 ? '120px' : '140px',
    transition: 'all 0.3s ease'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      whiteSpace: 'nowrap'
    }}>
      <span>FPS:</span>
      <span>{Math.min(fps, 120)}</span>
    </div>
    {/* Chunks and Loaded stats removed */}
  </div>
)}
        {/* <div style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          left: '1rem', 
          zIndex: 10, 
          display: 'flex', 
          gap: '1rem',
          color: 'white',
          background: 'rgba(0,0,0,0.5)',
          padding: '1rem',
          borderRadius: '0.5rem',
          fontFamily: 'monospace'
        }}>
          <div>Galaxies: {galaxies.length}</div>
          <div>|</div>
          <div>Solitary Planets: {solitaryPlanets.length}</div>
          <div>|</div>
          <div>Total Transactions: {
            galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
            solitaryPlanets.length
          }</div>
        </div> */}
  
        {/* Back to Universe Button */}
        {selectedGalaxy && (
         <button
        style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '10px',
      background: 'rgba(0, 0, 0, 0.3)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',  // Changed to make it perfectly circular
      cursor: 'pointer',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.4s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',  // Added to center the icon
      gap: '8px',
      fontSize: '14px',
      height: '55px',
      width: '55px',  // Changed minWidth to width for exact sizing
      outline: 'none',  // Added to remove focus outline
      zIndex: 1000,   // Match other button widths
        }}
       onMouseEnter={(e) => {
      e.target.style.border = '1px solid rgba(0, 157, 255, 0.8)';  // Added blue border
      e.target.style.boxShadow = '0 0 10px rgba(0, 157, 255, 0.3)';  // Added subtle blue glow
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'rgba(0, 0, 0, 0.3)';
      e.target.style.transform = 'scale(1)';
      e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';  // Reset border
      e.target.style.boxShadow = 'none';  // Remove glow
    }}
    onClick={handleBackToUniverse}
    aria-label="Back to Universe"
  >
    <i 
      className="ri-arrow-left-line" 
      style={{ 
        fontSize: '1.2em',
        pointerEvents: 'none',
        transition: 'color 0.4s ease-in-out' // Added to prevent icon from interfering with hover
      }} 
    />
  </button>
      )}
      {loading && galaxies.length === 0 && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    background: 'rgba(0,0,0,0.8)',
    padding: '20px',
    borderRadius: '10px',
    zIndex: 1000
  }}>
    <div>Loading Initial Transactions...</div>
    {galaxies.length > 0 && (
      <div>
        Processed: {
          galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
          solitaryPlanets.length
        }
      </div>
    )}
  </div>
)}
    </div>
  );
};

export default Universe;