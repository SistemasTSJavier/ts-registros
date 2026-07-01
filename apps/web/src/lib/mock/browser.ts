import { setupWorker } from 'msw/browser'
import { isMockMode } from '@/lib/api/config'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function enableMocking() {
  if (!isMockMode()) return
  return worker.start({ onUnhandledRequest: 'bypass' })
}
