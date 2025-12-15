# @zkterm/dashboard

Dashboard UI components for zkTerm - includes DashboardCard, SettingsModal, AuthenticatedDashboard, and other authentication-related components with cyberpunk terminal styling.

## Installation

```bash
npm install @zkterm/dashboard
```

## Peer Dependencies

This package requires the following peer dependencies:

```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "lucide-react": "^0.400.0",
  "tailwindcss": "^4.0.0"
}
```

## Tailwind CSS Configuration

**Important:** This package uses Tailwind CSS classes. You must configure your project's `tailwind.config.ts` to scan this package's files for classes to be generated correctly.

Add the package path to your `content` array:

```ts
// tailwind.config.ts
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@zkterm/dashboard/src/**/*.{ts,tsx}",
  ],
  // ... rest of your config
}
```

If using a monorepo with the package locally:

```ts
// tailwind.config.ts
export default {
  content: [
    "./client/src/**/*.{js,jsx,ts,tsx}",
    "./packages/dashboard/src/**/*.{ts,tsx}",
  ],
  // ... rest of your config
}
```

## Components

### DashboardCard
A styled card component with title bar.

```tsx
import { DashboardCard } from '@zkterm/dashboard';

<DashboardCard title="WALLETS">
  <p>Card content here</p>
</DashboardCard>
```

### AuthenticatedDashboard
Full dashboard layout for authenticated users with profile, wallets, transactions display.

```tsx
import { AuthenticatedDashboard } from '@zkterm/dashboard';

<AuthenticatedDashboard
  email="user@example.com"
  zkId="abc123xyz"
  verifiedAt="2024-01-01"
  lastSign="2024-01-15"
  onLogout={() => handleLogout()}
  onSettingsClick={() => openSettings()}
/>
```

### SettingsModal
Settings modal with RPC configuration options.

```tsx
import { SettingsModal } from '@zkterm/dashboard';

<SettingsModal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
/>
```

### TwoFactorSetup
2FA setup component supporting TOTP and Email OTP methods.

```tsx
import { TwoFactorSetup } from '@zkterm/dashboard';

<TwoFactorSetup onComplete={() => handleComplete()} />
```

### MandatoryTwoFactorSetup
Modal for enforcing 2FA setup for users without any 2FA configured.

```tsx
import { MandatoryTwoFactorSetup } from '@zkterm/dashboard';

<MandatoryTwoFactorSetup
  isOpen={showModal}
  onComplete={() => handleComplete()}
  googleEmail="user@gmail.com"
/>
```

### SecretPhraseModal
Modal for entering secret phrase during registration.

```tsx
import { SecretPhraseModal } from '@zkterm/dashboard';

<SecretPhraseModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={(phrase) => handleSubmit(phrase)}
/>
```

### TotpVerificationModal
Modal for TOTP code verification during login.

```tsx
import { TotpVerificationModal } from '@zkterm/dashboard';

<TotpVerificationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={(code) => verifyCode(code)}
  isProcessing={isVerifying}
  error={errorMessage}
/>
```

### EmailOtpVerification
Email OTP verification component for login.

```tsx
import { EmailOtpVerification } from '@zkterm/dashboard';

<EmailOtpVerification
  isOpen={isOpen}
  onSuccess={() => handleSuccess()}
  onCancel={() => handleCancel()}
/>
```

## Styling

This package uses a cyberpunk terminal aesthetic with the following color palette:
- Primary text: `#c4d5bd` (light green)
- Accent/highlight: `#ff13e7` (pink)
- Success: `#4de193` (bright green)
- Background: Transparent/dark

## Responsive Grid

The AuthenticatedDashboard uses a responsive grid layout:
- Mobile (< 768px): 1 column
- Tablet (768px - 899px): 2 columns
- Desktop (900px+): 3 columns

## License

MIT
