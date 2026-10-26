"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createPost, type CreatePostState } from "@/app/actions/posts";
import { compressImage, ImageCompressionError } from "@/utils/posts/compress-image";
import {
  POST_TYPE_OPTIONS,
  type AudienceOptions,
  type AudienceScope,
  type PostTypeValue,
} from "@/utils/posts/types";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, SearchIcon } from "../components/icons";
import { CameraIcon } from "../components/feed-icons";

const MAX_PHOTOS = 4;
const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;
const MAX_ALT_LENGTH = 140;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='file'])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const SCOPE_OPTIONS: { value: AudienceScope; label: string }[] = [
  { value: "children", label: "Niños" },
  { value: "room", label: "Sala" },
  { value: "daycare", label: "Toda la guardería" },
];

type PhotoDraft = {
  id: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  alt: string;
};

type FormErrors = {
  type?: string;
  title?: string;
  body?: string;
  audience?: string;
  photos?: string;
};

type CreatePostModalProps = {
  open: boolean;
  audienceOptions: AudienceOptions;
  onClose: () => void;
};

const initialState: CreatePostState = {};

export function CreatePostModal({ open, ...rest }: CreatePostModalProps) {
  if (!open) return null;

  return <CreatePostModalContent {...rest} />;
}

function CreatePostModalContent({
  audienceOptions,
  onClose,
}: Omit<CreatePostModalProps, "open">) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createPost, initialState);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [scope, setScope] = useState<AudienceScope>("children");
  const [childIds, setChildIds] = useState<string[]>([]);
  const [childQuery, setChildQuery] = useState("");
  const [roomId, setRoomId] = useState("");
  const [type, setType] = useState<PostTypeValue | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const photosRef = useRef(photos);
  const publishedRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const errors: FormErrors = { ...state.errors, ...localErrors };

  const filteredChildren = useMemo(() => {
    const query = childQuery.trim().toLowerCase();

    if (!query) return audienceOptions.children;

    return audienceOptions.children.filter((child) =>
      child.label.toLowerCase().includes(query),
    );
  }, [audienceOptions.children, childQuery]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!state.published || publishedRef.current) return;

    publishedRef.current = true;
    router.refresh();
    onCloseRef.current();
  }, [state.published, router]);

  function selectScope(next: AudienceScope) {
    setScope(next);
    setLocalErrors((current) => ({ ...current, audience: undefined }));

    if (next === "daycare") setType("announcement");
  }

  function toggleChild(childId: string) {
    setChildIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
    setLocalErrors((current) => ({ ...current, audience: undefined }));
  }

  function selectRoom(nextRoomId: string) {
    setRoomId(nextRoomId);
    setLocalErrors((current) => ({ ...current, audience: undefined }));
  }

  function selectType(nextType: PostTypeValue) {
    setType(nextType);
    setLocalErrors((current) => ({ ...current, type: undefined, photos: undefined }));
  }

  function movePhoto(index: number, offset: number) {
    setPhotos((current) => {
      const target = index + offset;

      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);

      return next;
    });
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === photoId);

      if (removed) URL.revokeObjectURL(removed.previewUrl);

      return current.filter((photo) => photo.id !== photoId);
    });
  }

  function updatePhotoAlt(photoId: string, alt: string) {
    setPhotos((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, alt } : photo)),
    );
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const available = MAX_PHOTOS - photos.length;

    setPhotoError(null);

    if (available <= 0) {
      setPhotoError(`Podés adjuntar hasta ${MAX_PHOTOS} fotos.`);
      return;
    }

    setIsCompressing(true);

    for (const file of Array.from(fileList).slice(0, available)) {
      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed.blob);

        setPhotos((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            blob: compressed.blob,
            previewUrl,
            width: compressed.width,
            height: compressed.height,
            alt: "",
          },
        ]);
      } catch (error) {
        setPhotoError(
          error instanceof ImageCompressionError
            ? error.message
            : "No pudimos procesar esta foto. Probá con otra imagen.",
        );
      }
    }

    setIsCompressing(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!type) next.type = "Seleccioná un tipo de publicación.";

    if (title.trim().length > MAX_TITLE_LENGTH) {
      next.title = `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
    }

    if (!body.trim()) {
      next.body = "Escribí una descripción.";
    } else if (body.trim().length > MAX_BODY_LENGTH) {
      next.body = `La descripción no puede superar los ${MAX_BODY_LENGTH} caracteres.`;
    }

    if (scope === "children" && childIds.length === 0) {
      next.audience = "Seleccioná al menos un niño.";
    }

    if (scope === "room" && !roomId) {
      next.audience = "Seleccioná una sala.";
    }

    if (scope === "daycare" && type !== "announcement") {
      next.audience = "Para toda la guardería, elegí el tipo Anuncio.";
    }

    if (type === "photo" && photos.length === 0) {
      next.photos = "Elegí al menos una foto para este tipo de publicación.";
    }

    if (photos.length > MAX_PHOTOS) {
      next.photos = `Podés adjuntar hasta ${MAX_PHOTOS} fotos.`;
    }

    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setLocalErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const formData = new FormData();

    formData.set("idempotencyKey", idempotencyKey);
    formData.set("type", type);
    formData.set("title", title);
    formData.set("body", body);
    formData.set("audienceScope", scope);

    if (scope === "room") formData.set("roomId", roomId);
    if (scope === "children") childIds.forEach((childId) => formData.append("childIds", childId));

    photos.forEach((photo, index) => {
      formData.append(
        "photos",
        new File([photo.blob], `${index}.webp`, { type: "image/webp" }),
      );
    });

    formData.set(
      "photoMeta",
      JSON.stringify(
        photos.map((photo) => ({
          alt: photo.alt.trim(),
          width: photo.width,
          height: photo.height,
        })),
      ),
    );

    startTransition(() => formAction(formData));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(63_54_46/35%)] px-4 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="create-post-title"
        aria-modal="true"
        className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            className="text-[15px] font-bold text-ink-muted hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            onClick={() => onCloseRef.current()}
            type="button"
          >
            Cancelar
          </button>
          <h2
            className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-ink-strong"
            id="create-post-title"
          >
            Nueva publicación
          </h2>
          <button
            className="text-[15px] font-extrabold text-brand hover:text-[#8A351F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending || isCompressing}
            form="create-post-form"
            type="submit"
          >
            {isPending ? "Publicando…" : "Publicar"}
          </button>
        </div>

        <form
          className="px-[26px] py-6"
          id="create-post-form"
          noValidate
          onSubmit={handleSubmit}
        >
          <div aria-live="polite">
            {state.formError ? (
              <p
                className="mb-4 rounded-[12px] border border-[#E6B9AE] bg-[#FBEAE5] px-4 py-3 text-sm font-bold text-[#8A2E28]"
                role="alert"
              >
                {state.formError}
              </p>
            ) : null}
          </div>

          <fieldset className="mb-5">
            <legend className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted">
              PARA
            </legend>
            <div className="flex flex-wrap gap-[9px]">
              {SCOPE_OPTIONS.map((option, index) => (
                <label className="cursor-pointer" key={option.value}>
                  <input
                    checked={scope === option.value}
                    className="peer sr-only"
                    name="audienceScope"
                    onChange={() => selectScope(option.value)}
                    ref={index === 0 ? initialFocusRef : undefined}
                    type="radio"
                    value={option.value}
                  />
                  <span className="inline-flex rounded-full border-[1.5px] border-field-line bg-[#FFFDF9] px-4 py-1.5 text-[14px] font-bold text-ink-soft peer-checked:border-[#3F362E] peer-checked:bg-[#3F362E] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {scope === "children" ? (
            <div className="mb-5">
              <label
                className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted"
                htmlFor="post-child-search"
              >
                BUSCAR NIÑO
              </label>
              <div className="mb-2 flex items-center gap-2 rounded-[12px] border-[1.5px] border-field-line bg-white px-3">
                <SearchIcon className="h-4 w-4 flex-none text-ink-soft" />
                <input
                  aria-describedby={errors.audience ? "post-audience-error" : undefined}
                  autoComplete="off"
                  className="w-full bg-transparent py-2 text-[14px] text-ink-strong placeholder:text-field-placeholder focus:outline-none"
                  id="post-child-search"
                  onChange={(event) => setChildQuery(event.target.value)}
                  placeholder="Escribí un nombre"
                  type="search"
                  value={childQuery}
                />
              </div>
              <div
                aria-label="Niños destinatarios"
                className="flex max-h-[132px] flex-wrap gap-[9px] overflow-y-auto"
                role="group"
              >
                {filteredChildren.length === 0 ? (
                  <p className="text-[13px] text-ink-soft">No encontramos niños con ese nombre.</p>
                ) : (
                  filteredChildren.map((child) => {
                    const isSelected = childIds.includes(child.id);

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                          isSelected
                            ? "border-[#3F362E] bg-[#3F362E] text-white"
                            : "border-field-line bg-[#FFFDF9] text-ink-soft"
                        }`}
                        key={child.id}
                        onClick={() => toggleChild(child.id)}
                        type="button"
                      >
                        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#A9D9E8] font-[family-name:var(--font-fredoka)] text-[13px] font-semibold text-[#196175]">
                          {child.initial}
                        </span>
                        {child.label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}

          {scope === "room" ? (
            <fieldset className="mb-5">
              <legend className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted">
                SALA
              </legend>
              <div className="flex flex-wrap gap-[9px]">
                {audienceOptions.rooms.length === 0 ? (
                  <p className="text-[13px] text-ink-soft">Todavía no hay salas cargadas.</p>
                ) : (
                  audienceOptions.rooms.map((room) => (
                    <label className="cursor-pointer" key={room.id}>
                      <input
                        checked={roomId === room.id}
                        className="peer sr-only"
                        name="roomId"
                        onChange={() => selectRoom(room.id)}
                        type="radio"
                        value={room.id}
                      />
                      <span className="inline-flex rounded-full border-[1.5px] border-field-line bg-[#FFFDF9] px-4 py-1.5 text-[14px] font-bold text-ink-soft peer-checked:border-[#3F362E] peer-checked:bg-[#3F362E] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                        {room.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
          ) : null}

          {scope === "daycare" ? (
            <p className="mb-5 rounded-[12px] bg-[#F4ECE1] px-4 py-3 text-[13.5px] text-ink-soft">
              Se publica como anuncio para todas las familias de la guardería.
            </p>
          ) : null}

          <FieldError id="post-audience-error" message={errors.audience} />

          <fieldset className="mb-5">
            <legend className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted">
              TIPO
            </legend>
            <div
              aria-describedby={errors.type ? "post-type-error" : undefined}
              className="flex flex-wrap gap-[9px]"
            >
              {POST_TYPE_OPTIONS.map((option) => (
                <button
                  aria-pressed={type === option.value}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${option.className} ${
                    type === option.value ? "ring-2 ring-[#3F362E] ring-offset-1" : ""
                  }`}
                  key={option.value}
                  onClick={() => selectType(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <FieldError id="post-type-error" message={errors.type} />

          <label
            className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted"
            htmlFor="post-title"
          >
            TÍTULO (OPCIONAL)
          </label>
          <input
            aria-describedby={errors.title ? "post-title-error" : undefined}
            aria-invalid={Boolean(errors.title)}
            className={`mb-5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-[15px] text-ink-strong placeholder:text-field-placeholder focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              errors.title ? "border-[#C5413A]" : "border-field-line"
            }`}
            id="post-title"
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Un título corto, si querés"
            type="text"
            value={title}
          />
          <FieldError id="post-title-error" message={errors.title} />

          <label
            className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted"
            htmlFor="post-body"
          >
            DESCRIPCIÓN
          </label>
          <textarea
            aria-describedby={errors.body ? "post-body-error" : "post-body-counter"}
            aria-invalid={Boolean(errors.body)}
            className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink-strong placeholder:text-field-placeholder focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              errors.body ? "border-[#C5413A]" : "border-field-line"
            }`}
            id="post-body"
            maxLength={MAX_BODY_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Contá cómo le fue hoy…"
            value={body}
          />
          <p className="mt-1 mb-5 text-right text-[12px] text-ink-soft" id="post-body-counter">
            {body.length}/{MAX_BODY_LENGTH}
          </p>
          <FieldError id="post-body-error" message={errors.body} />

          <p className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted">
            FOTOS
          </p>
          <div className="flex flex-wrap items-start gap-3">
            {photos.map((photo, index) => (
              <div
                className="w-[220px] rounded-[14px] border border-[#ECE0D0] bg-[#FFFDF9] p-2"
                key={photo.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-24 w-24 rounded-[10px] object-cover"
                  height={96}
                  src={photo.previewUrl}
                  width={96}
                />
                <label className="mt-2 block text-[11px] font-bold text-ink-soft">
                  Texto alternativo
                  <input
                    className="mt-1 w-full rounded-[8px] border border-field-line bg-white px-2 py-1 text-[12px] font-normal text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
                    maxLength={MAX_ALT_LENGTH}
                    onChange={(event) => updatePhotoAlt(photo.id, event.target.value)}
                    placeholder="Describí la foto"
                    value={photo.alt}
                  />
                </label>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    aria-label={`Mover la foto ${index + 1} a la izquierda`}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F6ECDF] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => movePhoto(index, -1)}
                    type="button"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Mover la foto ${index + 1} a la derecha`}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F6ECDF] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
                    disabled={index === photos.length - 1}
                    onClick={() => movePhoto(index, 1)}
                    type="button"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Quitar la foto ${index + 1}`}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#FBE3D8] text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    onClick={() => removePhoto(photo.id)}
                    type="button"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {photos.length < MAX_PHOTOS ? (
              <button
                className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
                disabled={isCompressing}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <CameraIcon className="h-[22px] w-[22px] !stroke-brand" />
                <span className="text-xs">{isCompressing ? "Procesando…" : "Agregar"}</span>
              </button>
            ) : null}
          </div>

          <input
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            aria-hidden="true"
            className="sr-only"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />

          <div aria-live="polite">
            <FieldError id="post-photos-error" message={errors.photos ?? photoError ?? undefined} />
          </div>

          <p className="mt-2 text-[12px] text-ink-soft">
            Hasta {MAX_PHOTOS} fotos. Las imágenes se comprimen a 1600 px antes de subirse.
          </p>
        </form>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1 mb-4 text-xs font-bold text-[#B13A34]" id={id} role="alert">
      {message}
    </p>
  );
}
