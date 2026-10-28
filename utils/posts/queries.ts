import { getInitials } from "@/utils/format/initials";
import { createClient } from "@/utils/supabase/server";
import {
  type AudienceOptions,
  type FeedPage,
  type FeedPhoto,
  type FeedPost,
  type ParentFeedFilter,
  type ParentFeedOptions,
  type PostAudience,
  type PostTypeValue,
  isPostTypeValue,
} from "./types";

const FEED_PAGE_SIZE = 20;
const SIGNED_URL_TTL_SECONDS = 3600;

const POST_COLUMNS = `
  id,
  author_id,
  room_id,
  type,
  title,
  body,
  published_at,
  author:users!posts_author_id_fkey(full_name, avatar_url),
  rooms(name),
  post_children(children(id, full_name)),
  post_photos(id, alt, width, height, storage_path, position)
`;

const FILTER_COLUMNS = `${POST_COLUMNS},
  matching_children:post_children(),
  general_children:post_children()
`;

type EmbeddedAuthor = { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
type EmbeddedRoom = { name: string } | { name: string }[] | null;
type EmbeddedChild = { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;

type PostRow = {
  id: string;
  author_id: string;
  room_id: string | null;
  type: string;
  title: string | null;
  body: string;
  published_at: string;
  author: EmbeddedAuthor;
  rooms: EmbeddedRoom;
  post_children: { children: EmbeddedChild }[] | null;
  post_photos: {
    id: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    storage_path: string;
    position: number;
  }[] | null;
};

export type FeedSummary = {
  activeChildren: number;
  linkedChildren: number;
};

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

function encodeCursor(post: { published_at: string; id: string }) {
  return `${post.published_at}|${post.id}`;
}

function decodeCursor(cursor: string) {
  const separator = cursor.lastIndexOf("|");
  if (separator <= 0) return null;

  return { publishedAt: cursor.slice(0, separator), id: cursor.slice(separator + 1) };
}

async function signPhotoUrls(
  photos: { storage_path: string }[],
): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();
  if (photos.length === 0) return urls;

  const supabase = await createClient();
  const paths = photos.map((photo) => photo.storage_path);
  const { data } = await supabase.storage
    .from("post-photos")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  for (const item of data ?? []) {
    urls.set(item.path ?? "", item.signedUrl ?? null);
  }

  return urls;
}

function toAudience(row: PostRow): PostAudience {
  if (row.room_id) {
    return { scope: "room", roomId: row.room_id, roomName: firstOf(row.rooms)?.name ?? "" };
  }

  const children = (row.post_children ?? [])
    .map((link) => firstOf(link.children))
    .filter((child): child is { id: string; full_name: string | null } => Boolean(child))
    .map((child) => ({ id: child.id, fullName: child.full_name?.trim() ?? "" }))
    .filter((child) => Boolean(child.fullName));

  if (children.length > 0) {
    return { scope: "children", children };
  }

  return { scope: "daycare" };
}

export async function getParentFeedOptions(parentId: string): Promise<ParentFeedOptions> {
  const supabase = await createClient();
  const { data: links, error: linksError } = await supabase
    .from("parent_children")
    .select("child_id")
    .eq("parent_id", parentId);

  if (linksError) throw new Error("No pudimos cargar tus hijos.");

  const childIds = [...new Set((links ?? []).map((link) => link.child_id as string))];
  if (childIds.length === 0) return { children: [], rooms: [] };

  const { data, error } = await supabase
    .from("children")
    .select("id, full_name, rooms(id, name)")
    .in("id", childIds)
    .order("full_name");

  if (error) throw new Error("No pudimos cargar tus hijos.");

  const rows = (data ?? []) as {
    id: string;
    full_name: string;
    rooms: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  const rooms = new Map<string, string>();

  for (const child of rows) {
    const room = firstOf(child.rooms);
    if (room) rooms.set(room.id, room.name);
  }

  return {
    children: rows.map((child) => ({ id: child.id, name: child.full_name })),
    rooms: [...rooms].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getFeedPage(options: {
  cursor?: string;
  limit?: number;
  filter?: ParentFeedFilter;
} = {}): Promise<FeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(options.filter?.scope === "selected" ? FILTER_COLUMNS : POST_COLUMNS)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.filter?.scope === "selected") {
    const { childIds, roomIds, daycare } = options.filter;
    const conditions: string[] = [];

    if (childIds.length > 0) {
      query = query.in("matching_children.child_id", childIds);
      conditions.push("matching_children.not.is.null");
    }
    if (roomIds.length > 0) conditions.push(`room_id.in.(${roomIds.join(",")})`);
    if (daycare) conditions.push("and(type.eq.announcement,room_id.is.null,general_children.is.null)");

    if (conditions.length === 0) return { posts: [], nextCursor: null };
    query = query.or(conditions.join(","));
  }

  if (options.cursor) {
    const cursor = decodeCursor(options.cursor);

    if (cursor) {
      query = query.or(
        `published_at.lt."${cursor.publishedAt}",and(published_at.eq."${cursor.publishedAt}",id.lt.${cursor.id})`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error("No pudimos cargar las publicaciones.");

  const rows = (data ?? []) as unknown as PostRow[];
  const pageRows = rows.slice(0, limit);
  const signedUrls = await signPhotoUrls(
    pageRows.flatMap((row) => (row.post_photos ?? []).map((photo) => ({ storage_path: photo.storage_path }))),
  );

  const posts: FeedPost[] = pageRows.map((row) => {
    const author = firstOf(row.author);
    const authorName = author?.full_name?.trim() || "Usuario";

    const photos: FeedPhoto[] = (row.post_photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        id: photo.id,
        alt: photo.alt,
        width: photo.width,
        height: photo.height,
        url: signedUrls.get(photo.storage_path) ?? null,
      }));

    return {
      id: row.id,
      authorId: row.author_id,
      authorName,
      authorInitials: getInitials(authorName),
      type: (isPostTypeValue(row.type) ? row.type : "activity") as PostTypeValue,
      title: row.title?.trim() ? row.title.trim() : null,
      body: row.body,
      publishedAt: row.published_at,
      audience: toAudience(row),
      photos,
    };
  });

  const lastRow = pageRows[pageRows.length - 1];

  return {
    posts,
    nextCursor: rows.length > limit && lastRow ? encodeCursor(lastRow) : null,
  };
}

const MAX_FEED_PAGES = 20;

export async function getFeed(cursor?: string): Promise<FeedPage> {
  const posts: FeedPost[] = [];
  let pageCursor: string | undefined;
  let nextCursor: string | null = null;

  for (let page = 0; page < MAX_FEED_PAGES; page += 1) {
    const result = await getFeedPage({ cursor: pageCursor });

    posts.push(...result.posts);
    nextCursor = result.nextCursor;

    if (!cursor || pageCursor === cursor || !result.nextCursor) break;

    pageCursor = result.nextCursor;
  }

  return { posts, nextCursor };
}

export async function getAudienceOptions(): Promise<AudienceOptions> {
  const supabase = await createClient();

  const [childrenResult, roomsResult] = await Promise.all([
    supabase
      .from("children")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
    supabase.from("rooms").select("id, name").order("name"),
  ]);

  if (childrenResult.error) throw new Error("No pudimos cargar los niños.");
  if (roomsResult.error) throw new Error("No pudimos cargar las salas.");

  return {
    children: ((childrenResult.data ?? []) as { id: string; full_name: string }[]).map((child) => ({
      id: child.id,
      label: child.full_name,
      initial: getInitials(child.full_name),
    })),
    rooms: ((roomsResult.data ?? []) as { id: string; name: string }[]).map((room) => ({
      id: room.id,
      name: room.name,
    })),
  };
}

export async function getFeedSummary(): Promise<FeedSummary> {
  const supabase = await createClient();

  const [childrenResult, linksResult] = await Promise.all([
    supabase.from("children").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("parent_children").select("child_id", { count: "exact", head: true }),
  ]);

  return {
    activeChildren: childrenResult.count ?? 0,
    linkedChildren: linksResult.count ?? 0,
  };
}
