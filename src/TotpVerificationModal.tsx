import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';

interface TotpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  isProcessing?: boolean;
  error?: string;
}

export function TotpVerificationModal({ isOpen, onClose, onSubmit, isProcessing = false, error }: TotpVerificationModalProps) {
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTotpCode("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (totpCode.length === 6) {
      await onSubmit(totpCode);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setTotpCode(value);
  };

  const isValid = totpCode.length === 6;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-md w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
        data-testid="totp-verification-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-[#c4d5bd] text-xl cursor-pointer p-1 rounded-none"
          data-testid="button-close-totp"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Shield size={20} className="text-[#4de193]" />
          <h2 className="text-[#4de193] font-supply text-lg uppercase tracking-widest m-0">
            Two-Factor Authentication
          </h2>
        </div>

        <p className="text-[#c4d5bd]/60 text-xs font-supply mb-6">
          Enter the 6-digit code from your authenticator app to complete login.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Authentication Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={totpCode}
              onChange={handleInputChange}
              className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-2xl p-3 w-full outline-none text-center tracking-[0.5em] rounded-none"
              data-testid="input-totp-code"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-center gap-2 rounded-none">
              <AlertCircle size={16} className="text-[#ff13e7] shrink-0" />
              <span className="text-[#ff13e7] text-xs font-supply">
                {error}
              </span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || isProcessing}
            className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 flex items-center justify-center gap-2 rounded-none ${(!isValid || isProcessing) ? 'opacity-50' : ''}`}
            data-testid="button-submit-totp"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify & Login"
            )}
          </button>

          <p className="text-[#c4d5bd]/60 text-xs font-supply text-center m-0">
            You can also use a backup code if you've lost access to your authenticator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TotpVerificationModal;
