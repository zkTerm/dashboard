import { useState, useCallback } from 'react';
import { Connection, Keypair } from '@solana/web3.js';
import { 
  generateTotpSecret, 
  generateTotpUri, 
  verifyTotpCode, 
  encryptTotpSecret, 
  decryptTotpSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode
} from './totp';
import { 
  uploadToIpfs, 
  fetchFromIpfs, 
  TotpData 
} from './ipfsStorage';
import { 
  derive2FALookupKey, 
  storeTotpPointerOnChain, 
  fetchTotpPointerFromChainPaginated,
  storeDisable2FAOnChain,
  is2FADisabled,
  TotpPointer
} from './onchainTotpStorage';

export interface Setup2FAResult {
  secret: string;
  uri: string;
  backupCodes: string[];
  qrCodeData: string;
}

export interface Verify2FAResult {
  success: boolean;
  error?: string;
  backupCodes?: string[];
}

export interface TwoFactorState {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseDecentralized2FAOptions {
  email: string;
  googleUserId: string;
  solanaRpc: string;
  pinataJwt?: string;
  encryptionPassword?: string;
  storageMode?: 'local' | 'ipfs' | 'onchain';
}

export function useDecentralized2FA(options: UseDecentralized2FAOptions) {
  const { email, googleUserId, solanaRpc, pinataJwt, encryptionPassword, storageMode = 'local' } = options;
  
  const [state, setState] = useState<TwoFactorState>({
    isEnabled: false,
    isLoading: false,
    error: null
  });
  
  const [pendingSetup, setPendingSetup] = useState<{
    secret: string;
    backupCodes: string[];
    backupCodesHashed: string[];
  } | null>(null);

  const getEncryptionKey = useCallback((): string => {
    if (!encryptionPassword) {
      throw new Error('Encryption password required for 2FA. Please provide your secret phrase.');
    }
    return encryptionPassword;
  }, [encryptionPassword]);

  const getLocalStorageKey = useCallback(async (): Promise<string> => {
    const lookupKey = await derive2FALookupKey(email, googleUserId);
    return `zkterm:2fa:local:${lookupKey}`;
  }, [email, googleUserId]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const localKey = await getLocalStorageKey();
      const stored = localStorage.getItem(localKey);
      
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.disabled) {
            setState({ isEnabled: false, isLoading: false, error: null });
            return false;
          }
          if (data.encryptedSecret) {
            setState({ isEnabled: true, isLoading: false, error: null });
            return true;
          }
        } catch {
          localStorage.removeItem(localKey);
        }
      }
      
      if (storageMode === 'onchain' || storageMode === 'ipfs') {
        const connection = new Connection(solanaRpc, 'confirmed');
        const lookupKey = await derive2FALookupKey(email, googleUserId);
        
        const pointer = await fetchTotpPointerFromChainPaginated(connection, lookupKey, 'totp');
        
        if (pointer) {
          const isDisabled = await is2FADisabled(connection, lookupKey, 'totp', pointer.timestamp);
          if (!isDisabled) {
            setState({ isEnabled: true, isLoading: false, error: null });
            return true;
          }
        }
      }
      
      setState({ isEnabled: false, isLoading: false, error: null });
      return false;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to check 2FA status';
      setState({ isEnabled: false, isLoading: false, error });
      return false;
    }
  }, [solanaRpc, email, googleUserId, storageMode, getLocalStorageKey]);

  const initiateSetup = useCallback(async (): Promise<Setup2FAResult> => {
    const secret = generateTotpSecret();
    const uri = generateTotpUri(secret, email);
    const backupCodes = generateBackupCodes(8);
    
    const backupCodesHashed = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );
    
    setPendingSetup({ secret, backupCodes, backupCodesHashed });
    
    return {
      secret,
      uri,
      backupCodes,
      qrCodeData: uri
    };
  }, [email]);

  const completeSetup = useCallback(async (
    code: string,
    payer?: Keypair
  ): Promise<Verify2FAResult> => {
    if (!pendingSetup) {
      return { success: false, error: 'No pending setup' };
    }
    
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const isValid = await verifyTotpCode(pendingSetup.secret, code);
      
      if (!isValid) {
        setState(s => ({ ...s, isLoading: false, error: 'Invalid code' }));
        return { success: false, error: 'Invalid verification code' };
      }
      
      const encryptionKey = getEncryptionKey();
      const encryptedSecret = await encryptTotpSecret(pendingSetup.secret, encryptionKey);
      
      const totpData: TotpData = {
        encryptedSecret,
        backupCodesHashed: pendingSetup.backupCodesHashed,
        createdAt: Date.now(),
        version: 1
      };
      
      const localKey = await getLocalStorageKey();
      localStorage.setItem(localKey, JSON.stringify(totpData));
      
      if (storageMode === 'ipfs' && pinataJwt) {
        try {
          const ipfsResult = await uploadToIpfs(totpData, pinataJwt);
          
          const pointer: TotpPointer = {
            cid: ipfsResult.cid,
            hash: ipfsResult.hash,
            type: 'totp',
            timestamp: Date.now()
          };
          
          if (payer) {
            const connection = new Connection(solanaRpc, 'confirmed');
            const lookupKey = await derive2FALookupKey(email, googleUserId);
            await storeTotpPointerOnChain(connection, payer, pointer, lookupKey);
          }
        } catch (ipfsErr) {
          console.warn('[2FA] IPFS backup failed, using local storage only:', ipfsErr);
        }
      }
      
      setState({ isEnabled: true, isLoading: false, error: null });
      
      return { success: true, backupCodes: pendingSetup.backupCodes };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Setup failed';
      setState(s => ({ ...s, isLoading: false, error }));
      return { success: false, error };
    }
  }, [pendingSetup, pinataJwt, solanaRpc, email, googleUserId, getEncryptionKey, storageMode, getLocalStorageKey]);

  const confirmBackupCodes = useCallback(() => {
    setPendingSetup(null);
  }, []);

  const verify = useCallback(async (code: string): Promise<Verify2FAResult> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const localKey = await getLocalStorageKey();
      const stored = localStorage.getItem(localKey);
      
      let totpData: TotpData | null = null;
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.encryptedSecret && !parsed.disabled) {
            totpData = parsed;
          }
        } catch {
          // Invalid stored data
        }
      }
      
      if (!totpData && (storageMode === 'ipfs' || storageMode === 'onchain')) {
        const connection = new Connection(solanaRpc, 'confirmed');
        const lookupKey = await derive2FALookupKey(email, googleUserId);
        const pointer = await fetchTotpPointerFromChainPaginated(connection, lookupKey, 'totp');
        
        if (pointer) {
          totpData = await fetchFromIpfs(pointer.cid);
        }
      }
      
      if (!totpData) {
        setState(s => ({ ...s, isLoading: false, error: '2FA not set up' }));
        return { success: false, error: '2FA not configured' };
      }
      
      const encryptionKey = getEncryptionKey();
      const secret = await decryptTotpSecret(totpData.encryptedSecret, encryptionKey);
      
      const isValid = await verifyTotpCode(secret, code);
      
      if (isValid) {
        setState(s => ({ ...s, isLoading: false, error: null }));
        return { success: true };
      }
      
      const backupIndex = await verifyBackupCode(code, totpData.backupCodesHashed);
      if (backupIndex >= 0) {
        setState(s => ({ ...s, isLoading: false, error: null }));
        return { success: true };
      }
      
      setState(s => ({ ...s, isLoading: false, error: 'Invalid code' }));
      return { success: false, error: 'Invalid verification code' };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Verification failed';
      setState(s => ({ ...s, isLoading: false, error }));
      return { success: false, error };
    }
  }, [solanaRpc, email, googleUserId, getEncryptionKey, storageMode, getLocalStorageKey]);

  const disable = useCallback(async (
    code: string,
    payer?: Keypair
  ): Promise<Verify2FAResult> => {
    const verifyResult = await verify(code);
    if (!verifyResult.success) {
      return verifyResult;
    }
    
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const localKey = await getLocalStorageKey();
      const stored = localStorage.getItem(localKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        data.disabled = true;
        data.disabledAt = Date.now();
        localStorage.setItem(localKey, JSON.stringify(data));
      }
      
      if (payer && storageMode === 'onchain') {
        const connection = new Connection(solanaRpc, 'confirmed');
        const lookupKey = await derive2FALookupKey(email, googleUserId);
        await storeDisable2FAOnChain(connection, payer, lookupKey, 'totp');
      }
      
      setState({ isEnabled: false, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Disable failed';
      setState(s => ({ ...s, isLoading: false, error }));
      return { success: false, error };
    }
  }, [verify, solanaRpc, email, googleUserId, storageMode, getLocalStorageKey]);

  return {
    state,
    checkStatus,
    initiateSetup,
    completeSetup,
    confirmBackupCodes,
    verify,
    disable,
    pendingSetup: pendingSetup ? {
      secret: pendingSetup.secret,
      backupCodes: pendingSetup.backupCodes
    } : null
  };
}
