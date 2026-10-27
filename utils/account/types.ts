export type AccountVariant = "staff" | "family";

export type UpdateProfileState = {
  errors?: { fullName?: string };
  formError?: string;
  saved?: boolean;
};

export type UpdatePreferencesState = {
  formError?: string;
  saved?: boolean;
};

export type AccountDetails = {
  email: string | null;
  notifyOnPost: boolean;
  dailySummaryEnabled: boolean;
};

export type AccountChild = {
  id: string;
  fullName: string;
  birthDate: string;
  roomName: string;
  photoConsent: boolean;
};
