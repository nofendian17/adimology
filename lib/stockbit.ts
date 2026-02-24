import type { MarketDetectorResponse, OrderbookResponse, BrokerData, WatchlistResponse, BrokerSummaryData, EmitenInfoResponse, KeyStatsResponse, KeyStatsData, KeyStatsItem, WatchlistGroup } from './types';

const STOCKBIT_BASE_URL = 'https://exodus.stockbit.com';

// Delay helper for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const REQUEST_DELAY = 300; // 300ms delay between requests

// Error class for authentication failures
export class TokenExpiredError extends Error {
  constructor(message: string = 'Authentication failed. Check STOCKBIT_USERNAME and STOCKBIT_PASSWORD environment variables.') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

// In-memory token cache
let cachedToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokenExpiry: Date | null = null;
let refreshTokenExpiry: Date | null = null;

// Sector cache
const sectorCache = new Map<string, { sector: string; name?: string; price?: string; timestamp: number }>();
const SECTOR_CACHE_DURATION = 3600000;

let sectorsListCache: { sectors: string[]; timestamp: number } | null = null;
const SECTORS_LIST_CACHE_DURATION = 86400000;

interface LoginTokenData {
  access: { token: string; expired_at: string };
  refresh: { token: string; expired_at: string };
}

async function loginStockbit(): Promise<LoginTokenData> {
  const username = process.env.STOCKBIT_USERNAME;
  const password = process.env.STOCKBIT_PASSWORD;
  const playerId = process.env.STOCKBIT_PLAYER_ID;

  if (!username || !password || !playerId) {
    throw new TokenExpiredError('Missing STOCKBIT_USERNAME, STOCKBIT_PASSWORD, or STOCKBIT_PLAYER_ID environment variables');
  }

  // Add delay before login request
  await delay(REQUEST_DELAY);

  const response = await fetch(`${STOCKBIT_BASE_URL}/login/v5/username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'origin': 'https://stockbit.com',
      'referer': 'https://stockbit.com/',
    },
    body: JSON.stringify({
      player_id: playerId,
      user: username,
      password: password,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new TokenExpiredError(`Login failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const tokenData = data.data?.login?.token_data;
  
  if (!tokenData?.access?.token) {
    throw new TokenExpiredError('Invalid login response: missing access token');
  }

  cachedToken = tokenData.access.token;
  cachedRefreshToken = tokenData.refresh?.token || null;
  tokenExpiry = new Date(tokenData.access.expired_at);
  refreshTokenExpiry = tokenData.refresh?.expired_at ? new Date(tokenData.refresh.expired_at) : null;

  console.log(`[Stockbit] Login successful. Token expires at: ${tokenExpiry?.toISOString()}`);

  return tokenData;
}

async function refreshAuthToken(): Promise<string> {
  if (!cachedRefreshToken) {
    console.log('[Stockbit] No refresh token available, performing full login');
    const tokenData = await loginStockbit();
    return tokenData.access.token;
  }

  // Check if refresh token itself is expired
  if (refreshTokenExpiry && refreshTokenExpiry.getTime() < Date.now()) {
    console.log('[Stockbit] Refresh token expired, performing full login');
    const tokenData = await loginStockbit();
    return tokenData.access.token;
  }

  console.log('[Stockbit] Attempting token refresh...');
  
  // Add delay before refresh request
  await delay(REQUEST_DELAY);

  try {
    const response = await fetch(`${STOCKBIT_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'origin': 'https://stockbit.com',
        'referer': 'https://stockbit.com/',
      },
      body: JSON.stringify({
        refresh_token: cachedRefreshToken,
      }),
    });

    if (!response.ok) {
      console.log(`[Stockbit] Token refresh failed: ${response.status}, falling back to login`);
      const tokenData = await loginStockbit();
      return tokenData.access.token;
    }

    const data = await response.json();
    const tokenData = data.data;
    
    if (!tokenData?.access?.token) {
      console.log('[Stockbit] Invalid refresh response, falling back to login');
      const tokenData = await loginStockbit();
      return tokenData.access.token;
    }

    cachedToken = tokenData.access.token;
    cachedRefreshToken = tokenData.refresh?.token || cachedRefreshToken;
    tokenExpiry = new Date(tokenData.access.expired_at);
    refreshTokenExpiry = tokenData.refresh?.expired_at ? new Date(tokenData.refresh.expired_at) : refreshTokenExpiry;

    console.log(`[Stockbit] Token refreshed successfully. New token expires at: ${tokenExpiry?.toISOString()}`);

    return tokenData.access.token;
  } catch (error) {
    console.error('[Stockbit] Token refresh error:', error);
    const tokenData = await loginStockbit();
    return tokenData.access.token;
  }
}

async function getAuthToken(): Promise<string> {
  if (cachedToken && tokenExpiry) {
    const bufferMs = 5 * 60 * 1000;
    if (tokenExpiry.getTime() - bufferMs > Date.now()) {
      console.log('[Stockbit] Using cached token (not expired)');
      return cachedToken;
    }
    
    // Token is expired or about to expire, try refresh first
    console.log('[Stockbit] Token expired or expiring soon, attempting refresh');
    return refreshAuthToken();
  }

  // No token cached, perform full login
  console.log('[Stockbit] No cached token, performing full login');
  const tokenData = await loginStockbit();
  return tokenData.access.token;
}

async function getHeaders(): Promise<HeadersInit> {
  return {
    'accept': 'application/json',
    'authorization': `Bearer ${await getAuthToken()}`,
    'origin': 'https://stockbit.com',
    'referer': 'https://stockbit.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,id;q=0.7',
  };
}

async function handleApiResponse(response: Response, apiName: string): Promise<void> {
  if (response.status === 401) {
    // Don't clear cache here - let the retry logic handle it
    console.log(`[Stockbit] ${apiName} returned 401, will trigger token refresh`);
    throw new TokenExpiredError(`${apiName}: Authentication failed (401)`);
  }
  
  if (!response.ok) {
    throw new Error(`${apiName} error: ${response.status} ${response.statusText}`);
  }
}

async function apiCallWithRetry<T>(
  apiName: string,
  callFn: () => Promise<Response>,
  parseFn: (response: Response) => Promise<T> = (r) => r.json()
): Promise<T> {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    
    // Add delay before each API call
    await delay(REQUEST_DELAY);
    
    try {
      const response = await callFn();
      await handleApiResponse(response, apiName);
      return await parseFn(response);
    } catch (error) {
      if (error instanceof TokenExpiredError && attempts < maxAttempts) {
        // Clear cached token to force refresh on next attempt
        console.log(`[Stockbit] ${apiName}: Clearing token cache for retry attempt ${attempts + 1}`);
        cachedToken = null;
        tokenExpiry = null;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`${apiName}: Max retry attempts reached`);
}

/**
 * Fetch all watchlist groups
 */
export async function fetchWatchlistGroups(): Promise<WatchlistGroup[]> {
  const response = await apiCallWithRetry<{ data: WatchlistGroup[] }>('Watchlist Groups API', async () => {
    const url = `${STOCKBIT_BASE_URL}/watchlist?page=1&limit=500`;
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
  return response.data || [];
}

/**
 * Fetch Watchlist data by ID (or default if not provided)
 */
export async function fetchWatchlist(watchlistId?: number): Promise<WatchlistResponse> {
  let id = watchlistId;

  // If no ID provided, get default watchlist ID
  if (!id) {
    const groups = await fetchWatchlistGroups();
    const defaultGroup = groups.find(w => w.is_default) || groups[0];
    id = defaultGroup?.watchlist_id;
    if (!id) throw new Error('No watchlist found');
  }

  // Fetch watchlist details
  return apiCallWithRetry<WatchlistResponse>('Watchlist Detail API', async () => {
    const detailUrl = `${STOCKBIT_BASE_URL}/watchlist/${id}?page=1&limit=500`;
    return fetch(detailUrl, {
      method: 'GET',
      headers: await getHeaders(),
    });
  }, async (response) => {
    const json = await response.json();
    // Map symbol to company_code for compatibility
    if (json.data?.result) {
      json.data.result = json.data.result.map((item: any) => ({
        ...item,
        company_code: item.symbol || item.company_code
      }));
    }
    return json;
  });
}

/**
 * Fetch Market Detector data (broker information)
 */
export async function fetchMarketDetector(
  emiten: string,
  fromDate: string,
  toDate: string
): Promise<MarketDetectorResponse> {
  const url = new URL(`${STOCKBIT_BASE_URL}/marketdetectors/${emiten}`);
  url.searchParams.append('from', fromDate);
  url.searchParams.append('to', toDate);
  url.searchParams.append('transaction_type', 'TRANSACTION_TYPE_NET');
  url.searchParams.append('market_board', 'MARKET_BOARD_REGULER');
  url.searchParams.append('investor_type', 'INVESTOR_TYPE_ALL');
  url.searchParams.append('limit', '25');

  return apiCallWithRetry<MarketDetectorResponse>('Market Detector API', async () => {
    return fetch(url.toString(), {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
}

/**
 * Fetch Orderbook data (market data)
 */
export async function fetchOrderbook(emiten: string): Promise<OrderbookResponse> {
  const url = `${STOCKBIT_BASE_URL}/company-price-feed/v2/orderbook/companies/${emiten}`;

  return apiCallWithRetry<OrderbookResponse>('Orderbook API', async () => {
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
}

/**
 * Fetch Emiten Info (including sector)
 */
export async function fetchEmitenInfo(emiten: string): Promise<EmitenInfoResponse> {
  // Check cache first
  const cached = sectorCache.get(emiten.toUpperCase());
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < SECTOR_CACHE_DURATION) {
    // Return cached data in the expected format
    return {
      data: {
        sector: cached.sector,
        sub_sector: '',
        symbol: emiten,
        name: cached.name || '',
        price: cached.price || '0',
        change: '0',
        percentage: 0,
      },
      message: 'Successfully retrieved company data (cached)',
    };
  }

  const url = `${STOCKBIT_BASE_URL}/emitten/${emiten}/info`;

  const data = await apiCallWithRetry<EmitenInfoResponse>('Emiten Info API', async () => {
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
  
  // Cache the sector data
  if (data.data?.sector) {
    sectorCache.set(emiten.toUpperCase(), {
      sector: data.data.sector,
      name: data.data.name,
      price: data.data.price,
      timestamp: now,
    });
  }

  return data;
}

/**
 * Fetch all sectors list
 */
export async function fetchSectors(): Promise<string[]> {
  const now = Date.now();
  
  // Check cache first
  if (sectorsListCache && (now - sectorsListCache.timestamp) < SECTORS_LIST_CACHE_DURATION) {
    return sectorsListCache.sectors;
  }

  const url = `${STOCKBIT_BASE_URL}/emitten/sectors`;

  const data = await apiCallWithRetry<{ data: { name: string }[] }>('Sectors API', async () => {
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });

  const sectors: string[] = (data.data || []).map((item: { name: string }) => item.name).filter(Boolean);
  
  // Cache the sectors list
  sectorsListCache = {
    sectors,
    timestamp: now,
  };

  return sectors;
}

/**
 * Get top broker by BVAL from Market Detector response
 */
export function getTopBroker(marketDetectorData: MarketDetectorResponse): BrokerData | null {
  // The actual data is wrapped in 'data' property
  const brokers = marketDetectorData?.data?.broker_summary?.brokers_buy;

  if (!brokers || !Array.isArray(brokers) || brokers.length === 0) {
    return null;
  }

  // Sort by bval descending and get the first one
  const topBroker = [...brokers].sort((a, b) => Number(b.bval) - Number(a.bval))[0];

  return {
    bandar: topBroker.netbs_broker_code,
    barangBandar: Math.round(Number(topBroker.blot)),
    rataRataBandar: Math.round(Number(topBroker.netbs_buy_avg_price)),
  };
}

/**
 * Helper to parse lot string (e.g., "25,322,000" -> 25322000)
 */
export function parseLot(lotStr: string): number {
  if (!lotStr) return 0;
  return Number(lotStr.replace(/,/g, ''));
}

/**
 * Get broker summary data from Market Detector response
 */
export function getBrokerSummary(marketDetectorData: MarketDetectorResponse): BrokerSummaryData {
  const detector = marketDetectorData?.data?.bandar_detector;
  const brokerSummary = marketDetectorData?.data?.broker_summary;

  // Provide safe defaults if data is missing
  return {
    detector: {
      top1: detector?.top1 || { vol: 0, percent: 0, amount: 0, accdist: '-' },
      top3: detector?.top3 || { vol: 0, percent: 0, amount: 0, accdist: '-' },
      top5: detector?.top5 || { vol: 0, percent: 0, amount: 0, accdist: '-' },
      avg: detector?.avg || { vol: 0, percent: 0, amount: 0, accdist: '-' },
      total_buyer: detector?.total_buyer || 0,
      total_seller: detector?.total_seller || 0,
      number_broker_buysell: detector?.number_broker_buysell || 0,
      broker_accdist: detector?.broker_accdist || '-',
      volume: detector?.volume || 0,
      value: detector?.value || 0,
      average: detector?.average || 0,
    },
    topBuyers: brokerSummary?.brokers_buy?.slice(0, 4) || [],
    topSellers: brokerSummary?.brokers_sell?.slice(0, 4) || [],
  };
}

/**
 * Parse KeyStats API response into structured data
 */
function parseKeyStatsResponse(json: KeyStatsResponse): KeyStatsData {
  const categories = json.data?.closure_fin_items_results || [];
  
  const findCategory = (name: string): KeyStatsItem[] => {
    const category = categories.find(c => c.keystats_name === name);
    if (!category) return [];
    return category.fin_name_results.map(r => r.fitem);
  };

  return {
    currentValuation: findCategory('Current Valuation'),
    incomeStatement: findCategory('Income Statement'),
    balanceSheet: findCategory('Balance Sheet'),
    profitability: findCategory('Profitability'),
    growth: findCategory('Growth'),
  };
}

/**
 * Fetch KeyStats data for a stock
 */
export async function fetchKeyStats(emiten: string): Promise<KeyStatsData> {
  const url = `${STOCKBIT_BASE_URL}/keystats/ratio/v1/${emiten}?year_limit=10`;
  
  const json = await apiCallWithRetry<KeyStatsResponse>('KeyStats API', async () => {
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
  
  return parseKeyStatsResponse(json);
}

/**
 * Historical summary item from Stockbit API
 */
export interface HistoricalSummaryItem {
  date: string;
  close: number;
  change: number;
  value: number;
  volume: number;
  frequency: number;
  foreign_buy: number;
  foreign_sell: number;
  net_foreign: number;
  open: number;
  high: number;
  low: number;
  average: number;
  change_percentage: number;
}

/**
 * Fetch historical price summary from Stockbit
 * Returns daily price data including open, high, low, close
 */
export async function fetchHistoricalSummary(
  emiten: string,
  startDate: string,
  endDate: string,
  limit: number = 12
): Promise<HistoricalSummaryItem[]> {
  const url = `${STOCKBIT_BASE_URL}/company-price-feed/historical/summary/${emiten}?period=HS_PERIOD_DAILY&start_date=${startDate}&end_date=${endDate}&limit=${limit}&page=1`;

  const json = await apiCallWithRetry<{ data?: { result: HistoricalSummaryItem[] } }>('Historical Summary API', async () => {
    return fetch(url, {
      method: 'GET',
      headers: await getHeaders(),
    });
  });
  
  return json.data?.result || [];
}

/**
 * Delete item from watchlist
 */
export async function deleteWatchlistItem(watchlistId: number, companyId: number): Promise<void> {
  const url = `${STOCKBIT_BASE_URL}/watchlist/${watchlistId}/company/${companyId}/item`;

  await apiCallWithRetry<void>('Delete Watchlist Item API', async () => {
    return fetch(url, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
  }, async () => undefined);
}
