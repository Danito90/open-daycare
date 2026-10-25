import { type NextRequest, NextResponse } from "next/server";
import { isPublicPath, keepsRecoverySession } from "@/utils/auth/routes";
import { updateSession } from "@/utils/supabase/middleware";

const CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

function redirectWithSession(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url, 303);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  for (const header of CACHE_HEADERS) {
    const value = response.headers.get(header);

    if (value) {
      redirectResponse.headers.set(header, value);
    }
  }

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return redirectWithSession(loginUrl, response);
  }

  if (isAuthenticated && isPublic && !keepsRecoverySession(pathname)) {
    return redirectWithSession(new URL("/", request.url), response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|.*\\.(?:css|js|map|ico|svg|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf|txt|xml)$).*)"],
};
