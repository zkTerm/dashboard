import { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Smartphone, Loader2, AlertCircle, CheckCircle, Copy, Check, Key } from 'lucide-react';
import { useSetup2FA, use2FAStatus } from './zkauth-adapter';

interface MandatoryTwoFactorSetupProps {
  isOpen: boolean;
  onComplete: () => void;
  email: string;
  googleUserId: string;
  masterKeyHash?: string;
}

type SetupStep = 'loading' | 'choose' | 'totp-setup' | 'totp-verify' | 'totp-backup' | 'already-enabled';

export function MandatoryTwoFactorSetup({ 
  isOpen, 
  onComplete, 
  email,
  googleUserId,
  masterKeyHash = '',
}: MandatoryTwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('loading');
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { totpEnabled, loading: statusLoading, refetch: refetchStatus } = use2FAStatus({
    email,
    googleUserId,
    masterKeyHash,
  });

  const {
    initiateSetup,
    completeSetup,
    confirmBackupCodes,
    pendingSetup,
    loading: setupLoading,
    error: setupError,
  } = useSetup2FA({
    email,
    googleUserId,
    masterKeyHash,
  });

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setQrCodeDataUrl("");
      setTotpCode("");
      
      refetchStatus().then(() => {
        if (totpEnabled) {
          setStep('already-enabled');
          setTimeout(() => onComplete(), 1000);
        } else {
          setStep('choose');
        }
      });
    }
  }, [isOpen, refetchStatus, totpEnabled, onComplete]);

  useEffect(() => {
    if (setupError) {
      setError(setupError);
    }
  }, [setupError]);

  const initTotpSetup = useCallback(async () => {
    setError("");
    try {
      const result = await initiateSetup();
      
      if (result.qrCodeDataUrl) {
        setQrCodeDataUrl(result.qrCodeDataUrl);
        setStep('totp-setup');
      } else {
        setError("Failed to initialize TOTP setup");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize setup");
    }
  }, [initiateSetup]);

  const verifyTotp = useCallback(async () => {
    if (totpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setError("");
    try {
      const result = await completeSetup(totpCode);
      
      if (result.success) {
        setStep('totp-backup');
        setSuccess("TOTP enabled successfully!");
      } else {
        setError(result.error || "Invalid verification code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }, [totpCode, completeSetup]);

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const finishSetup = useCallback(() => {
    confirmBackupCodes();
    onComplete();
  }, [confirmBackupCodes, onComplete]);

  if (!isOpen) return null;

  const isLoading = statusLoading || setupLoading || step === 'loading';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-md w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
        data-testid="mandatory-2fa-modal"
      >
        <div className="flex items-center gap-2 mb-2">
          <Shield size={20} className="text-[#4de193]" />
          <h2 className="text-[#4de193] font-supply text-lg uppercase tracking-widest m-0">
            Two-Factor Authentication Required
          </h2>
        </div>

        <p className="text-[#c4d5bd]/60 text-xs font-supply mb-6">
          For your security, you must enable 2FA to continue. Your 2FA secrets are encrypted and stored locally.
        </p>

        <div className="flex flex-col gap-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={24} className="text-[#4de193] animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-2 rounded-none">
              <AlertCircle size={16} className="text-[#ff13e7] shrink-0" />
              <span className="text-[#ff13e7] text-xs font-supply">
                {error}
              </span>
            </div>
          )}

          {success && (
            <div className="p-3 border border-[#4de193]/30 bg-[#4de193]/5 flex items-center gap-2 rounded-none">
              <CheckCircle size={16} className="text-[#4de193] shrink-0" />
              <span className="text-[#4de193] text-xs font-supply">
                {success}
              </span>
            </div>
          )}

          {!isLoading && step === 'already-enabled' && (
            <div className="p-4 border border-[#4de193]/30 bg-[#4de193]/5 flex items-center gap-3 rounded-none">
              <CheckCircle size={24} className="text-[#4de193]" />
              <div>
                <p className="text-sm font-supply text-[#c4d5bd] m-0">2FA Already Enabled</p>
                <p className="text-xs font-supply text-[#c4d5bd]/60 m-0">Redirecting...</p>
              </div>
            </div>
          )}

          {!isLoading && step === 'choose' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply text-center">
                Set up authenticator app (fully decentralized):
              </p>
              
              <button
                onClick={initTotpSetup}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-auto flex items-center gap-4 text-left rounded-none hover:bg-[#c4d5bd]/5 transition-colors"
                data-testid="button-choose-totp"
              >
                <div className="p-3 bg-[#c4d5bd]/10 border border-[#c4d5bd]/30 rounded-none">
                  <Smartphone size={24} className="text-[#c4d5bd]" />
                </div>
                <div className="flex-1">
                  <p className="m-0 text-sm text-[#c4d5bd]">Authenticator App</p>
                  <p className="m-0 text-xs text-[#c4d5bd]/60">Google Authenticator, Authy, etc.</p>
                </div>
              </button>

              <div className="p-3 border border-[#c4d5bd]/20 bg-[#c4d5bd]/5 rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={14} className="text-[#4de193]" />
                  <span className="text-[#4de193] text-xs font-supply uppercase">Decentralized Security</span>
                </div>
                <p className="text-[#c4d5bd]/60 text-[11px] font-supply m-0">
                  Your TOTP secret is encrypted with your master key and stored locally. 
                  No server stores your 2FA data - you have full control.
                </p>
              </div>
            </>
          )}

          {!isLoading && step === 'totp-setup' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply">
                Scan this QR code with your authenticator app:
              </p>
              
              {qrCodeDataUrl && (
                <div className="flex justify-center p-4 bg-white rounded-none">
                  <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" data-testid="img-qr-code" />
                </div>
              )}

              {pendingSetup?.secret && (
                <div className="p-3 border border-[#c4d5bd]/20 bg-black rounded-none">
                  <p className="text-[#c4d5bd]/60 text-[10px] font-supply mb-1">Manual entry key:</p>
                  <code className="text-[#4de193] text-xs font-mono break-all select-all">
                    {pendingSetup.secret}
                  </code>
                </div>
              )}

              <button
                onClick={() => setStep('totp-verify')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none hover:bg-[#4de193] transition-colors"
                data-testid="button-continue-totp-verify"
              >
                Continue to Verify
              </button>
              
              <button
                onClick={() => setStep('choose')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-10 rounded-none"
              >
                Back
              </button>
            </>
          )}

          {!isLoading && step === 'totp-verify' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply">
                Enter the 6-digit code from your authenticator app:
              </p>

              <div>
                <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setTotpCode(value);
                    setError("");
                  }}
                  className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none focus:border-[#4de193]"
                  data-testid="input-totp-verify"
                  autoFocus
                />
              </div>

              <button
                onClick={verifyTotp}
                disabled={totpCode.length !== 6}
                className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none hover:bg-[#4de193] transition-colors ${totpCode.length !== 6 ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="button-verify-totp"
              >
                Verify & Enable
              </button>
              
              <button
                onClick={() => setStep('totp-setup')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-10 rounded-none"
              >
                Back
              </button>
            </>
          )}

          {!isLoading && step === 'totp-backup' && (
            <>
              <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-2 rounded-none">
                <AlertCircle size={16} className="text-[#ff13e7] shrink-0" />
                <span className="text-[#ff13e7] text-xs font-supply">
                  Save these backup codes! They can only be shown once.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {pendingSetup?.backupCodes.map((code: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => copyBackupCode(code, index)}
                    className="flex items-center justify-between p-2 bg-[#c4d5bd]/5 border border-[#c4d5bd]/20 cursor-pointer rounded-none hover:bg-[#c4d5bd]/10 transition-colors"
                    data-testid={`button-copy-backup-${index}`}
                  >
                    <span className="font-mono text-xs text-[#c4d5bd]">{code}</span>
                    {copiedIndex === index ? (
                      <Check size={12} className="text-[#4de193] shrink-0" />
                    ) : (
                      <Copy size={12} className="text-[#c4d5bd]/60 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={finishSetup}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#4de193] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none hover:bg-[#c4d5bd] transition-colors"
                data-testid="button-finish-2fa-setup"
              >
                I've Saved My Backup Codes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MandatoryTwoFactorSetup;
