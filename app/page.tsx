import { isStaffRole } from "@/utils/auth/roles";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { formatHeaderDate } from "@/utils/posts/format-date";
import { getAudienceOptions, getFeed, getFeedSummary } from "@/utils/posts/queries";
import { FeedShell } from "./feed/feed-shell";
import { PostCard } from "./feed/post-card";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const profile = await getCurrentProfile();
  const canPublish = isStaffRole(profile?.role);

  const [feed, summary, audienceOptions] = await Promise.all([
    getFeed(cursor),
    getFeedSummary(),
    canPublish ? getAudienceOptions() : Promise.resolve(null),
  ]);

  const emptyMessage =
    feed.posts.length > 0
      ? null
      : canPublish
        ? "Todavía no hay publicaciones"
        : summary.linkedChildren === 0
          ? "Todavía no tenés niños vinculados"
          : "No hay publicaciones para tus niños";

  return (
    <FeedShell
      activeChildren={summary.activeChildren}
      audienceOptions={audienceOptions}
      canPublish={canPublish}
      emptyMessage={emptyMessage}
      headerDate={formatHeaderDate()}
      nextCursor={feed.nextCursor}
    >
      {feed.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </FeedShell>
  );
}
