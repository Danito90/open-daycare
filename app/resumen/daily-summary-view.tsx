import Link from "next/link";
import { avatarColors, initialOf } from "@/utils/kids/format";
import { formatPostTime } from "@/utils/posts/format-date";
import { POST_TYPE_LABELS, type PostTypeValue } from "@/utils/posts/types";
import type { DailySummary, SummaryChild } from "@/utils/summaries/types";
import { AppShell } from "../components/app-shell";

const DOT_COLORS: Record<PostTypeValue, string> = {
  meal: "#9A7B1E",
  nap: "#7B5FC0",
  activity: "#2E89A6",
  achievement: "#3E9B6C",
  photo: "#D9583C",
  announcement: "#3659AE",
};

type DailySummaryViewProps = {
  kids: SummaryChild[];
  selectedId: string | null;
  summary: DailySummary | null;
  todayLabel: string;
};

function ChildSelector({ kids, selectedId }: { kids: SummaryChild[]; selectedId: string | null }) {
  if (kids.length < 2) return null;

  return (
    <nav aria-label="Elegir niño" className="mb-[22px] flex flex-wrap gap-2.5">
      {kids.map((child) => {
        const isSelected = child.id === selectedId;
        const avatar = avatarColors(child.id);

        return (
          <Link
            key={child.id}
            href={`/resumen?nino=${child.id}`}
            aria-current={isSelected ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full border-[1.5px] py-[7px] pl-2 pr-[15px] text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isSelected
                ? "border-[#3F362E] bg-[#3F362E] text-white"
                : "border-[#ECE0D0] bg-[#FFFDF9] text-ink-soft hover:bg-[#F6ECDF]"
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[13px] font-semibold"
              style={{ backgroundColor: avatar.background, color: avatar.color }}
            >
              {initialOf(child.fullName)}
            </span>
            {child.fullName}
          </Link>
        );
      })}
    </nav>
  );
}

export function DailySummaryView({ kids, selectedId, summary, todayLabel }: DailySummaryViewProps) {
  return (
    <AppShell active="resumen">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[700px]">
          <ChildSelector kids={kids} selectedId={selectedId} />

          {summary ? (
            <>
              <div className="mb-[18px] rounded-[22px] bg-gradient-to-br from-[#FBE0D2] to-[#F9D2DE] px-6 py-7">
                <div className="mb-1.5 text-[12.5px] font-extrabold tracking-[.8px] text-[#D9583C]">RESUMEN DEL DÍA</div>
                <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-ink-strong">
                  El día de {summary.child.fullName}
                </h1>
                <p className="mt-1.5 text-[15px] text-[#9A6A6A]">{todayLabel}</p>
              </div>

              <dl className="mb-[26px] grid grid-cols-3 gap-3.5">
                <div className="flex flex-col-reverse rounded-[18px] bg-[#F7E7A6] p-5 text-center text-[#9A7B1E]">
                  <dt className="text-[13px] font-semibold">comidas</dt>
                  <dd className="m-0 font-[family-name:var(--font-fredoka)] text-[26px] font-semibold">{summary.meals}</dd>
                </div>
                <div className="flex flex-col-reverse rounded-[18px] bg-[#E7DCF6] p-5 text-center text-[#7B5FC0]">
                  <dt className="text-[13px] font-semibold">siestas</dt>
                  <dd className="m-0 font-[family-name:var(--font-fredoka)] text-[26px] font-semibold">{summary.naps}</dd>
                </div>
                <div className="flex flex-col-reverse rounded-[18px] bg-[#C7E7F1] p-5 text-center text-[#2E89A6]">
                  <dt className="text-[13px] font-semibold">momentos</dt>
                  <dd className="m-0 font-[family-name:var(--font-fredoka)] text-[26px] font-semibold">{summary.moments}</dd>
                </div>
              </dl>

              <h2 className="mb-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">LO MÁS LINDO DE HOY</h2>

              {summary.posts.length ? (
                <ol className="flex flex-col gap-[18px]">
                  {summary.posts.map((post) => (
                    <li key={post.id} className="flex items-start gap-3.5">
                      <span
                        aria-hidden="true"
                        className="mt-2.5 h-3 w-3 flex-none rounded-full"
                        style={{ backgroundColor: DOT_COLORS[post.type] }}
                      />
                      <div className="min-w-0">
                        <h3 className="m-0 font-[family-name:var(--font-fredoka)] text-[16px] font-semibold" style={{ color: DOT_COLORS[post.type] }}>
                          {post.title ?? POST_TYPE_LABELS[post.type].label}
                        </h3>
                        <p className="mt-0.5 whitespace-pre-line text-[14px] leading-[1.45] text-ink-soft">
                          <time className="font-bold text-ink-muted" dateTime={post.publishedAt}>{formatPostTime(post.publishedAt)}</time>
                          {" · "}
                          {post.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] px-5 py-6 text-center">
                  <p className="text-[14.5px] font-extrabold text-ink-strong">No hay novedades de este día.</p>
                  <p className="mt-1 text-[13px] text-ink-soft">Cuando la guardería publique algo de {summary.child.fullName}, lo vas a ver acá.</p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[22px] border border-[#ECE0D0] bg-[#FFFDF9] px-6 py-10 text-center">
              <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[26px] font-semibold text-ink-strong">Resumen del día</h1>
              <p className="mt-2 text-[14.5px] font-extrabold text-ink-strong">Todavía no tenés niños vinculados.</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">Cuando la guardería vincule a tu hijo, vas a ver acá su día.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
