import { useState, useEffect } from 'react';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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

interface EmailOtpVerificationProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmailOtpVerification({ isOpen, onSuccess, onCancel }: EmailOtpVerificationProps) {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep('send');
      setError("");
      setSuccess("");
      setOtpCode("");
      setMaskedEmail("");
      sendOtp();
    }
  }, [isOpen]);

  const sendOtp = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/2fa/email/send-login-otp", {
        method: "POST",
        headers: getEmailHeaders(),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        setMaskedEmail(data.maskedEmail || "your security email");
        setStep('verify');
        setSuccess("OTP code sent to your security email");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/2fa/email/validate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        // Store decentralized session token in localStorage if provided
        if (data.sessionToken) {
          localStorage.setItem('zkterm_session_token', data.sessionToken);
          console.log('[EmailOTP] Session token stored in localStorage');
        }
        setSuccess("Verified successfully!");
        setTimeout(() => onSuccess(), 500);
      } else {
        setError(data.error || "Invalid OTP code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setIsLoading(false);
  };

  const handleCancel = async () => {
    try {
      await fetch("/api/2fa/cancel", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      // Ignore cancel errors
    }
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !success) {
          handleCancel();
        }
      }}
    >
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-md w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
        data-testid="email-otp-verification-modal"
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 bg-transparent border-none text-[#c4d5bd] text-xl cursor-pointer p-1 rounded-none"
          data-testid="button-close-email-otp"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Mail size={20} className="text-[#ff13e7]" />
          <h2 className="text-[#ff13e7] font-supply text-lg uppercase tracking-widest m-0">
            Email OTP Verification
          </h2>
        </div>

        <p className="text-[#c4d5bd]/60 text-xs font-supply mb-6">
          Enter the code sent to your security email to continue.
        </p>

        <div className="flex flex-col gap-4">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={24} className="text-[#ff13e7] animate-spin" />
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

          {!isLoading && step === 'verify' && (
            <>
              <div className="p-4 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-3 rounded-none">
                <Mail size={32} className="text-[#ff13e7]" />
                <div>
                  <p className="text-sm font-supply text-[#c4d5bd] m-0">
                    Code sent to:
                  </p>
                  <p className="text-xs font-supply text-[#ff13e7] m-0">
                    {maskedEmail}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Enter Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setOtpCode(value);
                    setError("");
                  }}
                  className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full text-center tracking-[0.5em] outline-none rounded-none"
                  data-testid="input-email-otp"
                  autoFocus
                />
              </div>

              <button
                onClick={verifyOtp}
                disabled={otpCode.length !== 6}
                className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none ${otpCode.length !== 6 ? 'opacity-50' : ''}`}
                data-testid="button-verify-email-otp"
              >
                Verify Code
              </button>
              
              <button
                onClick={sendOtp}
                className="py-3 px-4 border border-[#c4d5bd]/30 bg-transparent text-[#c4d5bd]/60 font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-10 rounded-none"
              >
                Resend Code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmailOtpVerification;
