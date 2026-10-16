import { createLocalRelayLab } from './src/utils/distribution/localRelayLab.js'

/** Dev-only middleware. Simulated lab, not phones. */
export function relayLabPlugin() {
  const lab = createLocalRelayLab()
  return {
    name: 'pasihai-relay-lab',
    configureServer(server) {
      server.middlewares.use('/__relay-lab', async (req, res, next) => {
        try {
          const url = new URL(req.url, 'http://vite.local')
          if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, mode: 'simulation', physicalDevice: false, ...lab.snapshot() }))
            return
          }
          if (req.method === 'POST' && url.pathname === '/scenario') {
            const chunks = []
            for await (const c of req) chunks.push(c)
            let name = 'public-transfer'
            try {
              name = JSON.parse(Buffer.concat(chunks).toString() || '{}').name || name
            } catch {
              /* default */
            }
            const result = await lab.runScenario(name)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ physicalDevice: false, simulated: true, result }))
            return
          }
          next()
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e.message || e) }))
        }
      })
    },
  }
}
