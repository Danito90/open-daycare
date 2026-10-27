import type { PostTypeValue } from "@/utils/posts/types";

export type SummaryChild = {
  id: string;
  fullName: string;
  birthDate: string;
  roomName: string;
};

export type SummaryPost = {
  id: string;
  type: PostTypeValue;
  title: string | null;
  body: string;
  publishedAt: string;
};

export type DailySummary = {
  child: SummaryChild;
  posts: SummaryPost[];
  meals: number;
  naps: number;
  moments: number;
  range: { start: string; end: string };
};
