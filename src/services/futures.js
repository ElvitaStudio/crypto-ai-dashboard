import axios from 'axios';

const FAPI = 'https://fapi.binance.com';

export async function fetchPremiumIndex() {
  try {
    const { data } = await axios.get(`${FAPI}/fapi/v1/premiumIndex`);
    return data
      .filter((item) => item.symbol?.endsWith('USDT') && !item.symbol.includes('_'))
      .map((item) => ({
        symbol: item.symbol,
        fundingRate: parseFloat(item.lastFundingRate || 0),
        nextFundingTime: item.nextFundingTime,
      }));
  } catch {
    return [];
  }
}

export async function fetchOpenInterest(symbol) {
  try {
    const { data } = await axios.get(`${FAPI}/fapi/v1/openInterest`, {
      params: { symbol },
    });
    return {
      openInterest: parseFloat(data.openInterest || 0),
      symbol: data.symbol,
    };
  } catch {
    return null;
  }
}

export async function fetchOpenInterestHist(symbol, period = '1h', limit = 24) {
  try {
    const { data } = await axios.get(`${FAPI}/futures/data/openInterestHist`, {
      params: { symbol, period, limit },
    });
    return data.map((item) => ({
      timestamp: item.timestamp,
      sumOpenInterest: parseFloat(item.sumOpenInterest || 0),
      sumOpenInterestValue: parseFloat(item.sumOpenInterestValue || 0),
    }));
  } catch {
    return [];
  }
}
