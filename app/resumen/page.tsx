import { requireFamilyAccess } from "@/utils/auth/guards";
import { formatSummaryDate } from "@/utils/posts/format-date";
import { getDailySummary, getSummaryChildren } from "@/utils/summaries/queries";
import { DailySummaryView } from "./daily-summary-view";

type SearchParams = { nino?: string | string[] };

export default async function DailySummaryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireFamilyAccess();

  const [children, params] = await Promise.all([getSummaryChildren(), searchParams]);
  const requested = typeof params.nino === "string" ? params.nino : null;
  const selected = children.find((child) => child.id === requested) ?? children[0] ?? null;
  const summary = selected ? await getDailySummary(selected) : null;

  return (
    <DailySummaryView
      kids={children}
      selectedId={selected?.id ?? null}
      summary={summary}
      todayLabel={formatSummaryDate()}
    />
  );
}
