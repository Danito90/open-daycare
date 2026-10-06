import { AppShell } from "./components/app-shell";
import { CameraIcon, CommentIcon, HeartIcon, ImageIcon, MegaphoneIcon } from "./components/feed-icons";

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
    <article className="rounded-[20px] border border-[#ECE0D0] bg-[#FFFDF9] px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]">
      <header className="mb-3.5 flex items-center gap-3">
        {avatar ? <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#A9D9E8] font-[family-name:var(--font-fredoka)] text-[17px] font-semibold text-[#1F7A93]">{avatar}</div> : <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#CCD8F4] text-[#4E72C8]"><MegaphoneIcon className="h-5 w-5" /></div>}
        <div className="min-w-0 flex-1">
          <strong className="block font-[family-name:var(--font-fredoka)] text-[16.5px] font-semibold text-[#3F362E]">{author}</strong>
          <small className="block text-[12.5px] text-[#A89A8B]">{time} · publicado por vos</small>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[.5px] ${typeClass}`}><span className="h-2 w-2 rounded-full bg-current" />{type}</span>
      </header>
      <div className="mb-2.5 text-[12.5px] text-[#A89A8B]">{recipient}</div>
      <p className="m-0 text-[15.5px] leading-[1.55] text-[#4A4038]">{children}</p>
      {image && <a className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#DBCBBA] bg-[#F4ECE1] text-[13.5px] text-[#B0A290]" href="#foto"><ImageIcon className="h-[30px] w-[30px] stroke-[1.7]" /><span>Foto · pintando con témperas</span></a>}
      <footer className="mt-4 flex items-center gap-[18px] border-t border-[#F0E6D8] pt-3.5">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[#E0654A]"><HeartIcon className="h-[19px] w-[19px] fill-[#E0654A]" />{likes}</span>
        <a className="flex items-center gap-1.5 text-sm font-bold text-[#94887B]" href="#detalle-publicacion"><CommentIcon className="h-[18px] w-[18px]" />{comments}</a>
        <span className="flex-1" />
        <a className="text-sm font-extrabold text-[#C5503A]" href="#editar-publicacion">Editar</a>
      </footer>
    </article>
  );
}

export default function Home() {
  return (
    <AppShell active="feed">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[760px]">
          <header className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-[#D9583C]">GUARDERÍA · SALA SOLES</div>
            <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[28px] font-semibold text-[#3F362E] lg:text-[30px]">Buenas, Caro</h1>
            <p className="mt-1 text-[14.5px] text-[#94887B]">12 niños · martes 17 jun</p>
          </header>
          <a className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-3.5 px-[18px] text-[15px] text-[#A89A8B] shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]" href="#crear-publicacion">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F2937A] font-[family-name:var(--font-fredoka)] font-semibold text-white">C</span>
            <span className="flex-1">Compartí un momento…</span>
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-[#FBE3D8] text-[#E0654A]"><CameraIcon className="h-[19px] w-[19px]" /></span>
          </a>
          <div className="mb-3.5 flex items-center gap-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]"><span>PUBLICADO HOY</span><span className="h-px flex-1 bg-[#E7DAC8]" /></div>
          <div className="flex flex-col gap-4">
            <Post avatar="M" author="Mateo" time="14:20" type="LOGRO" typeClass="bg-[#CFEBD8] text-[#3E9B6C]" recipient="Para: familia de Mateo" likes={3} comments={1}>¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.</Post>
            <Post avatar="M" author="Mateo" time="09:40" type="ACTIVIDAD" typeClass="bg-[#C7E7F1] text-[#2E89A6]" recipient="Para: familia de Mateo" likes={5} comments={2} image>Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.</Post>
            <Post author="Anuncio general" time="07:50" type="ANUNCIO" typeClass="bg-[#CCD8F4] text-[#4E72C8]" recipient="Para: toda la sala" likes={8} comments={0}>El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.</Post>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
