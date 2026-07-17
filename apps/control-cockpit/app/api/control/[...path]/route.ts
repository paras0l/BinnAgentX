import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_CONTROL_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ detail: "control_api_base_url_missing" }, { status: 503 });
  }
  if (process.env.BINNAGENT_ENV === "production") {
    return NextResponse.json({ detail: "external_control_identity_required" }, { status: 503 });
  }
  const { path } = await context.params;
  const upstreamUrl = new URL(`${baseUrl.replace(/\/$/, "")}/${path.join("/")}`);
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers({
    Accept: "application/json",
    "X-BinnAgent-Control-Role": process.env.BINNAGENT_CONTROL_REQUIRED_ROLE ?? "developer_reviewer",
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const body = request.method === "GET" ? undefined : await request.text();
  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json({ detail: "control_api_unreachable" }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
