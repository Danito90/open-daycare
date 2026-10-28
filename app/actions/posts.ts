"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { isStaffRole } from "@/utils/auth/roles";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/utils/kids/queries";
import { isPostTypeValue, type PostTypeValue } from "@/utils/posts/types";
import { getFeedPage, getParentFeedOptions } from "@/utils/posts/queries";
import { hasOperationalAccess } from "@/utils/staff/access";
import { createAdminClient } from "@/utils/supabase/admin";
import type { FeedPage, ParentFeedFilter } from "@/utils/posts/types";

const MAX_PHOTOS = 4;
const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;
const MAX_ALT_LENGTH = 140;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function loadParentFeedPage(
  filter: ParentFeedFilter,
  cursor?: string,
): Promise<{ page: FeedPage } | { error: string }> {
  const profile = await getCurrentProfile();

  if (profile?.role !== "parent" || !profile.userId) {
    return { error: "No tenés permiso para consultar este feed." };
  }

  if (cursor) {
    const parts = cursor.split("|");
    const [timestamp, postId] = parts;
    if (
      cursor.length > 100 ||
      parts.length !== 2 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp ?? "") ||
      !Number.isFinite(Date.parse(timestamp)) ||
      !isUuid(postId ?? "")
    ) {
      return { error: "La página solicitada no es válida." };
    }
  }

  if (!filter || (filter.scope !== "all" && filter.scope !== "selected")) {
    return { error: "El filtro no es válido." };
  }

  try {
    const options = await getParentFeedOptions(profile.userId);

    if (filter.scope === "selected") {
      if (!Array.isArray(filter.childIds) || !Array.isArray(filter.roomIds) || typeof filter.daycare !== "boolean") {
        return { error: "El filtro no es válido." };
      }

      const allowedChildren = new Set(options.children.map((child) => child.id));
      const allowedRooms = new Set(options.rooms.map((room) => room.id));

      if (
        filter.childIds.length + filter.roomIds.length > 100 ||
        (!filter.daycare && filter.childIds.length === 0 && filter.roomIds.length === 0) ||
        !filter.childIds.every((id) => typeof id === "string" && isUuid(id) && allowedChildren.has(id)) ||
        !filter.roomIds.every((id) => typeof id === "string" && isUuid(id) && allowedRooms.has(id))
      ) {
        return { error: "La selección ya no está disponible. Recargá el feed." };
      }
    }

    return { page: await getFeedPage({ cursor, filter }) };
  } catch {
    return { error: "No pudimos cargar las publicaciones. Intentá de nuevo." };
  }
}

