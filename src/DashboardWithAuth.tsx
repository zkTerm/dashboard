import { useAuth } from './AuthProvider';
import { AuthenticatedDashboard } from './AuthenticatedDashboard';
import { TwoFactorStatus } from './types';

interface DashboardWithAuthProps {
  solanaRpc?: string;
  starknetRpc?: string;
  starknetContract?: string;
  twoFactorStatus?: TwoFactorStatus;
  onSettingsClick?: () => void;
}

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export function DashboardWithAuth({
  solanaRpc,
  starknetRpc,
  starknetContract,
  twoFactorStatus = { totp: false, email: false },
  onSettingsClick
}: DashboardWithAuthProps) {
  const { user, isAuthenticated, isLoading, login, logout, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <span className="text-[#c4d5bd] font-supply text-sm tracking-wider">LOADING...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black" data-testid="login-screen">
        <div className="flex flex-col items-center gap-6 p-8 border border-[#c4d5bd]/30 bg-black/80 backdrop-blur-sm max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-[#c4d5bd] font-supply text-2xl tracking-wider mb-2">zkTerm</h1>
            <p className="text-[#c4d5bd]/60 font-supply text-sm tracking-wider">
              Sign in to access your dashboard
            </p>
          </div>

          {error && (
            <div className="w-full p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-supply text-center" data-testid="error-message">
              {error}
            </div>
          )}

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-[#c4d5bd] bg-transparent text-[#c4d5bd] font-supply text-sm tracking-wider cursor-pointer transition-colors hover:bg-[#c4d5bd]/10 hover:text-white"
            data-testid="button-google-login"
          >
            <GoogleIcon />
            SIGN IN WITH GOOGLE
          </button>

          <p className="text-[#c4d5bd]/40 font-supply text-xs tracking-wider text-center">
            Fully decentralized authentication.
            <br />
            No server-side sessions.
          </p>
        </div>
      </div>
    );
  }

  const zkId = user.googleUserId ? `zk:${user.googleUserId.substring(0, 12)}` : 'zk:unknown';
  
  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AuthenticatedDashboard
      email={user.email}
      zkId={zkId}
      name={user.name}
      googleUserId={user.googleUserId}
      verifiedAt={formatTimestamp(user.verifiedAt)}
      lastSign={formatTimestamp(user.lastSign)}
      onLogout={logout}
      onSettingsClick={onSettingsClick}
      twoFactorStatus={twoFactorStatus}
      solanaRpc={solanaRpc}
      starknetRpc={starknetRpc}
      starknetContract={starknetContract}
    />
  );
}

export default DashboardWithAuth;
