let cachedApp: Awaited<ReturnType<typeof import('../../api/src/app.js').getApp>> | null = null

export default async function handler(req: Request): Promise<Response> {
  try {
    if (!cachedApp) {
      const { getApp } = await import('../../api/src/app.js')
      cachedApp = await getApp()
    }
    return cachedApp.fetch(req)
  } catch (error) {
    console.error('API failed:', error)
    const message = error instanceof Error ? error.message : 'Error al iniciar la API'
    return Response.json({ message, error: message }, { status: 500 })
  }
}

export const config = {
  maxDuration: 30,
}
