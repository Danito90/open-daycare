export type StaffRoom = { id: string; name: string };

export type StaffEntry = {
  id: string;
  name: string;
  email: string | null;
  rooms: string[];
  kind: "member" | "invitation";
  status: "active" | "pending" | "expired";
};

export type StaffFormState = {
  errors?: { name?: string; email?: string; rooms?: string };
  formError?: string;
  saved?: boolean;
};

export type StaffInvitationSummary = {
  invitationId: string;
  daycareName: string;
  rooms: string[];
  expiresAt: string;
};
