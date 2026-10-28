export type PostTypeValue =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "photo"
  | "announcement";

export type PostAudience =
  | { scope: "children"; children: { id: string; fullName: string }[] }
  | { scope: "room"; roomId: string; roomName: string }
  | { scope: "daycare" };

export type FeedPhoto = {
  id: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  url: string | null;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  type: PostTypeValue;
  title: string | null;
  body: string;
  publishedAt: string;
  audience: PostAudience;
  photos: FeedPhoto[];
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: string | null;
};

export type ParentFeedFilter =
  | { scope: "all" }
  | { scope: "selected"; childIds: string[]; roomIds: string[]; daycare: boolean };

export type ParentFeedOptions = {
  children: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
};

export type AudienceOption = {
  id: string;
  label: string;
  initial: string;
};

export type AudienceOptions = {
  children: AudienceOption[];
  rooms: { id: string; name: string }[];
};

export type AudienceScope = "children" | "room" | "daycare";

export const POST_TYPE_LABELS: Record<PostTypeValue, { label: string; className: string }> = {
  meal: { label: "Comida", className: "bg-[#F4DC8E] text-[#765E17]" },
  nap: { label: "Siesta", className: "bg-[#E7DCF6] text-[#6E4FBA]" },
  activity: { label: "Actividad", className: "bg-[#C7E7F1] text-[#246B82]" },
  achievement: { label: "Logro", className: "bg-[#CFEBD8] text-[#2D714F]" },
  photo: { label: "Foto", className: "bg-[#FBD8CC] text-[#AA4024]" },
  announcement: { label: "Anuncio", className: "bg-[#CCD8F4] text-[#3659AE]" },
};

export const POST_TYPE_OPTIONS = (
  Object.keys(POST_TYPE_LABELS) as PostTypeValue[]
).map((value) => ({ value, ...POST_TYPE_LABELS[value] }));

export const AUDIENCE_SCOPE_LABELS: Record<AudienceScope, string> = {
  children: "Niños",
  room: "Sala",
  daycare: "Toda la guardería",
};

export function isPostTypeValue(value: string): value is PostTypeValue {
  return value in POST_TYPE_LABELS;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;

  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function roomLabel(name: string) {
  return /^sala\s/i.test(name) ? name : `Sala ${name}`;
}

export function formatAudience(audience: PostAudience): string {
  if (audience.scope === "room") return `Para: ${roomLabel(audience.roomName)}`;
  if (audience.scope === "daycare") return "Para: toda la guardería";

  return `Para: ${joinNames(audience.children.map((child) => child.fullName))}`;
}
