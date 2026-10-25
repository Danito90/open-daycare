export const PUBLIC_PATHS = ["/login", "/activar-cuenta", "/recuperar-contrasena"] as const;

export const AUTH_FLOW_PATHS = ["/actualizar-contrasena"] as const;

const BLOCKED_PREFIXES = ["/_next", "/api"] as const;

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isPublicPath(pathname: string) {
  return [...PUBLIC_PATHS, ...AUTH_FLOW_PATHS].some((path) => matchesPath(pathname, path));
}

export function keepsRecoverySession(pathname: string) {
  return AUTH_FLOW_PATHS.some((path) => matchesPath(pathname, path));
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.includes("\\")) return "/";

  const pathname = value.split("?")[0].split("#")[0];

  if (PUBLIC_PATHS.some((path) => matchesPath(pathname, path))) return "/";
  if (BLOCKED_PREFIXES.some((prefix) => matchesPath(pathname, prefix))) return "/";

  return value;
}
