import { ReactNode } from 'react';

export interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  noPadding?: boolean;
  flush?: boolean;
}

export interface RPCConfig {
  solana: string;
  starknet: string;
  zcash: string;
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRPC?: RPCConfig;
  onSave?: (config: { rpc: RPCConfig; resendKey: string; useCustomResend: boolean }) => void;
}

export interface AuthenticatedDashboardProps {
  email: string;
  zkId: string;
  verifiedAt?: string;
  lastSign?: string;
  onLogout: () => void | Promise<void>;
  onSettingsClick?: () => void;
}

export const DEFAULT_RPC: RPCConfig = {
  solana: "https://mainnet.helius-rpc.com",
  starknet: "https://starknet-mainnet.infura.io/v3",
  zcash: "https://zcash.getblock.io/mainnet"
};
