import { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Loader2, AlertCircle, CheckCircle, Copy, Check } from 'lucide-react';
import { loadCustomResendKey, isUsingCustomResend } from './SettingsModal';

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

interface MandatoryTwoFactorSetupProps {
  isOpen: boolean;
  onComplete: () => void;
  googleEmail?: string;
}

type SetupStep = 'choose' | 'totp-setup' | 'totp-verify' | 'totp-backup' | 'email-setup' | 'email-verify';

export function MandatoryTwoFactorSetup({ isOpen, onComplete, googleEmail }: MandatoryTwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('choose');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [qrCode, setQrCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [securityEmail, setSecurityEmail] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setError("");
      setSuccess("");
      setQrCode("");
      setTotpCode("");
      setBackupCodes([]);
      setSecurityEmail("");
      setEmailVerificationSent(false);
    }
  }, [isOpen]);

  const initTotpSetup = async () => {
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
        setStep('totp-setup');
      } else {
        setError(data.error || "Failed to initialize TOTP setup");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const verifyTotp = async () => {
    if (totpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setStep('totp-backup');
        setSuccess("TOTP enabled successfully!");
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
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
        setStep('email-verify');
        setSuccess("Verification email sent! Check your inbox and click the link.");
      } else {
        setError(data.error || "Failed to send verification email");
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
        setTimeout(() => onComplete(), 1500);
      } else {
        setError(data.error || "Verification not complete. Did you click the email link?");
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

  const finishSetup = () => {
    onComplete();
  };

  if (!isOpen) return null;

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
          For your security, you must enable 2FA to continue.
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

          {!isLoading && step === 'choose' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply text-center">
                Choose your preferred 2FA method:
              </p>
              
              <button
                onClick={initTotpSetup}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-auto flex items-center gap-4 text-left rounded-none"
                data-testid="button-choose-totp"
              >
                <div className="p-3 bg-[#c4d5bd]/10 border border-[#c4d5bd]/30 rounded-none">
                  <Smartphone size={24} className="text-[#c4d5bd]" />
                </div>
                <div className="flex-1">
                  <p className="m-0 text-sm text-[#c4d5bd]">Google Authenticator</p>
                  <p className="m-0 text-xs text-[#c4d5bd]/60">Use an authenticator app for codes</p>
                </div>
              </button>
              
              <button
                onClick={() => setStep('email-setup')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd] font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-auto flex items-center gap-4 text-left rounded-none"
                data-testid="button-choose-email"
              >
                <div className="p-3 bg-[#c4d5bd]/10 border border-[#c4d5bd]/30 rounded-none">
                  <Mail size={24} className="text-[#c4d5bd]" />
                </div>
                <div className="flex-1">
                  <p className="m-0 text-sm text-[#c4d5bd]">Email OTP</p>
                  <p className="m-0 text-xs text-[#c4d5bd]/60">Receive codes via email</p>
                </div>
              </button>
            </>
          )}

          {!isLoading && step === 'totp-setup' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply">
                Scan this QR code with your authenticator app:
              </p>
              
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-none">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" data-testid="img-qr-code" />
                </div>
              )}

              <button
                onClick={() => setStep('totp-verify')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
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
                  className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none"
                  data-testid="input-totp-verify"
                  autoFocus
                />
              </div>

              <button
                onClick={verifyTotp}
                disabled={totpCode.length !== 6}
                className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none ${totpCode.length !== 6 ? 'opacity-50' : ''}`}
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
                onClick={finishSetup}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#4de193] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                data-testid="button-finish-2fa-setup"
              >
                I've Saved My Backup Codes
              </button>
            </>
          )}

          {!isLoading && step === 'email-setup' && (
            <>
              <p className="text-[#c4d5bd]/80 text-xs font-supply">
                Enter a security email (different from your Google email):
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
                  className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm p-3 w-full outline-none rounded-none"
                  data-testid="input-security-email"
                  autoFocus
                />
                {googleEmail && (
                  <p className="text-[#c4d5bd]/40 text-[11px] font-supply mt-2">
                    Must be different from: {googleEmail}
                  </p>
                )}
              </div>

              <button
                onClick={initEmailSetup}
                disabled={!securityEmail}
                className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none ${!securityEmail ? 'opacity-50' : ''}`}
                data-testid="button-send-verification"
              >
                Send Verification Email
              </button>
              
              <button
                onClick={() => setStep('choose')}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-10 rounded-none"
              >
                Back
              </button>
            </>
          )}

          {!isLoading && step === 'email-verify' && (
            <>
              <div className="p-4 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-3 rounded-none">
                <Mail size={32} className="text-[#ff13e7]" />
                <div>
                  <p className="text-sm font-supply text-[#c4d5bd] m-0">
                    Check your email
                  </p>
                  <p className="text-xs font-supply text-[#c4d5bd]/60 m-0">
                    Click the verification link sent to {securityEmail}
                  </p>
                </div>
              </div>

              <p className="text-[#c4d5bd]/60 text-xs font-supply text-center">
                After clicking the link, press the button below:
              </p>

              <button
                onClick={confirmEmailVerification}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none"
                data-testid="button-confirm-email-verified"
              >
                I've Clicked the Link
              </button>
              
              <button
                onClick={() => {
                  setStep('email-setup');
                  setEmailVerificationSent(false);
                  setSuccess("");
                }}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-10 rounded-none"
              >
                Use Different Email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MandatoryTwoFactorSetup;
