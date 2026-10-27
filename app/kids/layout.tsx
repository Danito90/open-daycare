import { requireStaffAccess } from "@/utils/auth/guards";

export default async function KidsLayout({ children }: { children: React.ReactNode }) {
  await requireStaffAccess();

  return children;
}
