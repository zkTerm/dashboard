import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface SecretPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (secretPhrase: string) => void;
}

export function SecretPhraseModal({ isOpen, onClose, onSubmit }: SecretPhraseModalProps) {
  const [secretPhrase, setSecretPhrase] = useState("");
  const [confirmSecretPhrase, setConfirmSecretPhrase] = useState("");
  const [showSecretPhraseText, setShowSecretPhraseText] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSecretPhrase("");
      setConfirmSecretPhrase("");
      setShowSecretPhraseText(false);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (secretPhrase.length >= 8 && secretPhrase === confirmSecretPhrase) {
      onSubmit(secretPhrase);
    }
  };

  const isValid = secretPhrase.length >= 8 && secretPhrase === confirmSecretPhrase;
  const showMismatchError = secretPhrase && confirmSecretPhrase && secretPhrase !== confirmSecretPhrase;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-black/[0.95] border border-[#c4d5bd] max-w-md w-[90%] max-h-[90vh] overflow-auto p-6 relative backdrop-blur-lg rounded-none"
        data-testid="secret-phrase-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-[#c4d5bd] text-xl cursor-pointer p-1 rounded-none"
          data-testid="button-close-secret-phrase"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Key size={20} className="text-[#4de193]" />
          <h2 className="text-[#4de193] font-supply text-lg uppercase tracking-widest m-0">
            Create Your Secret Phrase
          </h2>
        </div>

        <p className="text-[#c4d5bd]/60 text-xs font-supply mb-6">
          This phrase will be used to derive your private key. You only need to enter it once during registration.
        </p>

        <div className="flex flex-col gap-4">
          <div className="p-3 border border-[#ff13e7]/30 bg-[#ff13e7]/5 flex items-start gap-2 rounded-none">
            <AlertCircle size={16} className="text-[#ff13e7] shrink-0 mt-0.5" />
            <span className="text-[#ff13e7] text-xs font-supply">
              Important: Remember this phrase! After registration, your key will be recovered from blockchain shares, not this phrase.
            </span>
          </div>

          <div>
            <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Secret Phrase</label>
            <div className="relative">
              <input
                type={showSecretPhraseText ? "text" : "password"}
                placeholder="Enter your secret phrase (min 8 characters)"
                value={secretPhrase}
                onChange={(e) => setSecretPhrase(e.target.value)}
                className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm p-3 pr-10 w-full outline-none rounded-none"
                data-testid="input-secret-phrase"
              />
              <button
                type="button"
                onClick={() => setShowSecretPhraseText(!showSecretPhraseText)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#c4d5bd]/60 cursor-pointer p-1"
                data-testid="button-toggle-secret-phrase-visibility"
              >
                {showSecretPhraseText ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[#c4d5bd] font-supply text-xs uppercase tracking-wider block mb-2">Confirm Secret Phrase</label>
            <input
              type={showSecretPhraseText ? "text" : "password"}
              placeholder="Confirm your secret phrase"
              value={confirmSecretPhrase}
              onChange={(e) => setConfirmSecretPhrase(e.target.value)}
              className="bg-black border border-[#c4d5bd]/30 text-[#c4d5bd] font-supply text-sm p-3 w-full outline-none rounded-none"
              data-testid="input-confirm-secret-phrase"
            />
          </div>

          {showMismatchError && (
            <p className="text-[#ff13e7] text-xs font-supply m-0">
              Secret phrases do not match
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`py-3 px-4 border border-[#c4d5bd]/30 bg-[#c4d5bd] text-black font-supply text-xs uppercase tracking-wider cursor-pointer w-full h-12 rounded-none ${!isValid ? 'opacity-50' : ''}`}
            data-testid="button-submit-secret-phrase"
          >
            Create Identity & Split Key
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecretPhraseModal;
