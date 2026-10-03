import type { AudienceKind, CampaignRow } from "@/lib/flows/server/campaigns";
import type { PillTone } from "../_components/ui";

/** How each campaign audience reads in the admin. */
export const AUDIENCE_LABEL: Record<AudienceKind, string> = {
  all_members: "All members",
  owns_chapter: "Members who have a chapter",
  not_owns_chapter: "Members who don't have a chapter yet",
  completed_chapter: "Members who finished a chapter",
  inactive_practice: "Members who stopped practicing",
  quiz_leads: "Leads without an account (quiz and imported)",
  everyone: "Everyone (members and leads)",
  has_tag: "Everyone with a tag",
};

export const AUDIENCE_NEEDS_CHAPTER: readonly AudienceKind[] = ["owns_chapter", "not_owns_chapter", "completed_chapter"];

type CampaignStatus = CampaignRow["status"];

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  canceled: "Stopped",
};

export const STATUS_TONE: Record<CampaignStatus, PillTone> = {
  draft: "draft",
  scheduled: "info",
  sending: "warning",
  sent: "published",
  canceled: "draft",
};
