import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface TotpPointer {
  cid: string;
  hash: string;
  type: 'totp' | 'email';
  timestamp: number;
}

export interface OnChainTotpResult {
  signature: string;
  pointer: TotpPointer;
}

function createTotpMemoData(pointer: TotpPointer): string {
  return JSON.stringify({
    t: '2fa',
    c: pointer.cid,
    h: pointer.hash.slice(0, 16),
    y: pointer.type,
    ts: pointer.timestamp
  });
}

function parseTotpMemoData(data: string): TotpPointer | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.t !== '2fa') return null;
    return {
      cid: parsed.c,
      hash: parsed.h,
      type: parsed.y || 'totp',
      timestamp: parsed.ts || 0
    };
  } catch {
    return null;
  }
}

export async function derive2FALookupKey(email: string, googleUserId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`2fa:${email}:${googleUserId}`);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(googleUserId),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export async function storeTotpPointerOnChain(
  connection: Connection,
  payer: Keypair,
  pointer: TotpPointer,
  lookupKey: string
): Promise<OnChainTotpResult> {
  const memoData = createTotpMemoData(pointer);
  const fullMemo = `zkterm:2fa:${lookupKey}:${memoData}`;
  
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(fullMemo, 'utf-8')
  });
  
  const transaction = new Transaction().add(memoInstruction);
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  
  transaction.sign(payer);
  
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });
  
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');
  
  return { signature, pointer };
}

export async function fetchTotpPointerFromChain(
  connection: Connection,
  lookupKey: string,
  type: 'totp' | 'email' = 'totp'
): Promise<TotpPointer | null> {
  const searchPrefix = `zkterm:2fa:${lookupKey}:`;
  
  const signatures = await connection.getSignaturesForAddress(
    MEMO_PROGRAM_ID,
    { limit: 100 },
    'confirmed'
  );
  
  for (const sigInfo of signatures) {
    try {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx?.meta?.logMessages) continue;
      
      for (const log of tx.meta.logMessages) {
        if (log.includes('Program log: Memo') || log.includes(searchPrefix)) {
          const memoMatch = log.match(/Program log: Memo \(len \d+\): (.+)/);
          if (memoMatch) {
            const memoContent = memoMatch[1];
            if (memoContent.startsWith(searchPrefix)) {
              const jsonPart = memoContent.slice(searchPrefix.length);
              const pointer = parseTotpMemoData(jsonPart);
              if (pointer && pointer.type === type) {
                return pointer;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[OnChain] Failed to parse transaction:', err);
    }
  }
  
  return null;
}

export async function fetchTotpPointerFromChainPaginated(
  connection: Connection,
  lookupKey: string,
  type: 'totp' | 'email' = 'totp',
  maxPages: number = 5
): Promise<TotpPointer | null> {
  const searchPrefix = `zkterm:2fa:${lookupKey}:`;
  let beforeSignature: string | undefined;
  
  for (let page = 0; page < maxPages; page++) {
    const signatures = await connection.getSignaturesForAddress(
      MEMO_PROGRAM_ID,
      { 
        limit: 100,
        before: beforeSignature
      },
      'confirmed'
    );
    
    if (signatures.length === 0) break;
    
    for (const sigInfo of signatures) {
      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx?.meta?.logMessages) continue;
        
        for (const log of tx.meta.logMessages) {
          if (log.includes(searchPrefix)) {
            const memoMatch = log.match(/Program log: Memo \(len \d+\): (.+)/);
            if (memoMatch) {
              const memoContent = memoMatch[1];
              if (memoContent.startsWith(searchPrefix)) {
                const jsonPart = memoContent.slice(searchPrefix.length);
                const pointer = parseTotpMemoData(jsonPart);
                if (pointer && pointer.type === type) {
                  return pointer;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[OnChain] Failed to parse transaction:', err);
      }
    }
    
    beforeSignature = signatures[signatures.length - 1].signature;
  }
  
  return null;
}

export interface Disable2FAPointer {
  lookupKey: string;
  type: 'totp' | 'email';
  timestamp: number;
  disabled: true;
}

export async function storeDisable2FAOnChain(
  connection: Connection,
  payer: Keypair,
  lookupKey: string,
  type: 'totp' | 'email'
): Promise<string> {
  const disableData = JSON.stringify({
    t: '2fa-disable',
    y: type,
    ts: Date.now(),
    d: true
  });
  
  const fullMemo = `zkterm:2fa:${lookupKey}:${disableData}`;
  
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(fullMemo, 'utf-8')
  });
  
  const transaction = new Transaction().add(memoInstruction);
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  
  transaction.sign(payer);
  
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed'
  });
  
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight
  }, 'confirmed');
  
  return signature;
}

export async function is2FADisabled(
  connection: Connection,
  lookupKey: string,
  type: 'totp' | 'email',
  setupTimestamp: number
): Promise<boolean> {
  const searchPrefix = `zkterm:2fa:${lookupKey}:`;
  
  const signatures = await connection.getSignaturesForAddress(
    MEMO_PROGRAM_ID,
    { limit: 50 },
    'confirmed'
  );
  
  for (const sigInfo of signatures) {
    try {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx?.meta?.logMessages) continue;
      
      for (const log of tx.meta.logMessages) {
        if (log.includes(searchPrefix)) {
          const memoMatch = log.match(/Program log: Memo \(len \d+\): (.+)/);
          if (memoMatch) {
            const memoContent = memoMatch[1];
            if (memoContent.startsWith(searchPrefix)) {
              const jsonPart = memoContent.slice(searchPrefix.length);
              try {
                const parsed = JSON.parse(jsonPart);
                if (parsed.t === '2fa-disable' && 
                    parsed.y === type && 
                    parsed.ts > setupTimestamp &&
                    parsed.d === true) {
                  return true;
                }
              } catch {
                continue;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[OnChain] Failed to check disable status:', err);
    }
  }
  
  return false;
}
