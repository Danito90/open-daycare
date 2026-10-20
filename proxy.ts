import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/|.*\\.(?:css|js|map|ico|svg|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf|txt|xml)$).*)"],
};
