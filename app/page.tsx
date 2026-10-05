"use client";

import { useState } from "react";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 9.5 9-6.5 9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const MegaphoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
  </svg>
);

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="navigation" aria-label="Navegación principal">
      <a className="navigation-link navigation-link-active" href="#feed" onClick={onNavigate}>
        <HomeIcon />
        Feed
      </a>
      <a className="navigation-link" href="#ninos" onClick={onNavigate}>
        <PeopleIcon />
        Niños
      </a>
      <a className="navigation-link" href="#avisos" onClick={onNavigate}>
        <BellIcon />
        Avisos
      </a>
      <a className="navigation-link" href="#cuenta" onClick={onNavigate}>
        <UserIcon />
        Mi cuenta
      </a>
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <a className="brand" href="#home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </span>
        <span>
          <strong>OpenDayCare</strong>
          <small>Sala Soles</small>
        </span>
      </a>

      <a className="new-post-button" href="#nueva-publicacion">
        <span aria-hidden="true">+</span>
        Nueva publicación
      </a>

      <Navigation />

      <div className="account-summary">
        <div className="account-avatar">C</div>
        <div className="account-copy">
          <strong>Caro Giménez</strong>
          <small>Maestra · Soles</small>
        </div>
        <a className="logout-button" href="#cerrar-sesion" aria-label="Cerrar sesión">
          <LogoutIcon />
        </a>
      </div>
    </aside>
  );
}

function Post({
  avatar,
  author,
  time,
  type,
  typeClass,
  recipient,
  children,
  likes,
  comments,
  image,
}: {
  avatar?: string;
  author: string;
  time: string;
  type: string;
  typeClass: string;
  recipient: string;
  children: React.ReactNode;
  likes: number;
  comments: number;
  image?: boolean;
}) {
  return (
    <article className="post-card">
      <header className="post-header">
        {avatar ? (
          <div className="post-avatar post-avatar-blue">{avatar}</div>
        ) : (
          <div className="post-avatar post-avatar-announcement">
            <MegaphoneIcon />
          </div>
        )}
        <div className="post-author">
          <strong>{author}</strong>
          <small>{time} · publicado por vos</small>
        </div>
        <span className={`post-type ${typeClass}`}>
          <span aria-hidden="true" />
          {type}
        </span>
      </header>
      <div className="post-recipient">{recipient}</div>
      <p className="post-text">{children}</p>
      {image && (
        <a className="post-image-placeholder" href="#foto">
          <ImageIcon />
          <span>Foto · pintando con témperas</span>
        </a>
      )}
      <footer className="post-actions">
        <span className="post-likes">
          <HeartIcon />
          {likes}
        </span>
        <a className="post-comments" href="#detalle-publicacion">
          <CommentIcon />
          {comments}
        </a>
        <span className="post-actions-spacer" />
        <a className="post-edit" href="#editar-publicacion">
          Editar
        </a>
      </footer>
    </article>
  );
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-shell" id="home">
      <Sidebar />
      <button
        className="mobile-menu-trigger"
        type="button"
        aria-label="Abrir menú"
        aria-controls="mobile-navigation"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      {mobileMenuOpen && (
        <>
          <button
            className="mobile-menu-overlay"
            type="button"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          />
          <aside className="mobile-menu" id="mobile-navigation" aria-label="Menú móvil">
            <div className="mobile-menu-header">
              <strong>OpenDayCare</strong>
              <button
                className="mobile-menu-close"
                type="button"
                aria-label="Cerrar menú"
                onClick={closeMobileMenu}
              >
                ×
              </button>
            </div>
            <Navigation onNavigate={closeMobileMenu} />
          </aside>
        </>
      )}
      <main className="main-content" id="feed">
        <div className="feed-container">
          <header className="feed-heading">
            <div className="eyebrow">GUARDERÍA · SALA SOLES</div>
            <h1>Buenas, Caro</h1>
            <p>12 niños · martes 17 jun</p>
          </header>

          <a className="composer-prompt" href="#crear-publicacion">
            <div className="composer-avatar">C</div>
            <span>Compartí un momento…</span>
            <span className="composer-camera">
              <CameraIcon />
            </span>
          </a>

          <div className="feed-divider">
            <span>PUBLICADO HOY</span>
          </div>

          <div className="posts-list">
            <Post
              avatar="M"
              author="Mateo"
              time="14:20"
              type="LOGRO"
              typeClass="post-type-success"
              recipient="Para: familia de Mateo"
              likes={3}
              comments={1}
            >
              ¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.
            </Post>
            <Post
              avatar="M"
              author="Mateo"
              time="09:40"
              type="ACTIVIDAD"
              typeClass="post-type-info"
              recipient="Para: familia de Mateo"
              likes={5}
              comments={2}
              image
            >
              Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.
            </Post>
            <Post
              author="Anuncio general"
              time="07:50"
              type="ANUNCIO"
              typeClass="post-type-announcement"
              recipient="Para: toda la sala"
              likes={8}
              comments={0}
            >
              El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.
            </Post>
          </div>
        </div>
      </main>
    </div>
  );
}
