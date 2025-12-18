import { useState, useEffect, useCallback } from 'react';
import { RPCConfig, RPCHeaders, RPCCustomHeader, EMPTY_HEADERS, DEFAULT_RPC } from './types';

const RPC_CONFIG_KEY = 'zkterm_rpc_config';
const RPC_HEADERS_KEY = 'zkterm_rpc_headers';
const BACKEND_CACHE_TTL = 5 * 60 * 1000;
const BACKEND_URLS_CACHE_KEY = 'zkterm_backend_rpc_urls';

function getLocalStorageRPCConfig(): RPCConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(RPC_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[useRPCConfig] Failed to load localStorage RPC config:', e);
  }
  return null;
}

function getLocalStorageHeaders(): RPCHeaders | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(RPC_HEADERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[useRPCConfig] Failed to load localStorage headers:', e);
  }
  return null;
}

function getCachedBackendUrls(): RPCConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(BACKEND_URLS_CACHE_KEY);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.timestamp < BACKEND_CACHE_TTL) {
        return entry.urls;
      }
    }
  } catch (e) {
    console.error('[useRPCConfig] Failed to load cached backend urls:', e);
  }
  return null;
}

function setCachedBackendUrls(urls: RPCConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const entry = { urls, timestamp: Date.now() };
    localStorage.setItem(BACKEND_URLS_CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.error('[useRPCConfig] Failed to cache backend urls:', e);
  }
}

async function fetchBackendRPCConfig(): Promise<RPCConfig> {
  try {
    const response = await fetch('/api/config/rpc-keys');
    if (response.ok) {
      const data = await response.json();
      const urls: RPCConfig = {
        solana: data.urls?.solana || '',
        starknet: data.urls?.starknet || '',
        zcash: data.urls?.zcash || ''
      };
      setCachedBackendUrls(urls);
      return urls;
    }
  } catch (e) {
    console.error('[useRPCConfig] Failed to fetch backend RPC config:', e);
  }
  return { solana: '', starknet: '', zcash: '' };
}

export interface MergedRPCConfig {
  rpcUrls: RPCConfig;
  headers: RPCHeaders;
  isLoading: boolean;
  source: {
    solana: 'user' | 'backend' | 'default';
    starknet: 'user' | 'backend' | 'default';
    zcash: 'user' | 'backend' | 'default';
  };
  buildHeaders: (chain: keyof RPCConfig) => HeadersInit;
  refresh: () => Promise<void>;
}

export function useRPCConfig(): MergedRPCConfig {
  const [rpcUrls, setRpcUrls] = useState<RPCConfig>(() => {
    const userConfig = getLocalStorageRPCConfig();
    const cachedBackendUrls = getCachedBackendUrls();
    return mergeRpcUrls(userConfig, cachedBackendUrls);
  });

  const [headers, setHeaders] = useState<RPCHeaders>(() => {
    return getLocalStorageHeaders() || { ...EMPTY_HEADERS };
  });

  const [source, setSource] = useState<MergedRPCConfig['source']>({
    solana: 'default',
    starknet: 'default',
    zcash: 'default'
  });

  const [isLoading, setIsLoading] = useState(true);

  const mergeAndSetConfig = useCallback((
    userUrls: RPCConfig | null,
    userHeaders: RPCHeaders | null,
    backendUrls: RPCConfig
  ) => {
    const newSource: MergedRPCConfig['source'] = {
      solana: 'default',
      starknet: 'default',
      zcash: 'default'
    };

    const mergedUrls: RPCConfig = { ...DEFAULT_RPC };
    const mergedHeaders: RPCHeaders = userHeaders || { ...EMPTY_HEADERS };

    (['solana', 'starknet', 'zcash'] as const).forEach((chain) => {
      if (userUrls && userUrls[chain] && userUrls[chain] !== DEFAULT_RPC[chain]) {
        mergedUrls[chain] = userUrls[chain];
        newSource[chain] = 'user';
      } else if (backendUrls[chain]) {
        mergedUrls[chain] = backendUrls[chain];
        newSource[chain] = 'backend';
      }

      if (userHeaders && (userHeaders[chain].name || userHeaders[chain].value)) {
        if (newSource[chain] !== 'user') newSource[chain] = 'user';
      }
    });

    setRpcUrls(mergedUrls);
    setHeaders(mergedHeaders);
    setSource(newSource);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    
    const userConfig = getLocalStorageRPCConfig();
    const userHeaders = getLocalStorageHeaders();
    const backendUrls = await fetchBackendRPCConfig();
    
    mergeAndSetConfig(userConfig, userHeaders, backendUrls);
    setIsLoading(false);
  }, [mergeAndSetConfig]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const buildHeaders = useCallback((chain: keyof RPCConfig): HeadersInit => {
    const customHeader = headers[chain];
    const result: HeadersInit = { 'Content-Type': 'application/json' };
    if (customHeader.name && customHeader.value) {
      (result as Record<string, string>)[customHeader.name] = customHeader.value;
    }
    return result;
  }, [headers]);

  return {
    rpcUrls,
    headers,
    isLoading,
    source,
    buildHeaders,
    refresh
  };
}

function mergeRpcUrls(userUrls: RPCConfig | null, backendUrls: RPCConfig | null): RPCConfig {
  const merged: RPCConfig = { ...DEFAULT_RPC };

  (['solana', 'starknet', 'zcash'] as const).forEach((chain) => {
    if (userUrls && userUrls[chain] && userUrls[chain] !== DEFAULT_RPC[chain]) {
      merged[chain] = userUrls[chain];
    } else if (backendUrls && backendUrls[chain]) {
      merged[chain] = backendUrls[chain];
    }
  });

  return merged;
}

export function getStaticRPCConfig(): { rpcUrls: RPCConfig; headers: RPCHeaders } {
  const userConfig = getLocalStorageRPCConfig();
  const userHeaders = getLocalStorageHeaders();
  const cachedBackendUrls = getCachedBackendUrls();

  return {
    rpcUrls: mergeRpcUrls(userConfig, cachedBackendUrls),
    headers: userHeaders || { ...EMPTY_HEADERS }
  };
}

export function buildHeadersStatic(chain: keyof RPCConfig, headers: RPCHeaders): HeadersInit {
  const customHeader = headers[chain];
  const result: HeadersInit = { 'Content-Type': 'application/json' };
  if (customHeader.name && customHeader.value) {
    (result as Record<string, string>)[customHeader.name] = customHeader.value;
  }
  return result;
}
