export type AllergyTag = "peanut" | "lactose" | "gluten" | "egg";

export const ALLERGY_TAGS: readonly AllergyTag[] = ["peanut", "lactose", "gluten", "egg"];

export function isAllergyTag(value: string): value is AllergyTag {
  return (ALLERGY_TAGS as readonly string[]).includes(value);
}

export type Room = {
  id: string;
  name: string;
};

export type Kid = {
  id: string;
  fullName: string;
  birthDate: string;
  enrolledAt: string;
  roomId: string;
  roomName: string;
  allergyTags: AllergyTag[];
  medicalNotes: string | null;
  photoConsent: boolean;
};

export type UpdatePhotoConsentState = {
  errors?: { photoConsent?: string };
  formError?: string;
  saved?: boolean;
};

export type AddKidState = {
  errors?: { name?: string; birthDate?: string; roomId?: string };
  formError?: string;
  saved?: boolean;
};
