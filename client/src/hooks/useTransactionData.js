import { useState, useEffect } from 'react';

const GALAXY_THRESHOLD = 2000;

export const useTransactionData = () => {
  const [transactions, setTransactions] = useState([]);
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transactions');
        const data = await response.json();
        console.log('Fetched transactions:', data); // Debug log
        
        if (!Array.isArray(data)) {
          console.error('Expected array of transactions, got:', data);
          return;
        }

        // Sort transactions by amount in descending order
        const sortedTransactions = [...data].sort((a, b) => b.amount - a.amount);
        
        let currentSum = 0;
        let currentGalaxy = [];
        const galaxyGroups = [];
        const solitary = [];

        sortedTransactions.forEach(transaction => {
          if (currentSum < GALAXY_THRESHOLD) {
            currentGalaxy.push(transaction);
            currentSum += transaction.amount;
          } else if (currentGalaxy.length > 0) {
            galaxyGroups.push({
              id: `galaxy-${galaxyGroups.length}`,
              transactions: currentGalaxy,
              totalAmount: currentSum
            });
            currentGalaxy = [transaction];
            currentSum = transaction.amount;
          } else {
            solitary.push(transaction);
          }
        });

        if (currentGalaxy.length > 0) {
          if (currentSum >= GALAXY_THRESHOLD) {
            galaxyGroups.push({
              id: `galaxy-${galaxyGroups.length}`,
              transactions: currentGalaxy,
              totalAmount: currentSum
            });
          } else {
            solitary.push(...currentGalaxy);
          }
        }

        console.log('Processed data:', { // Debug log
          galaxies: galaxyGroups,
          solitaryPlanets: solitary
        });

        setGalaxies(galaxyGroups);
        setSolitaryPlanets(solitary);
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, []);

  return { transactions, galaxies, solitaryPlanets };
};