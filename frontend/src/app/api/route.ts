import { NextResponse } from 'next/server'

// Health check endpoint — confirms the Next.js server is running
export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8888'
  return NextResponse.json({
    status: 'ok',
    proxy: `API requests to /api/v1/* are forwarded to ${backendUrl}`,
  })
}
