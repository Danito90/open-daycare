import { redirect } from "next/navigation";
import { getAccountChildren, getAccountDetails } from "@/utils/account/queries";
import { daycareDisplayName } from "@/utils/auth/display";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { isStaffRole, PANEL_HOME } from "@/utils/auth/roles";
import { AccountView } from "./account-view";

const nameList = new Intl.ListFormat("es", { style: "long", type: "conjunction" });

export default async function AccountPage() {
  const profile = await getCurrentProfile();

  if (!profile?.userId) {
    redirect(PANEL_HOME);
  }

  const isStaff = isStaffRole(profile.role);
  const [details, children] = await Promise.all([
    getAccountDetails(profile.userId),
    isStaff ? Promise.resolve([]) : getAccountChildren(),
  ]);

  const daycareName = daycareDisplayName(profile.daycareName);
  const staffSubtitle = [profile.roleLabel, daycareName].filter(Boolean).join(" · ");
  const familySubtitle = children.length ? nameList.format(children.map((child) => child.fullName)) : "Familia";

  return (
    <AccountView
      variant={isStaff ? "staff" : "family"}
      fullName={profile.fullName}
      email={details.email}
      subtitle={isStaff ? staffSubtitle : familySubtitle}
      avatarUrl={profile.avatarUrl}
      notifyOnPost={details.notifyOnPost}
      dailySummaryEnabled={details.dailySummaryEnabled}
      kids={children}
    />
  );
}
