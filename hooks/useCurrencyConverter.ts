import { useState, useEffect, useRef } from 'react';
import { Expense } from '../types';
import { CURRENCY_API_KEY } from '../services/apiKeys';

// This custom hook centralizes all currency conversion logic.
// It handles fetching historical rates, the 365-day look-back,
// validation for future/old dates, and manages all related state.

interface UseCurrencyConverterParams {
  date: string;
  currency: string;
  amount: string;
  initialExchangeRate?: string;
}

export const useCurrencyConverter = ({ date, currency, amount, initialExchangeRate }: UseCurrencyConverterParams) => {
  const [exchangeRate, setExchangeRate] = useState(initialExchangeRate || '');
  const [conversionResult, setConversionResult] = useState<string | null>(null);
  const [conversionData, setConversionData] = useState<Expense['conversionDetails'] | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const isInitialMount = useRef(true); // Track initial render to prevent fetch on mount if rate exists

  // Effect for fetching the exchange rate based on date and currency changes
  useEffect(() => {
    // On the very first render, if we already have an initial rate, don't fetch.
    if (isInitialMount.current && initialExchangeRate) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false; // After the first run, it's no longer the initial mount.

    const fetchRate = async () => {
      // Don't fetch if currency is INR or date is not set
      if (currency === 'INR' || !date) {
        setExchangeRate('');
        setConversionResult(null);
        setConversionData(null);
        return;
      }
      
      const apiKey: string = CURRENCY_API_KEY;
      if (!apiKey || apiKey === "YOUR_CURRENCY_API_KEY_HERE") {
        setConversionResult("Currency API key not configured. Please enter manually.");
        setIsFetchingRate(false);
        return;
      }

      // Timezone-safe date comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set time to the beginning of the day for accurate comparison

      const [year, month, day] = date.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); // Month is 0-indexed in JS

      if (selectedDate > today) {
        setConversionResult('Cannot fetch rates for future dates.');
        setExchangeRate(''); // Clear any previous rate
        setConversionData(null);
        setIsFetchingRate(false);
        return;
      }

      const yearAgo = new Date();
      yearAgo.setHours(0, 0, 0, 0);
      yearAgo.setDate(yearAgo.getDate() - 365);

      if (selectedDate < yearAgo) {
        setConversionResult('Cannot fetch rates older than 365 days. Please enter manually.');
        setExchangeRate(''); // Clear any previous rate
        setConversionData(null);
        setIsFetchingRate(false);
        return;
      }
      
      setIsFetchingRate(true);
      setConversionResult('Fetching rate...');
      setExchangeRate(''); // Clear old rate while fetching new one

      let rateFound = false;
      for (let i = 0; i < 365; i++) { // Extended look-back to 365 days
        const lookBackDate = new Date(selectedDate);
        lookBackDate.setDate(lookBackDate.getDate() - i);
        if (lookBackDate < yearAgo) break;

        const dateString = lookBackDate.toISOString().split('T')[0];
        try {
          const url = `https://api.currencyapi.com/v3/historical?date=${dateString}&base_currency=${currency.toUpperCase()}&currencies=INR`;
          const response = await fetch(url, {
            headers: { 'apikey': apiKey }
          });

          if (response.ok) {
            const data = await response.json();
            const rate = data.data?.INR?.value;
            if (rate) {
              setExchangeRate(rate.toString());
              setConversionResult(i > 0 ? `Rate from ${dateString}` : null); // Show fallback date
              rateFound = true;
              break;
            }
          }
        } catch (err) { 
          console.error("Currency API fetch error:", err);
          // Continue loop on fetch error to try previous day
        }
      }

      if (!rateFound) {
        setConversionResult('No recent rate found. Please enter manually.');
      }
      setIsFetchingRate(false);
    };

    fetchRate();
  }, [date, currency]);


  // Effect for calculating the final INR amount
  useEffect(() => {
    const numericAmount = parseFloat(amount);
    const rate = parseFloat(exchangeRate);
    
    if (currency !== 'INR' && !isNaN(numericAmount) && numericAmount > 0 && !isNaN(rate) && rate > 0) {
      const convertedAmount = numericAmount * rate;
      setConversionData({
        baseCurrency: 'INR',
        exchangeRate: rate,
        convertedAmount,
      });
      // Don't overwrite the status message if we are fetching or have an error
      if (!isFetchingRate && !conversionResult?.includes('Rate from') && !conversionResult?.includes('enter manually')) {
         setConversionResult(`≈ ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(convertedAmount)}`);
      }
    } else {
      setConversionData(null);
      if (currency === 'INR') {
        setConversionResult(null);
      }
    }
  }, [amount, exchangeRate, currency, isFetchingRate, conversionResult]);

  return {
    exchangeRate,
    setExchangeRate,
    conversionResult,
    conversionData,
    isFetchingRate,
  };
};
