export type UserRole = "staff" | "parent" | "admin";

export type UserProfile = {
  fullName: string;
  roleLabel: string;
  daycareName: string | null;
  avatarUrl: string | null;
};
