import { useState } from 'react';
import { DashboardCard } from './DashboardCard';
import { SettingsModal } from './SettingsModal';
import { AuthenticatedDashboardProps } from './types';

const ASCII_AVATAR = `╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬╬
╬╬╬╬╬╬╬╬╬███╬╬╬╬╬╬╬╬
╬╬╬╬╬╬╬╬████╬╬╬╬╬╬╬╬
╬╬╬╬╬╬╬█████╬╬╬╬╬╬╬╬
╬╬╬╬╬╬██████╬╬╬╬╬╬╬╬
╬╬╬╬████╬███╬╬████╬╬
╬╬╬███╬╬╬╬╬╬╬╬╬╬███╬
╬╬╬███▓▓▓▓▓╬▓▓▓▓███╬
╬╬╬█████████████████
╬╬╬████▓▓▓████▓▓████
╬╬╬████╬╬╬████╬╬████
╬╬╬╬╬╬█████╬╬█████╬╬
╬╬╬███╬╬╬╬╬╬╬╬╬╬████
╬╬╬████▄▄▄▒▒▒╬╬╬███╬`;

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

export function AuthenticatedDashboard({ 
  email, 
  zkId, 
  verifiedAt,
  lastSign,
  onLogout,
  onSettingsClick
}: AuthenticatedDashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <div className="columns-1 md:columns-2 min-[900px]:columns-3 gap-4">
          <div className="break-inside-avoid mb-4">
            <DashboardCard title="PROFILE ID" noPadding>
              <div className="flex flex-col h-full">
                <div className="p-4">
                  <div className="flex gap-4 mb-2">
                    <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">NAME</span>
                    <span className="text-[#ff13e7] text-sm font-supply tracking-wider">UNSET</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[#c4d5bd] text-sm font-supply tracking-wider">EMAIL</span>
                    <span className="text-[#ff13e7] text-sm font-supply tracking-wider">{maskEmail(email)}</span>
                  </div>
                </div>
                <div className="h-px w-full bg-[#c4d5bd]" />
                <div className="flex flex-1">
                  <div className="shrink-0 flex items-center justify-center w-1/2 p-4">
                    <pre className="text-[#c4d5bd] text-[6px] leading-none font-mono whitespace-pre">
                      {ASCII_AVATAR}
                    </pre>
                  </div>
                  <div className="w-px bg-[#c4d5bd]" />
                  <div className="flex-1 p-4 flex flex-col justify-between min-h-[140px] overflow-hidden">
                    <div>
                      <div className="text-[#c4d5bd] text-sm font-supply tracking-wider overflow-hidden text-ellipsis whitespace-nowrap mb-2">
                        DID:zk:{zkId.slice(0, 8)}....
                      </div>
                      <div className="text-[#ff13e7] text-sm font-supply tracking-wider mb-2">
                        VERIFIED
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

          <div className="break-inside-avoid mb-4">
            <DashboardCard title="WALLETS">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No wallets yet</div>
              </div>
            </DashboardCard>
          </div>

          <div className="break-inside-avoid mb-4">
            <DashboardCard title="AUTHENTICATION">
              <div className="flex flex-col h-full min-h-[120px]">
                <div className="flex-1" />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#c4d5bd] bg-transparent text-[#c4d5bd] font-supply text-sm tracking-wider cursor-pointer rounded-none transition-colors hover:bg-[#c4d5bd]/10"
                  data-testid="button-logout"
                >
                  <LogOutIcon />
                  LOGOUT
                </button>
              </div>
            </DashboardCard>
          </div>

          <div className="break-inside-avoid mb-4">
            <DashboardCard title="FILES">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No files stored yet</div>
              </div>
            </DashboardCard>
          </div>

          <div className="break-inside-avoid mb-4">
            <DashboardCard title="COMPRESSED BALANCE">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No compressed balances</div>
              </div>
            </DashboardCard>
          </div>

          <div className="break-inside-avoid mb-4">
            <DashboardCard title="TRANSACTIONS">
              <div className="min-h-[120px]">
                <div className="text-[#c4d5bd] text-sm font-supply tracking-wider opacity-60">No transactions yet</div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default AuthenticatedDashboard;