export type CreatePostState = {
  errors?: {
    type?: string;
    title?: string;
    body?: string;
    audience?: string;
    photos?: string;
  };
  formError?: string;
  published?: { postId: string };
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = {
  role: string | null;
  daycare_id: string | null;
};

type EmbeddedRoom = { daycare_id: string } | { daycare_id: string }[] | null;

type ChildRow = {
  id: string;
  full_name: string;
  photo_consent: boolean;
  rooms: EmbeddedRoom;
};

type PhotoMeta = {
  alt: string | null;
  width: number | null;
  height: number | null;
};

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

function parsePhotoMeta(raw: string, count: number): PhotoMeta[] {
  let parsed: unknown = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.slice(0, count).map((item) => {
    const entry = item as { alt?: unknown; width?: unknown; height?: unknown } | null;
    const alt = typeof entry?.alt === "string" ? entry.alt.trim().slice(0, MAX_ALT_LENGTH) : "";
    const width = Number.isInteger(entry?.width) && Number(entry?.width) > 0 ? Number(entry?.width) : null;
    const height = Number.isInteger(entry?.height) && Number(entry?.height) > 0 ? Number(entry?.height) : null;

    return { alt: alt || null, width, height };
  });
}

async function findExistingPost(supabase: ServerClient, authorId: string, idempotencyKey: string) {
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", authorId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? null;
}

async function loadDaycareChildren(supabase: ServerClient, daycareId: string) {
  const { data: rooms } = await supabase.from("rooms").select("id").eq("daycare_id", daycareId);
  const roomIds = ((rooms ?? []) as { id: string }[]).map((room) => room.id);

  if (roomIds.length === 0) return [];

  const { data } = await supabase
    .from("children")
    .select("id, full_name, photo_consent")
    .in("room_id", roomIds);

  return (data ?? []) as { id: string; full_name: string; photo_consent: boolean }[];
}

export async function createPost(
  _previousState: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();
  const rawType = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audienceScope = String(formData.get("audienceScope") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const childIds = [...new Set(formData.getAll("childIds").map(String).filter(Boolean))];
  const photoFiles = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const photoMeta = parsePhotoMeta(String(formData.get("photoMeta") ?? ""), photoFiles.length);

  if (!isUuid(idempotencyKey)) {
    return { formError: "Recargá la página e intentá de nuevo." };
  }

  const errors: NonNullable<CreatePostState["errors"]> = {};

  if (!isPostTypeValue(rawType)) {
    errors.type = "Seleccioná un tipo de publicación.";
  }

  if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
  }

  if (!body) {
    errors.body = "Escribí una descripción.";
  } else if (body.length > MAX_BODY_LENGTH) {
    errors.body = `La descripción no puede superar los ${MAX_BODY_LENGTH} caracteres.`;
  }

  if (audienceScope !== "children" && audienceScope !== "room" && audienceScope !== "daycare") {
    errors.audience = "Elegí para quién es la publicación.";
  } else if (audienceScope === "children" && childIds.length === 0) {
    errors.audience = "Seleccioná al menos un niño.";
  } else if (audienceScope === "children" && !childIds.every(isUuid)) {
    errors.audience = "Seleccioná niños válidos.";
  } else if (audienceScope === "room" && !isUuid(roomId)) {
    errors.audience = "Seleccioná una sala.";
  } else if (audienceScope === "daycare" && rawType !== "announcement") {
    errors.audience = "Para toda la guardería, elegí el tipo Anuncio.";
  }

  if (photoFiles.length > MAX_PHOTOS) {
    errors.photos = `Podés adjuntar hasta ${MAX_PHOTOS} fotos.`;
  } else if (rawType === "photo" && photoFiles.length === 0) {
    errors.photos = "Elegí al menos una foto para este tipo de publicación.";
  } else if (photoFiles.some((file) => !PHOTO_EXTENSIONS[file.type])) {
    errors.photos = "Alguna foto tiene un formato no compatible. Volvé a elegirla.";
  } else if (photoFiles.some((file) => file.size > MAX_PHOTO_BYTES)) {
    errors.photos = "Cada foto debe pesar menos de 2 MB.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  let userId: string;

  try {
    const { data, error } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;

    if (error || typeof subject !== "string") {
      return { formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
    }

    userId = subject;
  } catch {
    return { formError: "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("users")
    .select("role, daycare_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { formError: "No pudimos verificar tu perfil. Intentá de nuevo." };
  }

  const profile = profileData as ProfileRow | null;
  const daycareId = profile?.daycare_id ?? null;
  const role = profile?.role ?? null;

  if (!daycareId) {
    return { formError: "Tu perfil está incompleto. Contactá a la guardería." };
  }

  if (!isStaffRole(role)) {
    return { formError: "Solo el personal de la guardería puede publicar." };
  }
  if (role === "staff" && !(await hasOperationalAccess(userId))) {
    return { formError: "No tenés salas asignadas para publicar." };
  }
  if (role === "staff" && audienceScope === "daycare") {
    return { errors: { audience: "Solo el administrador puede publicar anuncios generales." } };
  }

  const existingPostId = await findExistingPost(supabase, userId, idempotencyKey);

  if (existingPostId) {
    return { published: { postId: existingPostId } };
  }

  const type = rawType as PostTypeValue;
  let children: { id: string; full_name: string; photo_consent: boolean }[] = [];

  if (audienceScope === "children") {
    const { data, error } = await supabase
      .from("children")
      .select("id, full_name, photo_consent, rooms(daycare_id)")
      .in("id", childIds);

    if (error) {
      return { formError: "No pudimos verificar los niños elegidos. Intentá de nuevo." };
    }

    const rows = (data ?? []) as ChildRow[];

    if (rows.length !== childIds.length) {
      return { errors: { audience: "Alguno de los niños elegidos ya no está disponible." } };
    }

    if (rows.some((row) => firstOf(row.rooms)?.daycare_id !== daycareId)) {
      return { errors: { audience: "Los niños elegidos no pertenecen a tu guardería." } };
    }

    children = rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      photo_consent: row.photo_consent,
    }));
  } else if (audienceScope === "room") {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, daycare_id")
      .eq("id", roomId)
      .maybeSingle();

    if (error) {
      return { formError: "No pudimos verificar la sala. Intentá de nuevo." };
    }

    const room = data as { id: string; name: string; daycare_id: string } | null;

    if (!room || room.daycare_id !== daycareId) {
      return { errors: { audience: "Elegí una sala de tu guardería." } };
    }

    const { data: roomChildren } = await supabase
      .from("children")
      .select("id, full_name, photo_consent")
      .eq("room_id", roomId);

    children = (roomChildren ?? []) as { id: string; full_name: string; photo_consent: boolean }[];
  } else {
    children = await loadDaycareChildren(supabase, daycareId);
  }

  if (photoFiles.length > 0) {
    const blocked = children.find((child) => child.photo_consent === false);

    if (blocked) {
      return {
        errors: {
          photos: `${blocked.full_name} no tiene autorización para aparecer en fotos. Quitá las fotos o cambiá el alcance.`,
        },
      };
    }
  }

  let cleanupClient: ReturnType<typeof createAdminClient> | null = null;
  if (photoFiles.length > 0) {
    try {
      cleanupClient = createAdminClient();
    } catch {
      return { formError: "No pudimos preparar la publicación con fotos. Contactá a soporte." };
    }
  }

  const postId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const photoRows: {
    post_id: string;
    storage_path: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    position: number;
  }[] = [];

  const { error: postError } = audienceScope === "children"
    ? await supabase.rpc("publish_individual_post", {
      p_id: postId, p_type: type, p_title: title || null, p_body: body,
      p_idempotency_key: idempotencyKey, p_child_ids: childIds,
    })
    : await supabase.from("posts").insert({
      id: postId, daycare_id: daycareId, author_id: userId,
      room_id: audienceScope === "room" ? roomId : null,
      type, title: title || null, body, idempotency_key: idempotencyKey,
    });

  if (postError) {
    if (postError.code === "23505") {
      const existingId = await findExistingPost(supabase, userId, idempotencyKey);

      if (existingId) return { published: { postId: existingId } };
    }

    if (postError.code === "42501") {
      return { formError: "Tu perfil no tiene permiso para publicar." };
    }

    return { formError: "No pudimos guardar la publicación. Intentá de nuevo." };
  }

  async function discardIncompletePost() {
    if (!cleanupClient) return false;
    if (uploadedPaths.length) {
      const { error } = await cleanupClient.storage.from("post-photos").remove(uploadedPaths);
      if (error) return false;
    }
    const { error } = await cleanupClient.from("posts").delete().eq("id", postId).eq("author_id", userId);
    return !error;
  }

  for (const [position, file] of photoFiles.entries()) {
    const extension = PHOTO_EXTENSIONS[file.type];
    const storagePath = `${daycareId}/${postId}/${position}.${extension}`;
    const { error } = await supabase.storage.from("post-photos").upload(storagePath, file, {
      contentType: file.type, upsert: false,
    });
    if (error) {
      const removed = await discardIncompletePost();
      return { formError: removed ? "No pudimos subir las fotos. Intentá de nuevo." : "No pudimos limpiar la publicación incompleta. Contactá a soporte." };
    }
    uploadedPaths.push(storagePath);
    photoRows.push({ post_id: postId, storage_path: storagePath,
      alt: photoMeta[position]?.alt ?? null, width: photoMeta[position]?.width ?? null,
      height: photoMeta[position]?.height ?? null, position });
  }

  if (photoRows.length > 0) {
    const { error } = await supabase.from("post_photos").insert(photoRows);

    if (error) {
      const removed = await discardIncompletePost();
      return { formError: removed ? "No pudimos adjuntar las fotos a la publicación. Intentá de nuevo." : "No pudimos limpiar la publicación incompleta. Contactá a soporte." };
    }
  }

  revalidatePath("/");

  return { published: { postId } };
}
