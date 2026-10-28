import { isStaffRole } from "@/utils/auth/roles";
import { formatHeaderDate } from "@/utils/posts/format-date";
import { getAudienceOptions, getFeed, getFeedPage, getFeedSummary, getParentFeedOptions } from "@/utils/posts/queries";
import { FeedShell } from "./feed/feed-shell";
import { PostCard } from "./feed/post-card";
import { requireOperationalStaff } from "@/utils/staff/access";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const profile = await requireOperationalStaff();
  const canPublish = isStaffRole(profile?.role);

  const isParent = profile?.role === "parent";
  const [feed, summary, audienceOptions, parentOptions] = await Promise.all([
    isParent ? getFeedPage() : getFeed(cursor),
    getFeedSummary(),
    canPublish ? getAudienceOptions() : Promise.resolve(null),
    isParent && profile.userId ? getParentFeedOptions(profile.userId) : Promise.resolve(null),
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
      parentFeed={isParent ? feed : null}
      parentOptions={parentOptions}
    >
      {!isParent && feed.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </FeedShell>
  );
}
