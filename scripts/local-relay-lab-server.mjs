#!/usr/bin/env node
/**
 * Local Relay Lab HTTP (dev only). 0.0.0.0:8765
 * SIMULATION peers. Not production. Not physical phones.
 */
import http from 'node:http'
import { createLocalRelayLab } from '../src/utils/distribution/localRelayLab.js'

const lab = createLocalRelayLab()
const PORT = Number(process.env.RELAY_LAB_PORT || 8765)

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (req.method === 'GET' && url.pathname === '/health') {
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
      res.end(JSON.stringify({ physicalDevice: false, simulated: true, result, snapshot: lab.snapshot() }))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not_found', routes: ['GET /health', 'POST /scenario'] }))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(e.message || e), simulated: true }))
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[relay-lab] simulation server http://0.0.0.0:${PORT}  (GET /health, POST /scenario)`)
  console.log('[relay-lab] NOT physical devices. NOT production.')
})
