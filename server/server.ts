/**
 * FALCON-404: Standalone Local API Server
 * Lead Developer & System Architect: Harshad Mane
 * Milestone: Step 1 of 3 — Core Verification Workflow & Architecture
 *
 * Usage:
 *   node --experimental-strip-types server/server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import {
  handleApiHealth,
  handleApiCapabilities,
  handleApiScreenings,
  sendError
} from './api.ts'

const PORT = parseInt(process.env.PORT || '4040', 10)

export const router = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const method = req.method?.toUpperCase() || 'GET'

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    })
    res.end()
    return
  }

  // Routing
  if (url.pathname === '/api/v1/health' && method === 'GET') {
    return handleApiHealth(req, res)
  }

  if (url.pathname === '/api/v1/capabilities' && method === 'GET') {
    return handleApiCapabilities(req, res)
  }

  if (url.pathname === '/api/v1/screenings' && method === 'POST') {
    return handleApiScreenings(req, res)
  }

  // Route not found
  sendError(res, 404, 'NOT_FOUND', `Route ${method} ${url.pathname} was not found on this server.`)
}

// Start HTTP server if executed directly
export const server = createServer(router)

if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`==================================================`)
    console.log(`FALCON-404 :: Forensic Verification API Server`)
    console.log(`Lead Developer: Harshad Mane`)
    console.log(`Status: Active and Listening on http://localhost:${PORT}`)
    console.log(`Health:       http://localhost:${PORT}/api/v1/health`)
    console.log(`Capabilities: http://localhost:${PORT}/api/v1/capabilities`)
    console.log(`Screenings:   http://localhost:${PORT}/api/v1/screenings [POST]`)
    console.log(`==================================================`)
  })
}
