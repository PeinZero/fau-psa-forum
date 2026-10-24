-- Deletes the test content written before launch: every thread, announcement and guide created
-- before 2026-10-25 00:00 UTC, except the starter threads and guides from docs/content (matched by
-- exact title / slug), so running it before or after initial_content.sql is safe.
--
-- Run once in the Supabase SQL editor (as the default `postgres` role), after all migrations and
-- ideally before supabase/seed/initial_content.sql.
--
-- How to use it in the SQL editor, which only shows the result of the last statement:
-- 1. Preview: highlight the query inside the /* */ block below (without the comment markers) and
--    click Run; the editor runs only the selection. It lists what will be deleted in one result.
-- 2. Run the whole file. Everything between begin and commit is one transaction, so a failure
--    deletes nothing. The last statement prints the checks; every count should be 0.
--
-- What goes with the content (foreign keys from the migrations):
-- - threads: comments (and replies), revisions, reports, update requests, bookmarks, follows,
--   notifications, thread and comment votes and the reputation events they earned cascade.
--   threads.best_comment_id points back at comments with `on delete set null`; it only touches
--   the threads being deleted, so the cycle needs no extra step. guide_steps.thread_id is set null
--   on surviving guides. Vote and reputation triggers find the comment or thread already gone
--   and award nothing, so no compensating events are written.
-- - announcements: their `announcement` notifications cascade.
-- - guides: steps and everyone's progress cascade.
-- No delete guards exist on these tables, and the guard and logging triggers skip the `postgres`
-- role or need a signed-in moderator (auth.uid() is null here), so triggers stay enabled.
--
-- The moderation log is kept: it is the audit history and its entries copy the title, so they stay
-- readable when thread_id/comment_id are set null. To drop the entries about the deleted content
-- as well, uncomment the delete marked "optional" below.
--
-- Profiles, categories, roles, restrictions, applications, canned replies, feedback and
-- auth.users are not touched, except that profiles.reputation and best_answer_count are
-- recomputed from the reputation_events ledger.

/* Preview (read-only):

with cutoff as (select timestamptz '2026-10-25 00:00:00+00' as at)
select 'thread' as kind, t.id, t.slug, t.title, t.status::text as status, t.created_at
from public.threads t, cutoff where t.created_at < cutoff.at and t.title not in ('How do I register my address (Anmeldung) in Erlangen or Nuremberg?', 'How do I get or extend my student residence permit in Erlangen or Nuremberg?', 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?', 'Which health insurance do I need to enrol at FAU: public or private?', 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works', 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?', 'How do I find a room in Erlangen or Nuremberg without getting scammed?', 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?')
union all
select 'announcement', a.id, null, a.title, null, a.created_at
from public.announcements a, cutoff where a.created_at < cutoff.at
union all
select 'guide', g.id, g.slug, g.title, null, g.created_at
from public.guides g, cutoff where g.created_at < cutoff.at and g.slug not in ('first-weeks-in-erlangen', 'first-weeks-in-nuremberg')
order by kind, created_at;

*/

begin;

create temp table cleanup_targets on commit drop as
with cutoff as (select timestamptz '2026-10-25 00:00:00+00' as at)
select 'thread'::text as kind, t.id
from public.threads t, cutoff where t.created_at < cutoff.at and t.title not in ('How do I register my address (Anmeldung) in Erlangen or Nuremberg?', 'How do I get or extend my student residence permit in Erlangen or Nuremberg?', 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?', 'Which health insurance do I need to enrol at FAU: public or private?', 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works', 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?', 'How do I find a room in Erlangen or Nuremberg without getting scammed?', 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?')
union all
select 'announcement', a.id
from public.announcements a, cutoff where a.created_at < cutoff.at
union all
select 'guide', g.id
from public.guides g, cutoff where g.created_at < cutoff.at and g.slug not in ('first-weeks-in-erlangen', 'first-weeks-in-nuremberg');

-- Optional: also drop the moderation log entries about the deleted content. Must run before the
-- deletes, while thread_id still points at the threads.
-- delete from public.moderation_log l
-- using cleanup_targets c
-- where (c.kind = 'thread' and l.thread_id = c.id)
--    or (c.kind = 'announcement' and l.details ->> 'announcement_id' = c.id::text)
--    or (c.kind = 'guide' and l.details ->> 'guide_id' = c.id::text);

-- Guides first, so their steps are gone before the threads they link to.
delete from public.guides g
using cleanup_targets c
where c.kind = 'guide' and g.id = c.id;

delete from public.announcements a
using cleanup_targets c
where c.kind = 'announcement' and a.id = c.id;

delete from public.threads t
using cleanup_targets c
where c.kind = 'thread' and t.id = c.id;

-- The cascades already keep the cached totals in step with the ledger; recomputing them from the
-- ledger (same formula as reputation_events_apply) also repairs any earlier drift.
update public.profiles p
set reputation = r.reputation,
    best_answer_count = r.best_answer_count
from (
  select p2.id,
    coalesce(sum(e.points), 0)::int as reputation,
    coalesce(sum(case when e.reason = 'best_answer' then sign(e.points)::int else 0 end), 0)::int
      as best_answer_count
  from public.profiles p2
  left join public.reputation_events e on e.user_id = p2.id
  group by p2.id
) r
where r.id = p.id
  and (p.reputation, p.best_answer_count) is distinct from (r.reputation, r.best_answer_count);

commit;

with cutoff as (select timestamptz '2026-10-25 00:00:00+00' as at)
select 'threads before cutoff' as item, count(*) as remaining
from public.threads t, cutoff where t.created_at < cutoff.at and t.title not in ('How do I register my address (Anmeldung) in Erlangen or Nuremberg?', 'How do I get or extend my student residence permit in Erlangen or Nuremberg?', 'How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?', 'Which health insurance do I need to enrol at FAU: public or private?', 'Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works', 'How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?', 'How do I find a room in Erlangen or Nuremberg without getting scammed?', 'Do students have to pay the Rundfunkbeitrag (broadcasting fee)?')
union all
select 'announcements before cutoff', count(*)
from public.announcements a, cutoff where a.created_at < cutoff.at
union all
select 'guides before cutoff', count(*)
from public.guides g, cutoff where g.created_at < cutoff.at and g.slug not in ('first-weeks-in-erlangen', 'first-weeks-in-nuremberg')
union all
select 'profiles whose reputation differs from the ledger', count(*)
from public.profiles p
cross join lateral (
  select coalesce(sum(e.points), 0)::int as reputation,
    coalesce(sum(case when e.reason = 'best_answer' then sign(e.points)::int else 0 end), 0)::int
      as best_answer_count
  from public.reputation_events e where e.user_id = p.id
) r
where (p.reputation, p.best_answer_count) is distinct from (r.reputation, r.best_answer_count);
