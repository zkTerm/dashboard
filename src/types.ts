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

export interface RPCApiKeys {
  solana: string;
  starknet: string;
  zcash: string;
}

export interface RPCCustomHeader {
  name: string;
  value: string;
}

export interface RPCHeaders {
  solana: RPCCustomHeader;
  starknet: RPCCustomHeader;
  zcash: RPCCustomHeader;
}

export const DEFAULT_API_KEYS: RPCApiKeys = {
  solana: "",
  starknet: "",
  zcash: ""
};

export const EMPTY_HEADERS: RPCHeaders = {
  solana: { name: "", value: "" },
  starknet: { name: "", value: "" },
  zcash: { name: "", value: "" }
};

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRPC?: RPCConfig;
  onSave?: (config: { rpc: RPCConfig; headers: RPCHeaders; resendKey: string; useCustomResend: boolean }) => void;
  onRefresh?: () => Promise<void>;
}

export interface ChainProof {
  verified: boolean;
  hash?: string;
  explorerUrl?: string;
}

export interface ChainVerification {
  solana: ChainProof;
  starknet: ChainProof;
  zcash: ChainProof;
}

export interface TwoFactorStatus {
  totp: boolean;
  email: boolean;
}

export interface AuthenticatedDashboardProps {
  email: string;
  zkId: string;
  name?: string;
  googleUserId?: string;
  verifiedAt?: string;
  lastSign?: string;
  onLogout: () => void | Promise<void>;
  onSettingsClick?: () => void;
  chainVerification?: ChainVerification;
  twoFactorStatus?: TwoFactorStatus;
  solanaRpc?: string;
  starknetRpc?: string;
  starknetContract?: string;
}

export const DEFAULT_RPC: RPCConfig = {
  solana: "https://mainnet.helius-rpc.com",
  starknet: "https://starknet-mainnet.infura.io/v3",
  zcash: "https://zcash.getblock.io/mainnet"
};
