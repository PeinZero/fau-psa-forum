import type { Enums } from "@/lib/supabase/database.types";

export const cityLabels: Record<Enums<"city">, string> = {
  erlangen: "Erlangen",
  nuremberg: "Nuremberg",
  both: "Erlangen & Nuremberg",
};

export const affiliationLabels: Record<Enums<"affiliation">, string> = {
  student: "Student",
  graduate: "Graduate",
  postgrad: "Postgrad",
  resident: "Resident",
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
