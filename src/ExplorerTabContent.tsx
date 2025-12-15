import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { ExplorerWindow } from './ExplorerWindow';
import { AuthenticatedDashboard } from './AuthenticatedDashboard';
import { DashboardCard } from './DashboardCard';

interface GoogleUser {
  email?: string;
  name?: string;
  googleUserId?: string;
  isRegistered?: boolean;
  masterKeyDistributed?: boolean;
}

interface AlertState {
  type: "success" | "error" | null;
  title: string;
  message: string;
}

export interface ExplorerTabContentProps {
  isLoggedIn: boolean;
  googleUser: GoogleUser | null;
  isProcessing: boolean;
  processingMessage: string;
  spinnerFrame: number;
  alertState: AlertState;
  onCloseAlert: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onSettingsClick?: () => void;
  onViewTerminal: () => void;
  onSetSecretPhrase?: () => void;
  onCancelRegistration?: () => void;
  onUnlockIdentity?: () => void;
  zkId?: string;
  verifiedAt?: string;
  lastSign?: string;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${'*'.repeat(local.length)}@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function ExplorerTabContent({
  isLoggedIn,
  googleUser,
  isProcessing,
  processingMessage,
  spinnerFrame,
  alertState,
  onCloseAlert,
  onGoogleLogin,
  onLogout,
  onSettingsClick,
  onViewTerminal,
  onSetSecretPhrase,
  onCancelRegistration,
  onUnlockIdentity,
  zkId,
  verifiedAt,
  lastSign,
}: ExplorerTabContentProps) {
  const spinnerChars = ['|', '/', '-', '\\'];

  if (isLoggedIn) {
    return (
      <div className="w-full" data-testid="explorer-tab-authenticated">
        {alertState.type && (
          <div 
            className={`fixed top-4 right-4 py-3 px-4 border z-[1000] max-w-[400px] rounded-none ${alertState.type === 'error' ? 'border-[#ff13e7] bg-[#ff13e7]/[0.95]' : 'border-[#4de193] bg-black/[0.95]'}`}
            data-testid={`alert-${alertState.type}`}
          >
            <div className="flex items-start gap-3">
              {alertState.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[#ff13e7] shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-[#4de193] shrink-0" />
              )}
              <div>
                <p className={`text-[13px] mb-1 font-medium uppercase tracking-wider ${alertState.type === 'error' ? 'text-white' : 'text-[#4de193]'}`}>
                  {alertState.title}
                </p>
                <p className={`text-[11px] opacity-80 ${alertState.type === 'error' ? 'text-[#ff13e7]' : 'text-[#4de193]'}`}>
                  {alertState.message}
                </p>
              </div>
              <button
                onClick={onCloseAlert}
                className={`bg-transparent border-none cursor-pointer p-0 text-base rounded-none ${alertState.type === 'error' ? 'text-[#ff13e7]' : 'text-[#4de193]'}`}
                data-testid="button-close-alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {isProcessing && (
          <div className="fixed inset-0 bg-black/[0.85] flex items-center justify-center z-[1000] backdrop-blur-sm" data-testid="processing-overlay">
            <div className="text-center text-[#c4d5bd]">
              <p className="text-2xl mb-4 text-[#4de193]">
                {spinnerChars[spinnerFrame]}
              </p>
              <p className="text-sm uppercase tracking-widest">
                {processingMessage}
              </p>
            </div>
          </div>
        )}
        
        <AuthenticatedDashboard
          email={googleUser?.email || ''}
          zkId={zkId || googleUser?.googleUserId?.slice(0, 12) || 'ScSdkcRf'}
          verifiedAt={verifiedAt || 'Not yet verified'}
          lastSign={lastSign || 'N/A'}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[500px] w-full px-5" data-testid="explorer-tab-unauthenticated">
      {alertState.type && (
        <div 
          className={`mb-4 py-3 px-4 border relative rounded-none ${alertState.type === 'error' ? 'border-[#ff13e7] bg-[#ff13e7]/10' : 'border-[#4de193] bg-[#4de193]/10'}`}
          data-testid={`alert-${alertState.type}`}
        >
          <div className="flex items-start gap-3">
            {alertState.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#ff13e7] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[#4de193] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-xs font-bold mb-1 ${alertState.type === 'error' ? 'text-[#ff13e7]' : 'text-[#4de193]'}`}>
                {alertState.title}
              </p>
              <p className={`text-[11px] opacity-80 ${alertState.type === 'error' ? 'text-[#ff13e7]' : 'text-[#4de193]'}`}>
                {alertState.message}
              </p>
            </div>
            <button
              onClick={onCloseAlert}
              className={`bg-transparent border-none cursor-pointer p-0 text-base rounded-none ${alertState.type === 'error' ? 'text-[#ff13e7]' : 'text-[#4de193]'}`}
              data-testid="button-close-alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {isProcessing && (
        <div className="fixed inset-0 bg-black/[0.85] flex items-center justify-center z-[1000] backdrop-blur-sm" data-testid="processing-overlay">
          <div className="text-center text-[#c4d5bd]">
            <p className="text-2xl mb-4 text-[#4de193]">
              {spinnerChars[spinnerFrame]}
            </p>
            <p className="text-sm uppercase tracking-widest">
              {processingMessage}
            </p>
          </div>
        </div>
      )}
      
      {googleUser && !googleUser.isRegistered ? (
        <ExplorerWindow title="Complete Registration [zkAuth]">
          <div className="text-[#c4d5bd] relative">
            <button
              onClick={onCancelRegistration}
              className="absolute -top-2 -right-2 w-7 h-7 bg-transparent border border-[#c4d5bd]/50 text-[#c4d5bd] text-base cursor-pointer flex items-center justify-center rounded-none"
              data-testid="button-cancel-registration"
              title="Cancel and log out"
            >
              ✕
            </button>
            
            <p className="text-sm mb-4 uppercase tracking-widest">
              Google OAuth Complete
            </p>
            
            <div className="mb-6">
              <span className="text-[#4de193] mr-2">✓</span>
              <span className="text-[#4de193] mr-6">OAUTH 2.0</span>
              <span className="text-[#ff13e7] opacity-50">SHAMIR 2-OF-3</span>
            </div>
            
            <div className="border border-[#c4d5bd]/30 p-4 mb-6 bg-black/60 backdrop-blur-md rounded-none">
              <p className="text-[11px] text-[#4de193] mb-2">
                Authenticated as:
              </p>
              <p className="text-xs opacity-80">
                {maskEmail(googleUser.email || '')}
              </p>
              <p className="text-[10px] opacity-50 mt-2">
                Set your Secret Phrase to complete registration
              </p>
            </div>
            
            <button
              onClick={onSetSecretPhrase}
              className="w-full h-12 bg-[#c4d5bd] text-black border-none text-sm uppercase tracking-widest cursor-pointer rounded-none"
              data-testid="button-set-secret-phrase"
            >
              Set Secret Phrase
            </button>
          </div>
        </ExplorerWindow>
      ) : googleUser && googleUser.isRegistered && !googleUser.masterKeyDistributed ? (
        <ExplorerWindow title="Unlock Identity [zkAuth]">
          <div className="text-[#c4d5bd] relative">
            <button
              onClick={onCancelRegistration}
              className="absolute -top-2 -right-2 w-7 h-7 bg-transparent border border-[#c4d5bd]/50 text-[#c4d5bd] text-base cursor-pointer flex items-center justify-center rounded-none"
              data-testid="button-cancel-unlock"
              title="Cancel and log out"
            >
              ✕
            </button>
            
            <p className="text-sm mb-4 uppercase tracking-widest">
              Unlocking Identity...
            </p>
            
            <div className="mb-6">
              <span className="text-[#4de193] mr-2">✓</span>
              <span className="text-[#4de193] mr-6">OAUTH 2.0</span>
              <span className="text-[#ff13e7] mr-2">●</span>
              <span className="text-[#ff13e7]">SHAMIR 2-OF-3</span>
            </div>
            
            <div className="border border-[#c4d5bd]/30 p-4 mb-6 bg-black/60 backdrop-blur-md rounded-none">
              <p className="text-[11px] text-[#4de193] mb-2">
                Welcome back:
              </p>
              <p className="text-xs opacity-80">
                {maskEmail(googleUser.email || '')}
              </p>
            </div>
            
            <button
              onClick={onUnlockIdentity}
              className="w-full h-12 bg-[#c4d5bd] text-black border-none text-sm uppercase tracking-widest cursor-pointer rounded-none"
              data-testid="button-unlock-identity"
            >
              Unlock with Google
            </button>
          </div>
        </ExplorerWindow>
      ) : (
        <>
          <div className="mb-8">
            <DashboardCard title="PLEASE LOGIN [ZKAUTH]">
              <div className="text-[#c4d5bd] flex flex-col justify-center items-center py-8 px-4">
                <p className="text-[13px] uppercase tracking-widest mb-2 text-center">
                  Decentralized Authentication
                </p>
                <p className="text-[11px] opacity-60 text-center mb-4">
                  Sign in with your Google account to continue
                </p>
                
                <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 border border-[#c4d5bd]/30 bg-black/30 rounded-none">
                  <div className="w-2 h-2 bg-[#4de193] animate-pulse rounded-none" />
                  <span className="text-[10px] opacity-80 tracking-wider">
                    GROTH16 zkSNARK • POSEIDON HASH • ON-CHAIN PROOF
                  </span>
                </div>
                
                <div className="w-full">
                  <button
                    onClick={onGoogleLogin}
                    className="w-full h-12 bg-[#c4d5bd] text-black border-none text-sm uppercase tracking-widest cursor-pointer rounded-none"
                    data-testid="button-google-login-explorer"
                  >
                    Login with Google
                  </button>
                </div>
              </div>
            </DashboardCard>
          </div>
          
          <div className="mt-6 mb-8 text-center">
            <p className="text-[11px] text-[#c4d5bd] opacity-50">
              Fully decentralized • Real zkSNARK proofs • On-chain verification
            </p>
            <p 
              onClick={onViewTerminal}
              className="mt-1.5 text-[10px] text-[#4de193] opacity-70 cursor-pointer italic"
              data-testid="link-view-terminal-logs"
            >
              View activity logs in Terminal →
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ExplorerTabContent;
