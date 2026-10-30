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

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;

// Cache the access token in memory (never in localStorage/sessionStorage as required)
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
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
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google Identity Services'));
    document.head.appendChild(script);
  });
};

/**
 * Requests an access token directly via Google Identity Services
 */
export const requestGisAccessToken = async (): Promise<string> => {
  await loadGisScript();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services não inicializado');
  }

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: firebaseConfig.oAuthClientId,
      scope: SCOPES.join(' '),
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
        } else if (tokenResponse.access_token) {
          cachedAccessToken = tokenResponse.access_token;
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('Nenhum token retornado pelo Google.'));
        }
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
};

export interface AuthErrorInfo {
  isUnauthorizedDomain: boolean;
  domain: string;
  originalMessage: string;
}

// Must be called from a button click or user interaction
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
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro na autenticação com Google (Firebase):', error);

    // If unauthorized-domain (e.g. running on custom domain like controledelocacao.vercel.app),
    // attempt fallback via Google Identity Services directly
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      try {
        console.info('Tentando autenticação direta via Google Identity Services...');
        const token = await requestGisAccessToken();
        if (token) {
          cachedAccessToken = token;
          return { user: currentUser, accessToken: token };
        }
      } catch (gisError: any) {
        console.warn('Fallback GIS também falhou:', gisError);
      }

      const domain = typeof window !== 'undefined' ? window.location.hostname : 'este domínio';
      const customErr: any = new Error(
        `O domínio "${domain}" não está na lista de domínios autorizados do Google Cloud/Firebase.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = domain;
      customErr.isUnauthorizedDomain = true;
      throw customErr;
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
};
