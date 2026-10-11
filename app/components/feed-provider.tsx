"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CreatePostForm } from "../feed/CreatePostModal";

export type PostRecipient = "mateo" | "sofia" | "benjamin" | "all";
export type PostType = "Comida" | "Siesta" | "Actividad" | "Logro" | "Ánimo" | "Foto" | "Anuncio";

export type FeedPost = {
  id: string;
  author: string;
  avatar?: string;
  time: string;
  type: PostType;
  recipients: PostRecipient[];
  recipientLabel?: string;
  description: string;
  likes: number;
  comments: number;
  image?: boolean;
  imageLabel?: string;
};

type FeedContextValue = {
  posts: FeedPost[];
  addPost: (form: CreatePostForm) => FeedPost;
};

const initialPosts: FeedPost[] = [
  {
    id: "mateo-logro-inicial",
    author: "Mateo",
    avatar: "M",
    time: "14:20",
    type: "Logro",
    recipients: ["mateo"],
    recipientLabel: "Para: familia de Mateo",
    description: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "mateo-actividad-inicial",
    author: "Mateo",
    avatar: "M",
    time: "09:40",
    type: "Actividad",
    recipients: ["mateo"],
    recipientLabel: "Para: familia de Mateo",
    description: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    likes: 5,
    comments: 2,
    image: true,
    imageLabel: "Foto · pintando con témperas",
  },
  {
    id: "anuncio-general-inicial",
    author: "Anuncio general",
    time: "07:50",
    type: "Anuncio",
    recipients: ["all"],
    description: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];

const recipientNames: Record<Exclude<PostRecipient, "all">, string> = {
  mateo: "Mateo",
  sofia: "Sofía",
  benjamin: "Benjamín",
};

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<FeedPost[]>(() => [...initialPosts]);

  function addPost(form: CreatePostForm) {
    if (!form.recipients.length || !form.type || !form.description.trim()) {
      throw new Error("Cannot add an incomplete post");
    }

    const newPost: FeedPost = {
      id: `post-${crypto.randomUUID()}`,
      author: "Caro Giménez",
      avatar: "C",
      time: formatTime(new Date()),
      type: form.type,
      recipients: form.recipients,
      description: form.description.trim(),
      likes: 0,
      comments: 0,
      image: false,
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);
    return newPost;
  }

  const value = useMemo(() => ({ posts, addPost }), [posts]);

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const context = useContext(FeedContext);

  if (!context) throw new Error("useFeed must be used within FeedProvider");
  return context;
}

export function formatRecipient(recipients: PostRecipient[]) {
  if (recipients.includes("all")) return "Para: toda la sala";

  const names = recipients.map((recipient) => recipient === "all" ? "" : recipientNames[recipient]);
  if (names.length === 1) return `Para: ${names[0]}`;
  if (names.length === 2) return `Para: ${names[0]} y ${names[1]}`;
  return `Para: ${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
