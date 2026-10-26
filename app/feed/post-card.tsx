import {
  POST_TYPE_LABELS,
  formatAudience,
  type FeedPhoto,
  type FeedPost,
  type PostTypeValue,
} from "@/utils/posts/types";
import { formatPostDate } from "@/utils/posts/format-date";

type VisiblePhoto = FeedPhoto & { url: string };

function visiblePhotos(photos: FeedPhoto[]): VisiblePhoto[] {
  return photos.filter((photo): photo is VisiblePhoto => Boolean(photo.url));
}

function fallbackAlt(type: PostTypeValue) {
  return `Foto de la publicación: ${POST_TYPE_LABELS[type].label.toLowerCase()}`;
}

function PhotoGallery({ photos, type }: { photos: VisiblePhoto[]; type: PostTypeValue }) {
  if (photos.length === 1) {
    const [photo] = photos;

    return (
      <div className="mt-3.5 overflow-hidden rounded-2xl bg-[#F4ECE1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={photo.alt ?? fallbackAlt(type)}
          className="max-h-[420px] w-full object-cover"
          height={photo.height ?? 600}
          loading="lazy"
          src={photo.url}
          width={photo.width ?? 800}
        />
      </div>
    );
  }

  return (
    <div className="mt-3.5 grid grid-cols-2 gap-2">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={photo.alt ?? fallbackAlt(type)}
          className="aspect-square w-full rounded-xl object-cover"
          height={photo.height ?? 400}
          key={photo.id}
          loading="lazy"
          src={photo.url}
          width={photo.width ?? 400}
        />
      ))}
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const type = POST_TYPE_LABELS[post.type];
  const photos = visiblePhotos(post.photos);

  return (
    <article className="rounded-[20px] border border-[#ECE0D0] bg-[#FFFDF9] px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]">
      <header className="mb-3.5 flex items-center gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#A9D9E8] font-[family-name:var(--font-fredoka)] text-[17px] font-semibold text-[#196175]">
          {post.authorInitials}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate font-[family-name:var(--font-fredoka)] text-[16.5px] font-semibold text-[#3F362E]">
            {post.authorName}
          </strong>
          <small className="block text-[12.5px] text-ink-soft">
            {formatPostDate(post.publishedAt)}
          </small>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[.5px] ${type.className}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {type.label.toUpperCase()}
        </span>
      </header>

      <div className="mb-2.5 text-[12.5px] text-ink-soft">{formatAudience(post.audience)}</div>

      {post.title ? (
        <h3 className="mb-2 font-[family-name:var(--font-fredoka)] text-[17px] font-semibold text-[#3F362E]">
          {post.title}
        </h3>
      ) : null}

      <p className="m-0 whitespace-pre-line text-[15.5px] leading-[1.55] text-[#4A4038]">
        {post.body}
      </p>

      {photos.length > 0 ? <PhotoGallery photos={photos} type={post.type} /> : null}

      <footer className="mt-4 border-t border-[#F0E6D8] pt-3.5">
        <p className="m-0 text-sm font-bold text-ink-muted">0 me gusta · 0 comentarios</p>
      </footer>
    </article>
  );
}
