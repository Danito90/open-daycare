export type RelationshipType = "father" | "mother" | "guardian";

export const RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: RelationshipType;
  label: string;
}> = [
  { value: "mother", label: "Mamá" },
  { value: "father", label: "Papá" },
  { value: "guardian", label: "Tutor/a" },
];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  mother: "Mamá",
  father: "Papá",
  guardian: "Tutor/a",
};

export function isRelationshipType(value: string): value is RelationshipType {
  return value === "father" || value === "mother" || value === "guardian";
}

export type LinkedParent = {
  id: string;
  name: string;
  relationship: RelationshipType;
  status: "pending" | "active";
};

export type InvitationSummary = {
  invitationId: string;
  childName: string;
  roomName: string;
  daycareName: string;
  expiresAt: string;
};

export type LinkParentState = {
  errors?: {
    name?: string;
    email?: string;
    relationship?: string;
    code?: string;
  };
  formError?: string;
  sent?: {
    invitationId: string;
    code: string;
    email: string;
  };
};

export type ActivateAccountState = {
  errors?: {
    code?: string;
    email?: string;
    password?: string;
  };
  formError?: string;
  activated?: boolean;
};
