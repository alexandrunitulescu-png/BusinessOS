import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Refreshes the Supabase session cookie on every request (renamed from
 * `middleware.ts` in Next.js 16 — see node_modules/next/dist/docs .../proxy.md).
 * Server Components can't write cookies, so this is the only place an expired
 * access token reliably gets refreshed before it reaches a page.
 *
 * It also applies a coarse per-IP rate limit to the auth surface. This is a
 * blunt ceiling — the precise per-attempt limits live inside `signInAction` /
 * `signUpAction`, because Server Actions POST to their page route and a matcher
 * change could silently drop proxy coverage (proxy.md §"Execution order").
 */

/** True for requests that hit credential / auth-callback code paths. */
function isAuthSurface(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/auth")) return true;
  // Server Actions arrive as POST to the page they're used on.
  if (request.method === "POST" && (pathname === "/login" || pathname === "/signup")) {
    return true;
  }
  return false;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (isAuthSurface(request)) {
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      "auth:ip",
      clientIp(request),
    );
    if (!allowed) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds || 60) },
      });
    }
  }

  // Do not remove: this call is what actually triggers the refresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
