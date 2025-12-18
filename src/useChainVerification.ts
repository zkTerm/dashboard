import { useState, useEffect, useCallback } from 'react';
import { ChainVerification } from './types';
import { fetchAllChainVerifications } from './chainVerification';

interface UseChainVerificationOptions {
  email: string;
  googleUserId: string;
  solanaRpc?: string;
  starknetRpc?: string;
  starknetContract?: string;
  enabled?: boolean;
}

interface UseChainVerificationResult {
  data: ChainVerification | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const defaultVerification: ChainVerification = {
  solana: { verified: false },
  starknet: { verified: false },
  zcash: { verified: false }
};

export function useChainVerification(
  options: UseChainVerificationOptions
): UseChainVerificationResult {
  const { email, googleUserId, solanaRpc, starknetRpc, starknetContract, enabled = true } = options;
  
  const [data, setData] = useState<ChainVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!email || !googleUserId || !enabled) {
      setData(defaultVerification);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAllChainVerifications(email, googleUserId, {
        solanaRpc,
        starknetRpc,
        starknetContract
      });
      setData(result);
    } catch (err) {
      console.error('[useChainVerification] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch chain verification'));
      setData(defaultVerification);
    } finally {
      setIsLoading(false);
    }
  }, [email, googleUserId, solanaRpc, starknetRpc, starknetContract, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
}
