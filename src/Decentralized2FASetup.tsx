import { useState, useEffect } from 'react';
import { useDecentralized2FA } from './useDecentralized2FA';

interface Decentralized2FASetupProps {
  email: string;
  googleUserId: string;
  solanaRpc: string;
  pinataJwt?: string;
  encryptionPassword: string;
  storageMode?: 'local' | 'ipfs' | 'onchain';
  onSetupComplete?: () => void;
  onDisabled?: () => void;
}

export function Decentralized2FASetup({
  email,
  googleUserId,
  solanaRpc,
  pinataJwt,
  encryptionPassword,
  storageMode = 'local',
  onSetupComplete,
  onDisabled
}: Decentralized2FASetupProps) {
  const [step, setStep] = useState<'loading' | 'disabled' | 'setup' | 'verify' | 'backup' | 'enabled'>('loading');
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [savedBackupCodes, setSavedBackupCodes] = useState<string[]>([]);

  const {
    state,
    checkStatus,
    initiateSetup,
    completeSetup,
    confirmBackupCodes,
    disable,
    pendingSetup
  } = useDecentralized2FA({
    email,
    googleUserId,
    solanaRpc,
    pinataJwt,
    encryptionPassword,
    storageMode
  });

  useEffect(() => {
    checkStatus().then(isEnabled => {
      setStep(isEnabled ? 'enabled' : 'disabled');
    });
  }, [checkStatus]);

  const handleStartSetup = async () => {
    await initiateSetup();
    setStep('setup');
  };

  const handleVerify = async () => {
    const result = await completeSetup(verifyCode);
    if (result.success && result.backupCodes) {
      setSavedBackupCodes(result.backupCodes);
      setStep('backup');
    }
  };

  const handleConfirmBackupCodes = () => {
    confirmBackupCodes();
    setStep('enabled');
    onSetupComplete?.();
  };

  const handleDisable = async () => {
    const result = await disable(disableCode);
    if (result.success) {
      setStep('disabled');
      setDisableCode('');
      onDisabled?.();
    }
  };

  const copyBackupCodes = () => {
    if (pendingSetup?.backupCodes) {
      navigator.clipboard.writeText(pendingSetup.backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  if (step === 'loading' || state.isLoading) {
    return (
      <div className="p-4 rounded-lg border border-border bg-card" data-testid="2fa-loading">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 2FA status...</span>
        </div>
      </div>
    );
  }

  if (step === 'disabled') {
    return (
      <div className="p-4 rounded-lg border border-border bg-card" data-testid="2fa-setup-start">
        <h3 className="text-lg font-semibold mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Protect your account with TOTP-based two-factor authentication. 
          Your secret will be encrypted and stored on IPFS with an on-chain pointer.
        </p>
        
        {!pinataJwt && (
          <p className="text-sm text-yellow-500 mb-4">
            Note: Pinata JWT not configured. 2FA data will be stored locally only.
          </p>
        )}
        
        <button
          onClick={handleStartSetup}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          data-testid="button-enable-2fa"
        >
          Enable 2FA
        </button>
        
        {state.error && (
          <p className="mt-2 text-sm text-red-500" data-testid="text-error">{state.error}</p>
        )}
      </div>
    );
  }

  if (step === 'setup' && pendingSetup) {
    return (
      <div className="p-4 rounded-lg border border-border bg-card" data-testid="2fa-setup-qr">
        <h3 className="text-lg font-semibold mb-4">Setup Authenticator</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              1. Scan this QR code with your authenticator app or enter the secret manually:
            </p>
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all" data-testid="text-totp-secret">
              {pendingSetup.secret}
            </div>
          </div>
          
          <div>
            <button
              onClick={() => setShowBackupCodes(!showBackupCodes)}
              className="text-sm text-primary hover:underline"
              data-testid="button-toggle-backup-codes"
            >
              {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
            </button>
            
            {showBackupCodes && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Backup Codes (save these!)</span>
                  <button
                    onClick={copyBackupCodes}
                    className="text-xs text-primary hover:underline"
                    data-testid="button-copy-backup"
                  >
                    {copiedBackup ? 'Copied!' : 'Copy All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-sm" data-testid="backup-codes-list">
                  {pendingSetup.backupCodes.map((code, i) => (
                    <div key={i} className="text-muted-foreground">{code}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              2. Enter the 6-digit code from your authenticator:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background font-mono text-center text-lg tracking-widest"
                maxLength={6}
                data-testid="input-verify-code"
              />
              <button
                onClick={handleVerify}
                disabled={verifyCode.length !== 6 || state.isLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                data-testid="button-verify-setup"
              >
                Verify
              </button>
            </div>
          </div>
          
          {state.error && (
            <p className="text-sm text-red-500" data-testid="text-error">{state.error}</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'backup' && savedBackupCodes.length > 0) {
    return (
      <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10" data-testid="2fa-backup-codes">
        <h3 className="text-lg font-semibold mb-4">Save Your Backup Codes</h3>
        
        <div className="p-3 bg-yellow-500/20 rounded-md mb-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            These codes can be used if you lose access to your authenticator. Save them securely!
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-sm" data-testid="backup-codes-final">
          {savedBackupCodes.map((code, i) => (
            <div key={i} className="p-2 bg-muted rounded text-center">{code}</div>
          ))}
        </div>
        
        <button
          onClick={handleConfirmBackupCodes}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          data-testid="button-confirm-backup"
        >
          I've Saved My Backup Codes
        </button>
      </div>
    );
  }

  if (step === 'enabled') {
    return (
      <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/10" data-testid="2fa-enabled">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <h3 className="text-lg font-semibold">2FA Enabled</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          Your account is protected with two-factor authentication.
        </p>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Enter your current TOTP code to disable 2FA:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background font-mono text-center"
              maxLength={6}
              data-testid="input-disable-code"
            />
            <button
              onClick={handleDisable}
              disabled={disableCode.length !== 6 || state.isLoading}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
              data-testid="button-disable-2fa"
            >
              Disable 2FA
            </button>
          </div>
        </div>
        
        {state.error && (
          <p className="mt-2 text-sm text-red-500" data-testid="text-error">{state.error}</p>
        )}
      </div>
    );
  }

  return null;
}

export default Decentralized2FASetup;
