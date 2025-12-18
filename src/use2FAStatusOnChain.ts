import { useState, useEffect, useCallback } from 'react';
import { Connection } from '@solana/web3.js';
import { 
  derive2FALookupKey, 
  fetchTotpPointerFromChainPaginated,
  is2FADisabled
} from './onchainTotpStorage';

/**
 * Legacy lookup key derivation (SHA-256 based) for backward compatibility
 * This was previously used in authUtils.ts - kept here for migration support
 * Returns null if Web Crypto API or TextEncoder is unavailable
 */
async function deriveLegacyLookupKey(email: string, googleUserId: string): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.warn('[2FA Status] Web Crypto API not available for legacy key derivation');
      return null;
    }
    if (typeof TextEncoder === 'undefined') {
      console.warn('[2FA Status] TextEncoder not available for legacy key derivation');
      return null;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(email + googleUserId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } catch (err) {
    console.warn('[2FA Status] Legacy key derivation failed:', err);
    return null;
  }
}

export interface TwoFactorStatusOnChain {
  totp: boolean;
  email: boolean;
}

export interface Use2FAStatusOnChainOptions {
  email: string;
  googleUserId: string;
  solanaRpc: string;
  enabled?: boolean;
}

export interface Use2FAStatusOnChainReturn {
  status: TwoFactorStatusOnChain;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface TwoFALocalData {
  encryptedSecret?: string;
  method?: 'email' | 'totp';
  verified?: boolean;
  disabled?: boolean;
}

function parse2FALocalData(key: string): TwoFALocalData | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as TwoFALocalData;
  } catch {
    return null;
  }
}

function checkTotpFromLocalData(data: TwoFALocalData | null): boolean {
  if (!data) return false;
  if (data.disabled) return false;
  return !!data.encryptedSecret;
}

function checkEmailFromLocalData(data: TwoFALocalData | null): boolean {
  if (!data) return false;
  if (data.disabled) return false;
  return data.method === 'email' && data.verified === true;
}

async function checkOnChainTotp(
  connection: Connection,
  email: string,
  googleUserId: string
): Promise<boolean> {
  try {
    const lookupKey = await derive2FALookupKey(email, googleUserId);
    const pointer = await fetchTotpPointerFromChainPaginated(connection, lookupKey, 'totp');
    
    if (!pointer) return false;
    
    const isDisabled = await is2FADisabled(connection, lookupKey, 'totp', pointer.timestamp);
    return !isDisabled;
  } catch (err) {
    console.warn('[2FA Status] Failed to check TOTP on-chain:', err);
    return false;
  }
}

export function use2FAStatusOnChain({
  email,
  googleUserId,
  solanaRpc,
  enabled = true
}: Use2FAStatusOnChainOptions): Use2FAStatusOnChainReturn {
  const [status, setStatus] = useState<TwoFactorStatusOnChain>({ totp: false, email: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!email || !googleUserId || !enabled) {
      setIsLoading(false);
      setStatus({ totp: false, email: false });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try new key format first (used by useDecentralized2FA)
      const newLookupKey = await derive2FALookupKey(email, googleUserId);
      const newLocalStorageKey = `zkterm:2fa:local:${newLookupKey}`;
      let localData = parse2FALocalData(newLocalStorageKey);
      let keySource = 'new';
      
      console.log('[2FA Status] New key lookup:', { key: newLocalStorageKey, hasData: !!localData });
      
      // Fall back to legacy SHA-256 key format for backward compatibility
      if (!localData) {
        const legacyLookupKey = await deriveLegacyLookupKey(email, googleUserId);
        if (legacyLookupKey) {
          const legacyLocalStorageKey = `zkterm:2fa:local:${legacyLookupKey}`;
          localData = parse2FALocalData(legacyLocalStorageKey);
          if (localData) keySource = 'legacy';
          console.log('[2FA Status] Legacy key lookup:', { key: legacyLocalStorageKey, hasData: !!localData });
        }
      }
      
      // Check what type of 2FA is currently stored
      let totpEnabled = checkTotpFromLocalData(localData);
      let emailEnabled = checkEmailFromLocalData(localData);
      
      console.log('[2FA Status] Result:', { keySource, totpEnabled, emailEnabled, localData });
      
      // Fall back to on-chain for TOTP if nothing found in localStorage
      if (!totpEnabled && !emailEnabled) {
        try {
          const connection = new Connection(solanaRpc, 'confirmed');
          totpEnabled = await checkOnChainTotp(connection, email, googleUserId);
        } catch (err) {
          console.warn('[2FA Status] TOTP on-chain check failed:', err);
        }
      }

      setStatus({ totp: totpEnabled, email: emailEnabled });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check 2FA status';
      setError(errorMsg);
      console.error('[2FA Status] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, googleUserId, solanaRpc, enabled]);

  useEffect(() => {
    if (enabled && email && googleUserId) {
      fetchStatus();
    } else {
      setIsLoading(false);
    }
  }, [enabled, email, googleUserId, fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus
  };
}
