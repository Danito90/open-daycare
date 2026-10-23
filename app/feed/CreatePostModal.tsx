"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { CameraIcon, ImageIcon } from "../components/feed-icons";

type Recipient = "mateo" | "sofia" | "benjamin" | "all";

export type CreatePostForm = {
  recipients: Recipient[];
  type: "Comida" | "Siesta" | "Actividad" | "Logro" | "Ánimo" | "Foto" | "Anuncio" | "";
  description: string;
};

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePostForm) => void;
};

type FormErrors = Partial<Record<keyof CreatePostForm, string>>;

const childRecipients = [
  { value: "mateo", label: "Mateo", initial: "M", background: "#A9D9E8", color: "#1F7A93" },
  { value: "sofia", label: "Sofía", initial: "S", background: "#F4B8CC", color: "#C44A7A" },
  { value: "benjamin", label: "Benjamín", initial: "B", background: "#B9DEC4", color: "#3E8B62" },
] as const;

const postTypes = [
  ["Comida", "bg-[#F4DC8E] text-[#9A7B1E]"],
  ["Siesta", "bg-[#E7DCF6] text-[#7B5FC0]"],
  ["Actividad", "bg-[#C7E7F1] text-[#2E89A6]"],
  ["Logro", "bg-[#CFEBD8] text-[#3E9B6C]"],
  ["Ánimo", "bg-[#F9D2DE] text-[#C56486]"],
  ["Foto", "bg-[#FBD8CC] text-[#D9684A]"],
  ["Anuncio", "bg-[#CCD8F4] text-[#4E72C8]"],
] as const;

const emptyForm: CreatePostForm = { recipients: [], type: "", description: "" };

export function CreatePostModal({ open, onClose, onSubmit }: CreatePostModalProps) {
  if (!open) return null;

  return <CreatePostModalContent onClose={onClose} onSubmit={onSubmit} />;
}

function CreatePostModalContent({ onClose, onSubmit }: Omit<CreatePostModalProps, "open">) {
  const [form, setForm] = useState<CreatePostForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function updateField(field: keyof CreatePostForm, value: string) {
    setForm((current) => ({ ...current, [field]: value } as CreatePostForm));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function toggleRecipient(value: "mateo" | "sofia" | "benjamin") {
    setForm((current) => ({
      ...current,
      recipients: current.recipients.includes(value) ? current.recipients.filter((recipient) => recipient !== value) : [...current.recipients.filter((recipient) => recipient !== "all"), value],
    }));
    setErrors((current) => ({ ...current, recipients: undefined }));
  }

  function toggleAllRecipients() {
    setForm((current) => ({ ...current, recipients: current.recipients.includes("all") ? [] : ["all"] }));
    setErrors((current) => ({ ...current, recipients: undefined }));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(63_54_46/35%)] px-4 py-10" onMouseDown={handleBackdropClick}>
      <div className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <button className="text-[15px] font-bold text-[#94887B]" type="button" onClick={onClose}>Cancelar</button>
          <h2 id="create-post-title" className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Nueva publicación</h2>
          <button className="text-[15px] font-extrabold text-[#D9583C]" type="submit" form="create-post-form">Publicar</button>
        </div>

        <form id="create-post-form" className="px-[26px] py-6" onSubmit={handleSubmit} noValidate>
          <FieldLabel>PARA</FieldLabel>
          <div className="flex flex-wrap gap-[9px]" role="group" aria-label="Niños destinatarios">
            {childRecipients.map((recipient) => (
              <button
                className={`flex items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-[14px] font-bold ${form.recipients.includes(recipient.value) ? "border-[#3F362E] bg-[#3F362E] text-white" : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"}`}
                key={recipient.value}
                type="button"
                aria-pressed={form.recipients.includes(recipient.value)}
                onClick={() => toggleRecipient(recipient.value)}
              >
                {recipient.initial && <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[13px] font-semibold" style={{ backgroundColor: recipient.background, color: recipient.color }}>{recipient.initial}</span>}
                {recipient.label}
              </button>
            ))}
          </div>
          <div className="mb-[22px] mt-[9px]" role="group" aria-label="Destinatario de toda la sala">
            <button className={`rounded-full border-[1.5px] px-4 py-1.5 text-[14px] font-bold ${form.recipients.includes("all") ? "border-[#3F362E] bg-[#3F362E] text-white" : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"}`} type="button" aria-pressed={form.recipients.includes("all")} onClick={toggleAllRecipients}>Toda la sala</button>
          </div>
          <FieldError message={errors.recipients} />

          <FieldLabel>TIPO</FieldLabel>
          <div className="mb-[22px] flex flex-wrap gap-[9px]" role="group" aria-label="Tipo de publicación">
            {postTypes.map(([type, style]) => <button className={`rounded-full px-4 py-2 text-[13.5px] font-extrabold ${form.type === type ? `${style} ring-2 ring-[#3F362E] ring-offset-1` : style}`} key={type} type="button" aria-pressed={form.type === type} onClick={() => updateField("type", type)}>{type}</button>)}
          </div>
          <FieldError message={errors.type} />

          <FieldLabel htmlFor="post-description">DESCRIPCIÓN</FieldLabel>
          <textarea id="post-description" className={`mb-[22px] min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-[#3F362E] outline-none placeholder:text-[#B6A99B] ${errors.description ? "border-[#C5413A]" : "border-[#EADFD0]"}`} placeholder="Contá cómo le fue hoy…" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          <FieldError message={errors.description} />

          <FieldLabel>FOTOS</FieldLabel>
          <div className="flex gap-3">
            <div className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-[14px] border border-[#ECE0D0] bg-[#F4ECE1] text-[#CBB89F]"><ImageIcon className="h-[26px] w-[26px] stroke-[1.7]" /><span className="text-xs">Foto de ejemplo</span></div>
            <button className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]" type="button" aria-label="Agregar foto, no disponible"><CameraIcon className="h-[22px] w-[22px] !stroke-[#C5503A]" /><span className="text-xs">Agregar</span></button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return <label className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-[#94887B]" htmlFor={htmlFor}>{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="-mt-4 mb-4 text-xs font-bold text-[#C5413A]">{message}</p> : null;
}

function validate(form: CreatePostForm): FormErrors {
  const errors: FormErrors = {};
  if (form.recipients.length === 0) errors.recipients = "Selecciona al menos un niño o toda la sala.";
  if (!form.type) errors.type = "Selecciona un tipo de publicación.";
  if (!form.description.trim()) errors.description = "Escribe una descripción.";
  return errors;
}
