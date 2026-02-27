const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "graphsettings_api_token";

export const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;

export function getApiToken(): string | null {
  const envToken = import.meta.env.VITE_API_TOKEN as string | undefined;
  if (envToken && envToken.trim().length > 0) {
    return envToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  return storedToken && storedToken.trim().length > 0 ? storedToken : null;
}

export function setApiToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token && token.trim().length > 0) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
