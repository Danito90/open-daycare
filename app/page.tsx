"use client";

import { useState } from "react";
import { daycareDisplayName } from "@/utils/auth/display";
import { AppShell } from "./components/app-shell";
import { formatRecipient, useFeed, type FeedPost, type PostType } from "./components/feed-provider";
import { CameraIcon, CommentIcon, HeartIcon, ImageIcon, MegaphoneIcon } from "./components/feed-icons";
import { UserAvatar } from "./components/user-avatar";
import { useUser } from "./components/user-provider";
import { CreatePostModal, type CreatePostForm } from "./feed/CreatePostModal";

const typeStyles: Record<PostType, string> = {
  Comida: "bg-[#F4DC8E] text-[#765E17]",
  Siesta: "bg-[#E7DCF6] text-[#6E4FBA]",
  Actividad: "bg-[#C7E7F1] text-[#246B82]",
  Logro: "bg-[#CFEBD8] text-[#2D714F]",
  Ánimo: "bg-[#F9D2DE] text-[#A13C60]",
  Foto: "bg-[#FBD8CC] text-[#AA4024]",
  Anuncio: "bg-[#CCD8F4] text-[#3659AE]",
};

function Post({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-[20px] border border-[#ECE0D0] bg-[#FFFDF9] px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]">
      <header className="mb-3.5 flex items-center gap-3">
        {post.avatar ? <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#A9D9E8] font-[family-name:var(--font-fredoka)] text-[17px] font-semibold text-[#196175]">{post.avatar}</div> : <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#CCD8F4] text-[#3659AE]"><MegaphoneIcon className="h-5 w-5" /></div>}
        <div className="min-w-0 flex-1">
          <strong className="block font-[family-name:var(--font-fredoka)] text-[16.5px] font-semibold text-[#3F362E]">{post.author}</strong>
          <small className="block text-[12.5px] text-ink-soft">{post.time} · publicado por vos</small>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[.5px] ${typeStyles[post.type]}`}><span className="h-2 w-2 rounded-full bg-current" />{post.type.toUpperCase()}</span>
      </header>
      <div className="mb-2.5 text-[12.5px] text-ink-soft">{post.recipientLabel ?? formatRecipient(post.recipients)}</div>
      <p className="m-0 text-[15.5px] leading-[1.55] text-[#4A4038]">{post.description}</p>
      {post.image && <a className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#DBCBBA] bg-[#F4ECE1] text-[13.5px] text-ink-soft" href="#foto"><ImageIcon className="h-[30px] w-[30px] stroke-[1.7]" /><span>{post.imageLabel}</span></a>}
      <footer className="mt-4 flex items-center gap-[18px] border-t border-[#F0E6D8] pt-3.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-brand"><HeartIcon className="h-[19px] w-[19px] fill-brand" />{post.likes}</span>
        <a className="flex items-center gap-1.5 text-sm font-bold text-ink-muted" href="#detalle-publicacion"><CommentIcon className="h-[18px] w-[18px]" />{post.comments}</a>
        <span className="flex-1" />
        <a className="text-sm font-extrabold text-brand underline underline-offset-2" href="#editar-publicacion">Editar</a>
      </footer>
    </article>
  );
}

export default function Home() {
  const user = useUser();
  const { posts, addPost } = useFeed();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const fullName = user?.fullName?.trim() || "Usuario";
  const daycareName = daycareDisplayName(user?.daycareName);

  function handleSubmit(form: CreatePostForm) {
    addPost(form);
    setIsCreatePostOpen(false);
  }

  return (
    <AppShell active="feed" onNewPublication={() => setIsCreatePostOpen(true)}>
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] md:px-10 md:pb-20 md:pt-[34px]">
        <div className="mx-auto w-full max-w-[680px]">
          <header className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold uppercase tracking-[.8px] text-brand">GUARDERÍA{daycareName ? ` · ${daycareName}` : ""}</div>
            <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[28px] font-semibold text-ink-strong md:text-[30px]">Buenas, {fullName}</h1>
            <p className="mt-1 text-[14.5px] text-ink-muted">12 niños · martes 17 jun</p>
          </header>
          <button className="mb-6 flex w-full items-center gap-3.5 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-3.5 px-[18px] text-left text-[15px] text-ink-soft shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" onClick={() => setIsCreatePostOpen(true)}>
            <UserAvatar className="h-10 w-10" fullName={fullName} avatarUrl={user?.avatarUrl ?? null} />
            <span className="flex-1">Compartí un momento…</span>
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-[#FBE3D8] text-brand"><CameraIcon className="h-[19px] w-[19px]" /></span>
          </button>
          <div className="mb-3.5 flex items-center gap-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-ink-soft"><span>PUBLICADO HOY</span><span className="h-px flex-1 bg-[#E7DAC8]" /></div>
          <div className="flex flex-col gap-4">
            {posts.map((post) => <Post key={post.id} post={post} />)}
          </div>
        </div>
      </div>
      <CreatePostModal open={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} onSubmit={handleSubmit} />
    </AppShell>
  );
}
