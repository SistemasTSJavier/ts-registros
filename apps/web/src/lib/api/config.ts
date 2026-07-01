/**
 * API integration layer — MSW mock (solo desarrollo) o backend real.
 */

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  useMock:
    import.meta.env.VITE_USE_MOCK === 'true' ||
    (import.meta.env.DEV &&
      import.meta.env.VITE_USE_MOCK !== 'false' &&
      !import.meta.env.VITE_API_URL),
  emailEnabled: import.meta.env.VITE_EMAIL_ENABLED === 'true',
  appUrl: import.meta.env.VITE_APP_URL ?? '',
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
  },
} as const

export function isMockMode() {
  return API_CONFIG.useMock
}
