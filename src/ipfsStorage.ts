export interface TotpData {
  encryptedSecret: string;
  backupCodesHashed: string[];
  createdAt: number;
  version: number;
}

export interface IpfsUploadResult {
  cid: string;
  hash: string;
}

async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToIpfs(
  data: TotpData,
  pinataJwt: string
): Promise<IpfsUploadResult> {
  const jsonData = JSON.stringify(data);
  const hash = await sha256Hash(jsonData);
  
  const blob = new Blob([jsonData], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'totp-data.json');
  
  const metadata = JSON.stringify({
    name: `zkterm-2fa-${Date.now()}`,
    keyvalues: {
      type: '2fa-totp',
      version: data.version.toString()
    }
  });
  formData.append('pinataMetadata', metadata);
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJwt}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IPFS upload failed: ${errorText}`);
  }
  
  const result = await response.json();
  
  return {
    cid: result.IpfsHash,
    hash
  };
}

export async function fetchFromIpfs(cid: string): Promise<TotpData> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ];
  
  let lastError: Error | null = null;
  
  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.encryptedSecret || !data.backupCodesHashed) {
        throw new Error('Invalid TOTP data structure');
      }
      
      return data as TotpData;
    } catch (err) {
      lastError = err as Error;
      console.warn(`[IPFS] Gateway ${gateway} failed:`, err);
    }
  }
  
  throw new Error(`Failed to fetch from IPFS: ${lastError?.message}`);
}

export async function verifyIpfsData(data: TotpData, expectedHash: string): Promise<boolean> {
  const jsonData = JSON.stringify(data);
  const actualHash = await sha256Hash(jsonData);
  return actualHash === expectedHash;
}

export interface EmailOtpData {
  securityEmailEncrypted: string;
  createdAt: number;
  version: number;
}

export async function uploadEmailOtpConfig(
  data: EmailOtpData,
  pinataJwt: string
): Promise<IpfsUploadResult> {
  const jsonData = JSON.stringify(data);
  const hash = await sha256Hash(jsonData);
  
  const blob = new Blob([jsonData], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'email-otp-data.json');
  
  const metadata = JSON.stringify({
    name: `zkterm-email-otp-${Date.now()}`,
    keyvalues: {
      type: '2fa-email',
      version: data.version.toString()
    }
  });
  formData.append('pinataMetadata', metadata);
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJwt}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IPFS upload failed: ${errorText}`);
  }
  
  const result = await response.json();
  
  return {
    cid: result.IpfsHash,
    hash
  };
}

export async function fetchEmailOtpConfig(cid: string): Promise<EmailOtpData> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`
  ];
  
  let lastError: Error | null = null;
  
  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.securityEmailEncrypted) {
        throw new Error('Invalid email OTP data structure');
      }
      
      return data as EmailOtpData;
    } catch (err) {
      lastError = err as Error;
      console.warn(`[IPFS] Gateway ${gateway} failed:`, err);
    }
  }
  
  throw new Error(`Failed to fetch from IPFS: ${lastError?.message}`);
}
