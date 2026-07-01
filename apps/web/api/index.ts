import { handle } from 'hono/vercel'
import { getApp } from '../../api/src/app.js'

const app = await getApp()

export default handle(app)

export const config = {
  maxDuration: 30,
}
