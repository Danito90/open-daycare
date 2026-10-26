"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { CameraIcon } from "@/app/components/feed-icons";
import { UserAvatar } from "@/app/components/user-avatar";
import { useUser } from "@/app/components/user-provider";
import { daycareDisplayName } from "@/utils/auth/display";
import type { AudienceOptions } from "@/utils/posts/types";
import { CreatePostModal } from "./CreatePostModal";

type FeedShellProps = {
  canPublish: boolean;
  audienceOptions: AudienceOptions | null;
  activeChildren: number;
  headerDate: string;
  nextCursor: string | null;
  emptyMessage: string | null;
  children: ReactNode;
};

export function FeedShell({
  canPublish,
  audienceOptions,
  activeChildren,
  headerDate,
  nextCursor,
  emptyMessage,
  children,
}: FeedShellProps) {
  const user = useUser();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const fullName = user?.fullName?.trim() || "Usuario";
  const daycareName = daycareDisplayName(user?.daycareName);
  const childLabel = activeChildren === 1 ? "1 niño" : `${activeChildren} niños`;

  function openComposer() {
    setIsComposerOpen(true);
  }

  return (
    <AppShell active="feed" onNewPublication={canPublish ? openComposer : undefined}>
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] md:px-10 md:pb-20 md:pt-[34px]">
        <div className="mx-auto w-full max-w-[680px]">
          <header className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold uppercase tracking-[.8px] text-brand">
              GUARDERÍA{daycareName ? ` · ${daycareName}` : ""}
            </div>
            <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[28px] font-semibold text-ink-strong md:text-[30px]">
              Buenas, {fullName}
            </h1>
            <p className="mt-1 text-[14.5px] text-ink-muted">
              {childLabel} · {headerDate}
            </p>
          </header>

          {canPublish ? (
            <button
              className="mb-6 flex w-full items-center gap-3.5 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-3.5 px-[18px] text-left text-[15px] text-ink-soft shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={openComposer}
              type="button"
            >
              <UserAvatar
                avatarUrl={user?.avatarUrl ?? null}
                className="h-10 w-10"
                fullName={fullName}
              />
              <span className="flex-1">Compartí un momento…</span>
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-[#FBE3D8] text-brand">
                <CameraIcon className="h-[19px] w-[19px]" />
              </span>
            </button>
          ) : null}

          <div className="mb-3.5 flex items-center gap-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-ink-soft">
            <span>PUBLICACIONES</span>
            <span className="h-px flex-1 bg-[#E7DAC8]" />
          </div>

          {emptyMessage ? (
            <div className="rounded-[20px] border border-[#ECE0D0] bg-[#FFFDF9] px-6 py-10 text-center">
              <p className="m-0 text-[15px] font-bold text-ink-strong">{emptyMessage}</p>
              <p className="mt-2 mb-0 text-[13.5px] text-ink-soft">
                Cuando haya novedades, van a aparecer acá.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">{children}</div>
          )}

          {nextCursor ? (
            <div className="mt-6 flex justify-center">
              <Link
                className="rounded-full border border-[#ECE0D0] bg-[#FFFDF9] px-5 py-2.5 text-[14px] font-extrabold text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                href={`/?cursor=${encodeURIComponent(nextCursor)}`}
                scroll={false}
              >
                Cargar más
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {canPublish && audienceOptions ? (
        <CreatePostModal
          audienceOptions={audienceOptions}
          onClose={() => setIsComposerOpen(false)}
          open={isComposerOpen}
        />
      ) : null}
    </AppShell>
  );
}
