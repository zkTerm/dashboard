import { useState } from 'react';
import { DashboardCard } from './DashboardCard';
import { SettingsModal } from './SettingsModal';
import { AuthenticatedDashboardProps, ChainVerification } from './types';
import { useChainVerification } from './useChainVerification';
import { use2FAStatusOnChain } from './use2FAStatusOnChain';
import { useRPCConfig } from './useRPCConfig';
import avatarImage from '@assets/avatar-zkterm_1766004025969.png';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${'*'.repeat(local.length)}@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/>
    <line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6"/>
    <path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" x2="21" y1="14" y2="3"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const defaultChainVerification: ChainVerification = {
  solana: { verified: false },
  starknet: { verified: false },
  zcash: { verified: false }
};

export function AuthenticatedDashboard({ 
  email, 
  zkId, 
  name,
  googleUserId,
  verifiedAt,
  lastSign,
  onLogout,
  onSettingsClick,
  chainVerification: propChainVerification,
  twoFactorStatus: propTwoFactorStatus,
  solanaRpc,
  starknetRpc,
  starknetContract
}: AuthenticatedDashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const { rpcUrls, refresh: refreshRpcConfig, isLoading: rpcConfigLoading } = useRPCConfig();
  
  const effectiveSolanaRpc = solanaRpc || rpcUrls.solana;
  const effectiveStarknetRpc = starknetRpc || rpcUrls.starknet;
  
  const { data: fetchedChainVerification, isLoading: chainLoading } = useChainVerification({
    email,
    googleUserId: googleUserId || '',
    solanaRpc: effectiveSolanaRpc,
    starknetRpc: effectiveStarknetRpc,
    starknetContract,
    enabled: !!googleUserId && !propChainVerification && !rpcConfigLoading
  });
  
  const chainVerification = propChainVerification || fetchedChainVerification || defaultChainVerification;
  
  const { status: onChain2FAStatus, isLoading: twoFALoading } = use2FAStatusOnChain({
    email,
    googleUserId: googleUserId || '',
    solanaRpc: effectiveSolanaRpc,
    enabled: !!googleUserId && !rpcConfigLoading
  });
  
  // Always use decentralized on-chain 2FA status for consistency
  // Props are ignored to prevent stale/cached data from showing incorrect checkmarks
  const twoFactorStatus = onChain2FAStatus;

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      setSettingsOpen(true);
    }
  };

  return (
    <div className="min-h-screen font-supply text-xs relative" data-testid="authenticated-dashboard">
      <button
        onClick={handleSettingsClick}
        className="absolute top-4 right-4 z-50 p-2 border border-[#c4d5bd]/30 bg-black/50 backdrop-blur-sm text-[#c4d5bd] cursor-pointer rounded-none transition-colors hover:text-[#ff13e7] hover:border-[#ff13e7]"
        data-testid="button-settings"
        title="Settings"
      >
        <SettingsIcon />
      </button>

      <div className="pt-8 px-4 pb-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 min-[900px]:grid-cols-3 gap-4">
          <div>
            <DashboardCard title="AUTHENTICATION" noPadding>
              <div className="flex flex-col h-full max-h-[320px]">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldIcon />
                      <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">IDENTITY PROOF</span>
                      {chainLoading && <LoadingSpinner />}
                    </div>
                    <div className="space-y-3 mb-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#c4d5bd]/70 text-xs font-supply tracking-wider">SOLANA</span>
                          <span className={chainLoading ? "text-[#c4d5bd]/40" : chainVerification.solana.verified ? "text-[#4de193]" : "text-[#c4d5bd]/40"}>
                            {chainLoading ? <LoadingSpinner /> : chainVerification.solana.verified ? <CheckIcon /> : <XIcon />}
                          </span>
                        </div>
                        {chainVerification.solana.hash && (
                          <a 
                            href={chainVerification.solana.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#ff13e7] font-mono text-[10px] mt-0.5 hover:underline cursor-pointer"
                            data-testid="link-solana-hash"
                          >
                            {chainVerification.solana.hash.slice(0, 6)}...{chainVerification.solana.hash.slice(-4)}
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#c4d5bd]/70 text-xs font-supply tracking-wider">STARKNET</span>
                          <span className={chainLoading ? "text-[#c4d5bd]/40" : chainVerification.starknet.verified ? "text-[#4de193]" : "text-[#c4d5bd]/40"}>
                            {chainLoading ? <LoadingSpinner /> : chainVerification.starknet.verified ? <CheckIcon /> : <XIcon />}
                          </span>
                        </div>
                        {chainVerification.starknet.hash && (
                          <a 
                            href={chainVerification.starknet.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#ff13e7] font-mono text-[10px] mt-0.5 hover:underline cursor-pointer"
                            data-testid="link-starknet-hash"
                          >
                            {chainVerification.starknet.hash.slice(0, 6)}...{chainVerification.starknet.hash.slice(-4)}
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#c4d5bd]/70 text-xs font-supply tracking-wider">ZCASH</span>
                          <span className={chainLoading ? "text-[#c4d5bd]/40" : chainVerification.zcash.verified ? "text-[#4de193]" : "text-[#c4d5bd]/40"}>
                            {chainLoading ? <LoadingSpinner /> : chainVerification.zcash.verified ? <CheckIcon /> : <XIcon />}
                          </span>
                        </div>
                        {chainVerification.zcash.hash && chainVerification.zcash.explorerUrl && (
                          <a 
                            href={chainVerification.zcash.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#ff13e7] font-mono text-[10px] mt-0.5 hover:underline cursor-pointer"
                            data-testid="link-zcash-hash"
                          >
                            {chainVerification.zcash.hash.slice(0, 6)}...{chainVerification.zcash.hash.slice(-4)}
                            <ExternalLinkIcon />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-[#c4d5bd]/30" />

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">2FA METHODS</span>
                      {twoFALoading && <LoadingSpinner />}
                    </div>
                    <div className="space-y-3">
                      <div 
                        onClick={handleSettingsClick}
                        className="flex items-start justify-between cursor-pointer hover:bg-[#c4d5bd]/5 p-2 -mx-2 transition-colors"
                        data-testid="button-2fa-totp"
                        title="Configure TOTP authentication"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <KeyIcon />
                          </div>
                          <div>
                            <span className="text-[#c4d5bd] text-xs font-supply tracking-wider block">TOTP</span>
                            <span className="text-[#c4d5bd]/50 text-[10px] font-supply tracking-wider">Authenticator app codes</span>
                          </div>
                        </div>
                        <span className={twoFALoading ? "text-[#c4d5bd]/40" : twoFactorStatus.totp ? "text-[#4de193]" : "text-[#c4d5bd]/40"}>
                          {twoFALoading ? <LoadingSpinner /> : twoFactorStatus.totp ? <CheckIcon /> : <XIcon />}
                        </span>
                      </div>
                      <div 
                        onClick={handleSettingsClick}
                        className="flex items-start justify-between cursor-pointer hover:bg-[#c4d5bd]/5 p-2 -mx-2 transition-colors"
                        data-testid="button-2fa-email"
                        title="Configure Email authentication"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <MailIcon />
                          </div>
                          <div>
                            <span className="text-[#c4d5bd] text-xs font-supply tracking-wider block">EMAIL</span>
                            <span className="text-[#c4d5bd]/50 text-[10px] font-supply tracking-wider">One-time codes via email</span>
                          </div>
                        </div>
                        <span className={twoFALoading ? "text-[#c4d5bd]/40" : twoFactorStatus.email ? "text-[#4de193]" : "text-[#c4d5bd]/40"}>
                          {twoFALoading ? <LoadingSpinner /> : twoFactorStatus.email ? <CheckIcon /> : <XIcon />}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-[#c4d5bd]/30 shrink-0" />

                <div className="p-4 shrink-0">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#c4d5bd] bg-transparent text-[#c4d5bd] font-supply text-sm tracking-wider cursor-pointer rounded-none transition-colors hover:bg-[#c4d5bd]/10"
                    data-testid="button-logout"
                  >
                    <LogOutIcon />
                    LOGOUT
                  </button>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div>
            <DashboardCard title="PROFILE ID" noPadding>
              <div className="flex flex-col h-full">
                <div className="p-4">
                  <div className="flex gap-4 mb-2">
                    <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">NAME</span>
                    <span className="text-[#ff13e7] text-sm font-supply tracking-wider">{name || 'UNSET'}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">EMAIL</span>
                    <span className="text-[#ff13e7] text-sm font-supply tracking-wider">{maskEmail(email)}</span>
                  </div>
                </div>
                <div className="h-px w-full bg-[#c4d5bd]" />
                <div className="flex flex-1">
                  <div className="shrink-0 w-1/2 aspect-square">
                    <img src={avatarImage} alt="zkTerm Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-px bg-[#c4d5bd]" />
                  <div className="flex-1 p-4 flex flex-col justify-between min-h-[140px] overflow-hidden">
                    <div>
                      <div className="text-[#c4d5bd] text-sm font-supply tracking-wider overflow-hidden text-ellipsis whitespace-nowrap mb-2">
                        DID:zk:{zkId.slice(0, 8)}....
                      </div>
                      <div className="text-[#ff13e7] text-sm font-supply tracking-wider mb-2">
                        {verifiedAt ? 'VERIFIED' : 'PENDING'}
                      </div>
                      <div className="text-[#c4d5bd] text-sm font-supply tracking-wider">
                        SOLANA
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-[#c4d5bd] text-sm font-supply tracking-wider">VERIFIED AT</div>
                      <div className="text-[#ff13e7] text-sm font-supply tracking-wider overflow-hidden text-ellipsis whitespace-nowrap">
                        {verifiedAt || 'Not yet verified'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-px w-full bg-[#c4d5bd]" />
                <div className="p-4">
                  <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">
                    LAST SIGN: {lastSign || 'N/A'}
                  </span>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div>
            <DashboardCard title="WALLETS">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No wallets yet</div>
              </div>
            </DashboardCard>
          </div>

          <div>
            <DashboardCard title="FILES">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No files stored yet</div>
              </div>
            </DashboardCard>
          </div>

          <div>
            <DashboardCard title="COMPRESSED BALANCE">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No compressed balances</div>
              </div>
            </DashboardCard>
          </div>

          <div>
            <DashboardCard title="TRANSACTIONS">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No transactions yet</div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        onRefresh={refreshRpcConfig}
      />
    </div>
  );
}

export default AuthenticatedDashboard;
