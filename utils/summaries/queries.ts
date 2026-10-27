import { getLocalDayRange } from "@/utils/posts/time";
import { isPostTypeValue, type PostTypeValue } from "@/utils/posts/types";
import { createClient } from "@/utils/supabase/server";
import type { DailySummary, SummaryChild, SummaryPost } from "./types";

type EmbeddedRoom = { name: string | null } | { name: string | null }[] | null;

type ChildRow = {
  id: string;
  full_name: string;
  birth_date: string;
  rooms: EmbeddedRoom;
};

type LinkRow = { children: ChildRow | ChildRow[] | null };

type PostRow = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  published_at: string;
};

type LinkWithPostRow = { posts: PostRow | PostRow[] | null };

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

function roomName(value: EmbeddedRoom) {
  return firstOf(value)?.name?.trim() ?? "";
}

function toChild(row: ChildRow): SummaryChild {
  return {
    id: row.id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    roomName: roomName(row.rooms),
  };
}

function toPost(row: PostRow): SummaryPost {
  return {
    id: row.id,
    type: (isPostTypeValue(row.type) ? row.type : "activity") as PostTypeValue,
    title: row.title?.trim() ? row.title.trim() : null,
    body: row.body,
    publishedAt: row.published_at,
  };
}

export async function getSummaryChildren(): Promise<SummaryChild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_children")
    .select("children(id, full_name, birth_date, rooms(name))");

  if (error || !data) return [];

  return (data as LinkRow[])
    .map((link) => firstOf(link.children))
    .filter((child): child is ChildRow => Boolean(child))
    .map(toChild)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "es"));
}

export async function getDailySummary(child: SummaryChild, now: Date = new Date()): Promise<DailySummary> {
  const range = getLocalDayRange(now);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("post_children")
    .select("posts!inner(id, type, title, body, published_at)")
    .eq("child_id", child.id)
    .gte("posts.published_at", range.start)
    .lt("posts.published_at", range.end);

  if (error) throw new Error("No pudimos cargar el resumen del día.");

  const posts = (data as LinkWithPostRow[])
    .map((row) => firstOf(row.posts))
    .filter((post): post is PostRow => Boolean(post))
    .map(toPost)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

  return {
    child,
    posts,
    meals: posts.filter((post) => post.type === "meal").length,
    naps: posts.filter((post) => post.type === "nap").length,
    moments: posts.length,
    range,
  };
}
