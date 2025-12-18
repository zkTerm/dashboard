/**
 * zkauth-adapter.ts - Re-exports zkauth hooks via relative paths
 * This adapter allows dashboard components to use zkauth hooks without
 * requiring Vite to resolve workspace:* package specifiers.
 */

export { useSetup2FA } from '../../zkauth/src/client/useSetup2FA';
export { use2FAStatus } from '../../zkauth/src/client/use2FAStatus';
export { useVerifyTOTP } from '../../zkauth/src/client/useVerifyTOTP';
export { useVerifyEmailOTP } from '../../zkauth/src/client/useVerifyEmailOTP';

export type { UseSetup2FAProps, UseSetup2FAReturn, Setup2FAResult } from '../../zkauth/src/client/useSetup2FA';
export type { Use2FAStatusProps, Use2FAStatusReturn } from '../../zkauth/src/client/use2FAStatus';
