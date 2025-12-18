import { ChainProof, ChainVerification } from './types';

/**
 * Fetch chain verifications by calling the backend API
 * This approach uses the server's Helius API access for reliable Solana verification
 */
export async function fetchAllChainVerifications(
  email: string,
  googleUserId: string,
  config?: {
    solanaRpc?: string;
    starknetRpc?: string;
    starknetContract?: string;
  }
): Promise<ChainVerification> {
  try {
    const response = await fetch('/api/zkauth/verify-chain-proofs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, googleUserId }),
    });
    
    if (!response.ok) {
      console.error('[ChainVerification] API request failed:', response.status);
      return {
        solana: { verified: false },
        starknet: { verified: false },
        zcash: { verified: false },
      };
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('[ChainVerification] API returned failure:', data.error);
      return {
        solana: { verified: false },
        starknet: { verified: false },
        zcash: { verified: false },
      };
    }
    
    return {
      solana: data.solana || { verified: false },
      starknet: data.starknet || { verified: false },
      zcash: data.zcash || { verified: false },
    };
    
  } catch (error) {
    console.error('[ChainVerification] Failed to verify chain proofs:', error);
    return {
      solana: { verified: false },
      starknet: { verified: false },
      zcash: { verified: false },
    };
  }
}

export async function fetchSolanaProof(
  email: string,
  googleUserId: string,
  rpcUrl?: string
): Promise<ChainProof> {
  const result = await fetchAllChainVerifications(email, googleUserId, { solanaRpc: rpcUrl });
  return result.solana;
}

export async function fetchStarknetProof(
  email: string,
  googleUserId: string,
  rpcUrl?: string,
  contractAddress?: string
): Promise<ChainProof> {
  const result = await fetchAllChainVerifications(email, googleUserId, { 
    starknetRpc: rpcUrl, 
    starknetContract: contractAddress 
  });
  return result.starknet;
}

export async function fetchZcashProof(
  email: string,
  googleUserId: string
): Promise<ChainProof> {
  const result = await fetchAllChainVerifications(email, googleUserId);
  return result.zcash;
}
