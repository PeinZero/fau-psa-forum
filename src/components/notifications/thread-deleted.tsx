import { Quoted } from "./quoted";

/** The thread row is gone by then, so its title and the moderator's reason travel with the notification. */
export function threadDeletedDetails(details: unknown): { title: string | null; reason: string | null } {
  const d = details && typeof details === "object" ? (details as Record<string, unknown>) : {};
  return {
    title: typeof d.title === "string" && d.title ? d.title : null,
    reason: typeof d.reason === "string" && d.reason ? d.reason : null,
  };
}

export function ThreadDeletedSentence({ details }: { details: unknown }) {
  const { title, reason } = threadDeletedDetails(details);
  return (
    <>
      Your thread <Quoted>{title ?? "a thread"}</Quoted> was deleted by a moderator
      {reason ? (
        <>
          . Reason: <Quoted>{reason}</Quoted>
        </>
      ) : null}
    </>
  );
}
