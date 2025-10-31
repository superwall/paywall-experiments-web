// Email cookie utility
const EMAIL_COOKIE_NAME = 'paywall_ai_email';
const EMAIL_STORAGE_KEY = 'paywall_ai_email';

export function getEmail(): string | null {
  // Try cookie first
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === EMAIL_COOKIE_NAME && value) {
        return decodeURIComponent(value);
      }
    }
  }
  
  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem(EMAIL_STORAGE_KEY);
  }
  
  return null;
}

export function setEmail(email: string): void {
  if (typeof document === 'undefined') return;
  
  // Set cookie (expires in 1 year)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${EMAIL_COOKIE_NAME}=${encodeURIComponent(email)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  
  // Also set in localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
  }
}

export function hasEmail(): boolean {
  return getEmail() !== null;
}

