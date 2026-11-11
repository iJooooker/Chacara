import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure Firebase is initialized only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Workspace Scopes
export const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
// Force select account to allow switching if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Storage Keys for persistent Google Calendar credentials
const STORAGE_KEYS = {
  TOKEN: 'recanto_paz_gcal_token',
  EXPIRES_AT: 'recanto_paz_gcal_token_expires_at',
  USER: 'recanto_paz_gcal_user',
};

export interface StoredGoogleUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

// Restore saved session from localStorage on module load
function loadSavedSession(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);
    const parsedUser = userJson ? JSON.parse(userJson) : null;

    // Check expiration: if missing or expired, remove token and expiresAt, keep user info
    if (!token || !expiresAt || Date.now() >= Number(expiresAt)) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
      return { token: null, user: parsedUser as unknown as User };
    }

    return { token, user: parsedUser as unknown as User };
  } catch (e) {
    console.warn('Erro ao carregar sessão Google salva:', e);
  }
  return { token: null, user: null };
}

export function persistSession(token: string, user: User | null, expiresInSeconds: number = 3600) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    const expiresAt = Date.now() + Math.max(expiresInSeconds - 120, 600) * 1000;
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, String(expiresAt));

    if (user) {
      const userInfo: StoredGoogleUser = {
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
        uid: user.uid || 'google-user-session',
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userInfo));
    }
  } catch (e) {
    console.warn('Erro ao salvar sessão Google:', e);
  }
}

export function clearPersistedSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (e) {
    console.warn('Erro ao limpar sessão Google:', e);
  }
}

// Flag to indicate if we are in the middle of an explicit sign-in flow
let isSigningIn = false;

// Initialize cached token and user from localStorage immediately
const initialSession = loadSavedSession();
let cachedAccessToken: string | null = initialSession.token;
let currentUser: User | null = initialSession.user;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
  onUserDetectedWithoutToken?: (user: User) => void
) => {
  // If we already have a valid saved token and user, activate it immediately
  if (cachedAccessToken && currentUser) {
    if (onAuthSuccess) {
      onAuthSuccess(currentUser, cachedAccessToken);
    }
  } else if (currentUser && onUserDetectedWithoutToken) {
    onUserDetectedWithoutToken(currentUser);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentUser = user;
      if (!cachedAccessToken) {
        const saved = loadSavedSession();
        if (saved.token) {
          cachedAccessToken = saved.token;
        }
      }

      if (cachedAccessToken) {
        persistSession(cachedAccessToken, currentUser);
        if (onAuthSuccess) onAuthSuccess(currentUser, cachedAccessToken);
      } else {
        if (onUserDetectedWithoutToken) {
          onUserDetectedWithoutToken(user);
        }
        // NEVER open popup automatically on page load or F5.
        // Google Identity Services initTokenClient always opens a popup window,
        // which causes intrusive origin_mismatch errors if called silently.
        // Token renewal must wait for an explicit user click.
        console.info('Usuário identificado; autorização da Google Agenda aguardando clique explícito do usuário.');
      }
    } else {
      // If Firebase SDK does not report a user, check if we have a persisted session
      if (cachedAccessToken && currentUser) {
        if (onAuthSuccess) onAuthSuccess(currentUser, cachedAccessToken);
      } else if (currentUser && onUserDetectedWithoutToken) {
        onUserDetectedWithoutToken(currentUser);
      } else if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const getOAuthClientId = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_google_oauth_client_id');
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  return firebaseConfig.oAuthClientId;
};

export const setCustomOAuthClientId = (clientId: string) => {
  if (typeof window !== 'undefined') {
    if (clientId && clientId.trim().length > 0) {
      localStorage.setItem('custom_google_oauth_client_id', clientId.trim());
    } else {
      localStorage.removeItem('custom_google_oauth_client_id');
    }
  }
};

/**
 * Loads Google Identity Services (GIS) client library dynamically
 */
const loadGisScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not available'));
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.getElementById('google-gis-script') as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        return resolve();
      }
      existing.addEventListener('load', () => {
        existing.setAttribute('data-loaded', 'true');
        resolve();
      });
      existing.addEventListener('error', () => {
        reject(new Error('Falha ao carregar o script do Google Identity Services'));
      });
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Falha ao carregar o script do Google Identity Services'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Requests an access token directly via Google Identity Services
 * This MUST only be triggered from an explicit user gesture (e.g. button click).
 */
