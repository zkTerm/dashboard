import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

interface AuthUser {
  googleUserId: string;
  email: string;
  name?: string;
  picture?: string;
  verifiedAt?: string;
  lastSign?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  error: string | null;
}

const AUTH_STORAGE_KEY = 'zkterm_auth_user';

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.googleUserId && parsed.email) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Auth] Failed to parse stored user:', e);
  }
  return null;
}

function storeUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('[Auth] Failed to store user:', e);
  }
}

function clearStoredUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('[Auth] Failed to clear stored user:', e);
  }
}

interface AuthProviderInnerProps {
  children: ReactNode;
  onLoginSuccess?: (user: AuthUser) => void;
  onLogout?: () => void;
}

function AuthProviderInner({ children, onLoginSuccess, onLogout }: AuthProviderInnerProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      const now = new Date().toISOString();
      const emailUsername = storedUser.email?.split('@')[0] || '';
      const updatedUser: AuthUser = {
        ...storedUser,
        name: storedUser.name || emailUsername,
        verifiedAt: storedUser.verifiedAt || now,
        lastSign: now
      };
      storeUser(updatedUser);
      setUser(updatedUser);
    }
    setIsLoading(false);
  }, []);

  const handleCredentialResponse = useCallback(async (tokenResponse: any) => {
    try {
      setError(null);
      
      const accessToken = tokenResponse.access_token;
      
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const userInfo = await userInfoResponse.json();
      
      const existingUser = getStoredUser();
      const now = new Date().toISOString();
      
      const authUser: AuthUser = {
        googleUserId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verifiedAt: existingUser?.verifiedAt || now,
        lastSign: now
      };
      
      storeUser(authUser);
      setUser(authUser);
      onLoginSuccess?.(authUser);
      
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      setError(err.message || 'Login failed');
    }
  }, [onLoginSuccess]);

  const googleLogin = useGoogleLogin({
    onSuccess: handleCredentialResponse,
    onError: (error) => {
      console.error('[Auth] Google login error:', error);
      setError('Google login failed');
    },
    flow: 'implicit'
  });

  const login = useCallback(() => {
    setError(null);
    googleLogin();
  }, [googleLogin]);

  const logout = useCallback(() => {
    googleLogout();
    clearStoredUser();
    setUser(null);
    onLogout?.();
  }, [onLogout]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

interface AuthProviderProps {
  children: ReactNode;
  googleClientId: string;
  onLoginSuccess?: (user: AuthUser) => void;
  onLogout?: () => void;
}

export function AuthProvider({ children, googleClientId, onLoginSuccess, onLogout }: AuthProviderProps) {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProviderInner onLoginSuccess={onLoginSuccess} onLogout={onLogout}>
        {children}
      </AuthProviderInner>
    </GoogleOAuthProvider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthUser, AuthContextType };
