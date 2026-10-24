import type { Enums } from "@/lib/supabase/database.types";

export const cityLabels: Record<Enums<"city">, string> = {
  erlangen: "Erlangen",
  nuremberg: "Nuremberg",
  both: "Erlangen & Nuremberg",
};

/** Wording for the city picker, where "both" reads better as a choice than as a tag. */
export const cityOptionLabels: Record<Enums<"city">, string> = {
  erlangen: "Erlangen",
  nuremberg: "Nuremberg",
  both: "Both cities",
};

export const NO_CITY_LABEL = "Not city-specific";

export const affiliationLabels: Record<Enums<"affiliation">, string> = {
  student: "Student",
  graduate: "Graduate",
  postgrad: "Postgrad",
  resident: "Resident",
};

export const roleLabels: Record<Enums<"user_role">, string> = {
  member: "Member",
  moderator: "Moderator",
  superadmin: "Superadmin",
};

export const statusLabels: Record<Enums<"thread_status">, string> = {
  pending: "Waiting for review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/Berlin" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