export const requestGisAccessToken = async (
  promptMode: '' | 'select_account' = 'select_account'
): Promise<string> => {
  await loadGisScript();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services não inicializado');
  }

  const clientId = getOAuthClientId();

  return new Promise((resolve, reject) => {
    try {
      const clientConfig: Record<string, any> = {
        client_id: clientId,
        scope: SCOPES.join(' '),
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            const err = new Error(tokenResponse.error_description || tokenResponse.error);
            (err as any).code = tokenResponse.error;
            if (tokenResponse.error === 'origin_mismatch' || tokenResponse.error?.includes('origin')) {
              (err as any).isOriginMismatch = true;
            }
            reject(err);
          } else if (tokenResponse.access_token) {
            cachedAccessToken = tokenResponse.access_token;
            persistSession(cachedAccessToken, currentUser, tokenResponse.expires_in || 3600);
            resolve(tokenResponse.access_token);
          } else {
            reject(new Error('Nenhum token retornado pelo Google.'));
          }
        },
        error_callback: (err: any) => {
          console.error('GIS Error callback:', err);
          const errorObj = new Error(err?.message || 'Erro no cliente de autenticação Google');
          (errorObj as any).isOriginMismatch = true;
          reject(errorObj);
        },
      };

      if (currentUser?.email && currentUser.email.trim().length > 0) {
        clientConfig.hint = currentUser.email.trim();
      }

      const client = google.accounts.oauth2.initTokenClient(clientConfig);
      client.requestAccessToken({ prompt: promptMode });
    } catch (err: any) {
      reject(err);
    }
  });
};

/**
 * Kept for interface compatibility, but disabled to guarantee no unexpected popups occur.
 */
export const trySilentTokenRefresh = async (): Promise<string | null> => {
  return null;
};

export interface AuthErrorInfo {
  isUnauthorizedDomain: boolean;
  isOriginMismatch: boolean;
  domain: string;
  origin: string;
  originalMessage: string;
}

// Must be called from an explicit button click or user interaction
export const googleSignIn = async (): Promise<{ user: User | null; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    // Attempt standard Firebase Auth Popup first
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso da conta Google.');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    persistSession(cachedAccessToken, currentUser);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com Google (Firebase):', error);

    const isUnauthDomain =
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('unauthorized-domain');

    // If unauthorized-domain (e.g. running on custom domain like controledelocacao.vercel.app),
    // attempt fallback via Google Identity Services directly
    if (isUnauthDomain) {
      try {
        console.info('Tentando autenticação direta via Google Identity Services...');
        const token = await requestGisAccessToken('select_account');
        if (token) {
          cachedAccessToken = token;
          persistSession(cachedAccessToken, currentUser);
          return { user: currentUser, accessToken: token };
        }
      } catch (gisError: any) {
        console.warn('Fallback GIS também falhou:', gisError);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://controledelocacao.vercel.app';
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'controledelocacao.vercel.app';
        
        const isOriginMismatch =
          gisError?.isOriginMismatch ||
          gisError?.code === 'origin_mismatch' ||
          gisError?.message?.includes('origin_mismatch') ||
          gisError?.message?.includes('origin');

        const customErr: any = new Error(
          `Erro 400: origin_mismatch - A origem "${origin}" não está cadastrada nas Origens JavaScript Autorizadas do Google Cloud.`
        );
        customErr.code = isOriginMismatch ? 'origin_mismatch' : 'auth/unauthorized-domain';
        customErr.domain = hostname;
        customErr.origin = origin;
        customErr.isOriginMismatch = true;
        customErr.isUnauthorizedDomain = true;
        throw customErr;
      }
    }

    const isOriginErr =
      error?.code === 'origin_mismatch' ||
      error?.message?.includes('origin_mismatch') ||
      error?.message?.includes('origin');

    if (isOriginErr) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://controledelocacao.vercel.app';
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'controledelocacao.vercel.app';
      const customErr: any = new Error(
        `Erro 400: origin_mismatch - A origem "${origin}" precisa ser registrada no Google Cloud Console.`
      );
      customErr.code = 'origin_mismatch';
      customErr.domain = hostname;
      customErr.origin = origin;
      customErr.isOriginMismatch = true;
      throw customErr;
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently valid access token or null if expired/absent.
 * This is completely passive: it NEVER opens a popup or triggers unprompted authorization.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (!expiresAt || Date.now() >= Number(expiresAt)) {
    cachedAccessToken = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    } catch {}
    return null;
  }

  if (!cachedAccessToken) {
    const saved = loadSavedSession();
    if (saved.token) {
      cachedAccessToken = saved.token;
      if (saved.user && !currentUser) {
        currentUser = saved.user;
      }
    } else {
      return null;
    }
  }

  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  if (!currentUser) {
    const saved = loadSavedSession();
    if (saved.user) {
      currentUser = saved.user;
    }
  }
  return currentUser;
};

export const logoutGoogle = async () => {
  clearPersistedSession();
  cachedAccessToken = null;
  currentUser = null;
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Erro ao deslogar do Firebase:', e);
  }
};
