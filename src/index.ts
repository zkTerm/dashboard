export { DashboardCard } from './DashboardCard';
export { SettingsModal, loadRPCConfig, loadRPCHeaders, loadCustomResendKey, isUsingCustomResend } from './SettingsModal';
export { AuthenticatedDashboard } from './AuthenticatedDashboard';
export { useRPCConfig, getStaticRPCConfig, buildHeadersStatic } from './useRPCConfig';
export type { MergedRPCConfig } from './useRPCConfig';
export { ExplorerWindow } from './ExplorerWindow';
export { ExplorerTabContent } from './ExplorerTabContent';
export { TwoFactorSetup } from './TwoFactorSetup';
export { MandatoryTwoFactorSetup } from './MandatoryTwoFactorSetup';
export { EmailOtpVerification } from './EmailOtpVerification';
export { SecretPhraseModal } from './SecretPhraseModal';
export { TotpVerificationModal } from './TotpVerificationModal';
export { AuthProvider, useAuth } from './AuthProvider';
export { DashboardWithAuth } from './DashboardWithAuth';
export { DEFAULT_RPC } from './types';
export { useChainVerification } from './useChainVerification';
export { useDecentralized2FA } from './useDecentralized2FA';
export { use2FAStatusOnChain } from './use2FAStatusOnChain';
export type { TwoFactorStatusOnChain, Use2FAStatusOnChainOptions, Use2FAStatusOnChainReturn } from './use2FAStatusOnChain';
export { Decentralized2FASetup } from './Decentralized2FASetup';
export * from './totp';
export * from './ipfsStorage';
export * from './onchainTotpStorage';
export { fetchAllChainVerifications, fetchSolanaProof, fetchStarknetProof, fetchZcashProof } from './chainVerification';

// Re-export auth hooks and utilities from zkauth package
export {
  AUTH_STORAGE_KEY,
  getStoredAuthUser,
  storeAuthUser,
  clearStoredAuthUser,
  updateStoredAuthFlags,
  maskEmail,
  derivePrivateKey,
  deriveLookupKey,
  get2FALocalStorageKey,
  parse2FAData,
  isValid2FASession,
  storeEmailOTP2FAMarker,
  clear2FAData,
  useZkAuthSession,
  useSessionValidation,
  useTwoFactorFlow,
  useZkAuthFlow,
} from '../../zkauth/src/client';

export type {
  TwoFALocalData,
  GoogleUser,
  UseZkAuthSessionReturn,
  UseSessionValidationProps,
  UseSessionValidationReturn,
  UseTwoFactorFlowProps,
  UseTwoFactorFlowReturn,
  UseZkAuthFlowProps,
  UseZkAuthFlowReturn,
} from '../../zkauth/src/client';

export type { 
  DashboardCardProps, 
  SettingsModalProps, 
  RPCConfig,
  AuthenticatedDashboardProps,
  ChainProof,
  ChainVerification,
  TwoFactorStatus
} from './types';
export type { ExplorerTabContentProps } from './ExplorerTabContent';
export type { AuthUser, AuthContextType } from './AuthProvider';
