import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2, Copy, Check, Mail, Smartphone } from 'lucide-react';
import { loadCustomResendKey, isUsingCustomResend } from './SettingsModal';
import { derive2FALookupKey } from './onchainTotpStorage';

function getEmailHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (isUsingCustomResend()) {
    const customKey = loadCustomResendKey();
    if (customKey) {
      (headers as Record<string, string>)["X-Resend-Key"] = customKey;
    }
  }
  return headers;
}

interface TwoFactorSetupProps {
  onComplete?: () => void;
  autoOpen?: boolean;
  hideButton?: boolean;
}

type TabType = 'totp' | 'email';

export function TwoFactorSetup({ onComplete, autoOpen = false, hideButton = false }: TwoFactorSetupProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [activeTab, setActiveTab] = useState<TabType>('totp');
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'backup' | 'disable'>('status');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [emailOtpEnabled, setEmailOtpEnabled] = useState<boolean | null>(null);
  const [securityEmail, setSecurityEmail] = useState("");
  const [maskedSecurityEmail, setMaskedSecurityEmail] = useState<string | null>(null);
  const [emailStep, setEmailStep] = useState<'status' | 'setup' | 'verify-email' | 'disable' | 'verify-otp'>('status');
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleUserId, setGoogleUserId] = useState<string | null>(null);
  
  const sync2FAToLocalStorage = useCallback(async (method: 'totp' | 'email', enabled: boolean) => {
    if (!googleEmail || !googleUserId) {
      console.warn('[2FA Sync] Missing credentials, cannot sync to localStorage');
      return;
    }
    try {
      const lookupKey = await derive2FALookupKey(googleEmail, googleUserId);
      const storageKey = `zkterm:2fa:local:${lookupKey}`;
      
      if (!enabled) {
        localStorage.removeItem(storageKey);
        console.log('[2FA Sync] Removed localStorage entry:', storageKey);
        return;
      }
      
      const data = method === 'totp' 
        ? { encryptedSecret: 'server-managed', verified: true, verifiedAt: Date.now() }
        : { method: 'email', verified: true, verifiedAt: Date.now() };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('[2FA Sync] Saved to localStorage:', storageKey, method);
    } catch (err) {
      console.error('[2FA Sync] Failed to sync:', err);
    }
  }, [googleEmail, googleUserId]);

  const check2FAStatus = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [totpRes, emailRes, sessionRes] = await Promise.all([
        fetch("/api/2fa/status", { credentials: "include" }),
        fetch("/api/2fa/email/status", { credentials: "include" }),
        fetch("/api/auth/me", { credentials: "include" })
      ]);
      
      const totpData = await totpRes.json();
      const emailData = await emailRes.json();
      const sessionData = await sessionRes.json();
      
      let userEmail: string | null = null;
      let userId: string | null = null;
      
      if (sessionData.authenticated && sessionData.user?.email) {
        userEmail = sessionData.user.email;
        userId = sessionData.user.googleUserId || null;
        setGoogleEmail(userEmail);
        if (userId) setGoogleUserId(userId);
      }
      
      if (totpData.success) {
        setIs2FAEnabled(totpData.enabled);
        setStep('status');
      } else {
        setError(totpData.error || "Failed to check 2FA status");
      }
      
      if (emailData.success) {
        setEmailOtpEnabled(emailData.enabled);
        setMaskedSecurityEmail(emailData.securityEmail);
        setEmailStep('status');
      }
      
      if (userEmail && userId) {
        try {
          const lookupKey = await derive2FALookupKey(userEmail, userId);
          const storageKey = `zkterm:2fa:local:${lookupKey}`;
          
          if (totpData.success && totpData.enabled) {
            const data = { encryptedSecret: 'server-managed', verified: true, verifiedAt: Date.now() };
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log('[2FA Sync] Synced TOTP status to localStorage:', storageKey);
          } else if (emailData.success && emailData.enabled) {
            const data = { method: 'email', verified: true, verifiedAt: Date.now() };
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log('[2FA Sync] Synced Email status to localStorage:', storageKey);
          } else if (totpData.success && !totpData.enabled && emailData.success && !emailData.enabled) {
            localStorage.removeItem(storageKey);
            console.log('[2FA Sync] Cleared localStorage (no 2FA enabled):', storageKey);
          } else {
            console.log('[2FA Sync] Skipped sync - API responses incomplete:', { totpSuccess: totpData.success, emailSuccess: emailData.success });
          }
        } catch (syncErr) {
          console.error('[2FA Sync] Failed to sync status:', syncErr);
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const initSetup = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/setup", { 
        method: "POST", 
        credentials: "include" 
      });
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qrCode);
        setStep('setup');
      } else {
        setError(data.error || "Failed to initialize 2FA setup");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const verifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/verify", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
        credentials: "include" 
      });
      const data = await res.json();
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setIs2FAEnabled(true);
        setStep('backup');
        setSuccess("2FA enabled successfully!");
        await sync2FAToLocalStorage('totp', true);
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const disable2FA = async () => {
    if (verifyCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/disable", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
        credentials: "include" 
      });
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(false);
        setStep('status');
        setSuccess("2FA disabled successfully");
        setVerifyCode("");
        await sync2FAToLocalStorage('totp', false);
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const initEmailSetup = async () => {
    if (!securityEmail) {
      setError("Please enter a security email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(securityEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (googleEmail && securityEmail.toLowerCase() === googleEmail.toLowerCase()) {
      setError("Security email must be different from your Google login email");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/email/setup", {
        method: "POST",
        headers: getEmailHeaders(),
        body: JSON.stringify({ securityEmail }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setEmailVerificationSent(true);
        setEmailStep('verify-email');
        setSuccess("Verification email sent! Please check your inbox and click the link.");
      } else {
        setError(data.error || "Failed to send verification email");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const requestEmailOtp = async (action: 'verify' | 'disable' = 'verify') => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/email/send-otp", {
        method: "POST",
        headers: getEmailHeaders(),
        body: JSON.stringify({ action }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setEmailStep('verify-otp');
        setSuccess(`OTP code sent to your security email${action === 'disable' ? ' for disabling' : ''}`);
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const verifyEmailOtp = async () => {
    if (emailOtpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailOtpCode }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Email OTP verified successfully!");
        setEmailStep('status');
        setEmailOtpCode("");
      } else {
        setError(data.error || "Invalid OTP code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const disableEmailOtp = async () => {
    if (emailOtpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/email/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailOtpCode }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Email OTP disabled successfully");
        setEmailOtpCode("");
        await sync2FAToLocalStorage('email', false);
        await check2FAStatus();
      } else {
        setError(data.error || "Invalid OTP code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const confirmEmailVerification = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/email/verify-setup-manual", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Email OTP enabled successfully!");
        setSecurityEmail("");
        setEmailVerificationSent(false);
        await sync2FAToLocalStorage('email', true);
        await check2FAStatus();
      } else {
        setError(data.error || "Verification failed. Did you click the link?");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      check2FAStatus();
    }
  }, [autoOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setError("");
    setSuccess("");
    check2FAStatus();
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('status');
    setVerifyCode("");
    setQrCode("");
    setBackupCodes([]);
    setError("");
    setSuccess("");
    setEmailStep('status');
    setSecurityEmail("");
    setEmailOtpCode("");
    setEmailVerificationSent(false);
    if (onComplete) onComplete();
  };

  return (
    <>
      {!hideButton && (
        <button
          onClick={handleOpen}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-[#4de193]/10 border border-[#4de193]/30 text-[#4de193] text-[11px] uppercase tracking-wider cursor-pointer mx-auto mt-4 rounded-none"
          data-testid="button-2fa-settings"
        >
          <Shield size={14} />
          2FA Settings
        </button>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div 
            className="bg-black/[0.95] border border-[#c4d5bd] max-w-[450px] w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
            data-testid="two-factor-setup-modal"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 bg-transparent border-none text-[#c4d5bd] text-xl cursor-pointer p-1 rounded-none"
              data-testid="button-close-2fa"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Shield size={20} className="text-[#4de193]" />
              <h2 className="text-[#4de193] font-supply text-lg uppercase tracking-wider m-0">
                Two-Factor Authentication
              </h2>
            </div>

            <p className="text-[#c4d5bd]/60 text-xs font-supply mb-4">
              Add an extra layer of security to your zkAuth identity.
            </p>

            <div className="flex border-b border-[#c4d5bd]/30 mb-4">
              <button
                onClick={() => { setActiveTab('totp'); setError(""); setSuccess(""); }}
                className={`flex items-center gap-2 py-3 px-4 bg-transparent border-none font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none ${activeTab === 'totp' ? 'border-b-2 border-b-[#4de193] text-[#4de193]' : 'border-b-2 border-b-transparent text-[#c4d5bd]/60'}`}
                data-testid="tab-totp"
              >
                <Smartphone size={14} />
                TOTP App
              </button>
              <button
                onClick={() => { setActiveTab('email'); setError(""); setSuccess(""); }}
                className={`flex items-center gap-2 py-3 px-4 bg-transparent border-none font-supply text-xs uppercase tracking-wider cursor-pointer rounded-none ${activeTab === 'email' ? 'border-b-2 border-b-[#ff13e7] text-[#ff13e7]' : 'border-b-2 border-b-transparent text-[#c4d5bd]/60'}`}
                data-testid="tab-email"
              >
                <Mail size={14} />
                Email OTP
              </button>
            </div>

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

              {activeTab === 'totp' && !isLoading && step === 'status' && (
                <>
                  <div className="flex items-center justify-between p-4 border border-[#c4d5bd]/30 rounded-none">
                    <div>
                      <p className="m-0 text-sm font-supply text-[#c4d5bd]">
                        TOTP Status
                      </p>
                      <p className="m-0 text-xs text-[#c4d5bd]/60 font-supply">
                        {is2FAEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className={`py-1 px-3 text-xs uppercase rounded-none ${is2FAEnabled ? 'bg-[#4de193]/20 text-[#4de193]' : 'bg-[#ff13e7]/20 text-[#ff13e7]'}`}>
                      {is2FAEnabled ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {is2FAEnabled ? (
                    <button
                      onClick={() => {
                        setStep('disable');
                        setVerifyCode("");
                        setError("");
                      }}
                      className="py-3 px-4 border border-[#ff13e7]/50 bg-transparent text-[#ff13e7] font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                      data-testid="button-disable-2fa"
                    >
                      Disable TOTP
                    </button>
                  ) : (
                    <button
                      onClick={initSetup}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                      data-testid="button-enable-2fa"
                    >
                      Enable TOTP
                    </button>
                  )}
                </>
              )}

              {activeTab === 'totp' && !isLoading && step === 'setup' && (
                <>
                  <p className="text-[#c4d5bd]/80 text-xs font-supply">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  
                  {qrCode && (
                    <div className="flex justify-center p-4 bg-white rounded-none">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" data-testid="img-qr-code" />
                    </div>
                  )}

                  <div className="p-3 bg-[#c4d5bd]/5 border border-[#c4d5bd]/20 rounded-none">
                    <p className="m-0 text-[#c4d5bd]/60 text-xs font-supply">
                      Scan the QR code above with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setStep('verify');
                      setVerifyCode("");
                    }}
                    className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                    data-testid="button-continue-verify"
                  >
                    Continue to Verify
                  </button>
                </>
              )}

              {activeTab === 'totp' && !isLoading && step === 'verify' && (
                <>
                  <p className="text-[#c4d5bd]/80 text-xs font-supply">
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </p>

                  <div>
                    <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setVerifyCode(value);
                        setError("");
                      }}
                      className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none"
                      data-testid="input-verify-code"
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={verifyAndEnable}
                    disabled={verifyCode.length !== 6}
                    className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none ${verifyCode.length !== 6 ? 'opacity-50' : ''}`}
                    data-testid="button-verify-enable"
                  >
                    Verify & Enable 2FA
                  </button>
                </>
              )}

              {activeTab === 'totp' && !isLoading && step === 'backup' && (
                <>
                  <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-2 rounded-none">
                    <AlertCircle size={16} className="text-[#ff13e7] shrink-0" />
                    <span className="text-[#ff13e7] text-xs font-supply">
                      Save these backup codes! They can only be shown once. Use them if you lose access to your authenticator.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <button
                        key={index}
                        onClick={() => copyBackupCode(code, index)}
                        className="flex items-center justify-between p-2 bg-[#c4d5bd]/5 border border-[#c4d5bd]/20 cursor-pointer rounded-none"
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
                    onClick={handleClose}
                    className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#4de193] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                    data-testid="button-done-backup"
                  >
                    I've Saved My Backup Codes
                  </button>
                </>
              )}

              {activeTab === 'totp' && !isLoading && step === 'disable' && (
                <>
                  <p className="text-[#c4d5bd]/80 text-xs font-supply">
                    Enter the 6-digit code from your authenticator app to disable 2FA.
                  </p>

                  <div>
                    <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setVerifyCode(value);
                        setError("");
                      }}
                      className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none"
                      data-testid="input-disable-code"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setStep('status');
                        setVerifyCode("");
                        setError("");
                      }}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none"
                      data-testid="button-cancel-disable"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={disable2FA}
                      disabled={verifyCode.length !== 6}
                      className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#ff13e7] text-black font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none ${verifyCode.length !== 6 ? 'opacity-50' : ''}`}
                      data-testid="button-confirm-disable"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'email' && !isLoading && emailStep === 'status' && (
                <>
                  <div className="flex items-center justify-between p-4 border border-[#c4d5bd]/30 rounded-none">
                    <div>
                      <p className="m-0 text-sm font-supply text-[#c4d5bd]">
                        Email OTP Status
                      </p>
                      <p className="m-0 text-xs text-[#c4d5bd]/60 font-supply">
                        {emailOtpEnabled ? maskedSecurityEmail || 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div className={`py-1 px-3 text-xs uppercase rounded-none ${emailOtpEnabled ? 'bg-[#ff13e7]/20 text-[#ff13e7]' : 'bg-[#c4d5bd]/20 text-[#c4d5bd]/60'}`}>
                      {emailOtpEnabled ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="p-3 bg-[#c4d5bd]/5 border border-[#c4d5bd]/20 rounded-none">
                    <p className="m-0 text-[#c4d5bd]/60 text-xs font-supply flex items-center gap-1">
                      <Mail size={12} className="inline" />
                      Security email must be different from your Google login email for extra protection.
                    </p>
                  </div>

                  {emailOtpEnabled ? (
                    <button
                      onClick={() => {
                        requestEmailOtp('disable');
                      }}
                      className="py-3 px-4 border border-[#ff13e7]/50 bg-transparent text-[#ff13e7] font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                      data-testid="button-request-disable-otp"
                    >
                      Disable Email OTP
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEmailStep('setup');
                        setSecurityEmail("");
                        setError("");
                      }}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#ff13e7] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                      data-testid="button-enable-email-otp"
                    >
                      Enable Email OTP
                    </button>
                  )}
                </>
              )}

              {activeTab === 'email' && !isLoading && emailStep === 'setup' && (
                <>
                  <p className="text-[#c4d5bd]/80 text-xs font-supply">
                    Enter a security email address. This should be different from your Google login email.
                  </p>

                  <div>
                    <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Security Email</label>
                    <input
                      type="email"
                      placeholder="security@example.com"
                      value={securityEmail}
                      onChange={(e) => {
                        setSecurityEmail(e.target.value);
                        setError("");
                      }}
                      className={`bg-black text-[#c4d5bd] font-supply text-sm p-3 w-full outline-none rounded-none ${googleEmail && securityEmail.toLowerCase() === googleEmail.toLowerCase() ? 'border border-[#ff13e7]' : 'border border-[#c4d5bd]/30'}`}
                      data-testid="input-security-email"
                      autoFocus
                    />
                    {googleEmail && securityEmail && securityEmail.toLowerCase() === googleEmail.toLowerCase() && (
                      <p className="text-[#ff13e7] text-xs font-supply mt-2 flex items-center gap-1">
                        <AlertCircle size={12} className="inline" />
                        Cannot use your Google login email as security email
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEmailStep('status');
                        setSecurityEmail("");
                        setError("");
                      }}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none"
                      data-testid="button-cancel-email-setup"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={initEmailSetup}
                      disabled={!securityEmail || (googleEmail !== null && securityEmail.toLowerCase() === googleEmail.toLowerCase())}
                      className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#ff13e7] text-black font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none ${!securityEmail || (googleEmail !== null && securityEmail.toLowerCase() === googleEmail.toLowerCase()) ? 'opacity-50' : ''}`}
                      data-testid="button-send-verification"
                    >
                      Send Verification
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'email' && !isLoading && emailStep === 'verify-email' && (
                <>
                  <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-2 rounded-none">
                    <Mail size={16} className="text-[#ff13e7] shrink-0" />
                    <span className="text-[#ff13e7] text-xs font-supply">
                      Check your email and click the verification link. Then click "Confirm" below.
                    </span>
                  </div>

                  <div className="p-4 border border-[#c4d5bd]/30 rounded-none">
                    <p className="m-0 mb-2 text-[#c4d5bd]/80 text-xs font-supply">
                      Verification sent to:
                    </p>
                    <p className="m-0 text-[#ff13e7] text-sm font-supply">
                      {securityEmail}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEmailStep('setup');
                        setEmailVerificationSent(false);
                        setError("");
                        setSuccess("");
                      }}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none"
                      data-testid="button-resend-verification"
                    >
                      Change Email
                    </button>
                    <button
                      onClick={confirmEmailVerification}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#ff13e7] text-black font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none"
                      data-testid="button-confirm-verification"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'email' && !isLoading && emailStep === 'verify-otp' && (
                <>
                  <p className="text-[#c4d5bd]/80 text-xs font-supply">
                    Enter the 6-digit code sent to your security email to verify or disable.
                  </p>

                  <div>
                    <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">OTP Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={emailOtpCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setEmailOtpCode(value);
                        setError("");
                      }}
                      className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none"
                      data-testid="input-email-otp-code"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEmailStep('status');
                        setEmailOtpCode("");
                        setError("");
                      }}
                      className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none"
                      data-testid="button-cancel-email-otp"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={disableEmailOtp}
                      disabled={emailOtpCode.length !== 6}
                      className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#ff13e7] text-black font-supply text-xs uppercase tracking-wider cursor-pointer flex-1 h-12 rounded-none ${emailOtpCode.length !== 6 ? 'opacity-50' : ''}`}
                      data-testid="button-confirm-email-otp"
                    >
                      Disable
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TwoFactorSetup;
