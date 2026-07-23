import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function forward(request: NextRequest, context: RouteContext): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_LEARNER_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { code: "TEMPORARY_UNAVAILABLE", reason: "learner_api_base_url_missing" },
      { status: 503 },
    );
  }
  const { path } = await context.params;
  const upstreamUrl = new URL(`${baseUrl.replace(/\/$/, "")}/${path.join("/")}`);
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  const idempotencyKey = request.headers.get("idempotency-key");
  const cookie = request.headers.get("cookie");
  if (contentType) headers.set("Content-Type", contentType);
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  if (cookie) headers.set("Cookie", cookie);
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const responseHeaders = new Headers({
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) responseHeaders.set("Set-Cookie", setCookie);
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { code: "TEMPORARY_UNAVAILABLE", reason: "learner_api_unreachable" },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
