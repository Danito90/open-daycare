export const PANEL_HOME = "/";

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "staff" || role === "admin";
}
