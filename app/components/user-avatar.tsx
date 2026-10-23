"use client";

import { useState } from "react";

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function UserAvatar({
  fullName,
  avatarUrl,
  className = "h-[38px] w-[38px]",
}: {
  fullName: string;
  avatarUrl: string | null;
  className?: string;
}) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const baseClassName = `${className} flex-none rounded-full`;

  if (avatarUrl && failedAvatarUrl !== avatarUrl) {
    return (
      <img
        alt=""
        className={`${baseClassName} object-cover`}
        src={avatarUrl}
        onError={() => setFailedAvatarUrl(avatarUrl)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${baseClassName} flex items-center justify-center bg-[#F2937A] font-[family-name:var(--font-fredoka)] text-base font-semibold text-white`}
    >
      {getInitials(fullName)}
    </div>
  );
}
