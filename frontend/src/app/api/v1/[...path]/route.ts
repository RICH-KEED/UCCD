import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8888'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle CORS preflight for same-origin proxy — no need to forward
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  const pathSegments = params.path.join('/')
  const searchParams = request.nextUrl.search
  const targetUrl = `${BACKEND_URL}/api/v1/${pathSegments}${searchParams}`

  // Forward all headers except host
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower !== 'host' && lower !== 'connection') {
      headers.set(key, value)
    }
  })

  // Build the fetch options
  const method = request.method
  const fetchOptions: RequestInit = {
    method,
    headers,
  }

  // Include body for methods that support it
  if (method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = await request.arrayBuffer()
  }

  try {
    const backendResponse = await fetch(targetUrl, fetchOptions)

    // Build the response headers, forwarding all except hop-by-hop headers
    const responseHeaders = new Headers()
    backendResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      // Skip hop-by-hop headers that shouldn't be forwarded
      if (
        lower !== 'transfer-encoding' &&
        lower !== 'connection' &&
        lower !== 'keep-alive' &&
        lower !== 'upgrade'
      ) {
        responseHeaders.set(key, value)
      }
    })

    const body = await backendResponse.arrayBuffer()

    return new NextResponse(body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error(`[API Proxy] Failed to reach backend at ${targetUrl}:`, error)
    return NextResponse.json(
      {
        detail: `Cannot reach backend at ${BACKEND_URL}. Make sure your backend server is running.`,
        target: targetUrl,
      },
      { status: 502 }
    )
  }
}
