export type UserRole = "staff" | "parent" | "admin";

export type UserProfile = {
  userId: string | null;
  daycareId: string | null;
  fullName: string;
  role: UserRole | null;
  roleLabel: string;
  daycareName: string | null;
  avatarUrl: string | null;
  hasAssignedRooms?: boolean;
};
