export type UserRole = "staff" | "parent" | "admin";

export type UserProfile = {
  fullName: string;
  role: UserRole | null;
  roleLabel: string;
  daycareName: string | null;
  avatarUrl: string | null;
};
