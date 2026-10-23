-- Advanced search: filters, sort orders and typo tolerance ("anmledung" finds Anmeldung).
-- search_threads(q) stays as it is for existing callers.

create extension if not exists pg_trgm with schema extensions;

create index threads_title_trgm_idx on public.threads using gin (title extensions.gin_trgm_ops);

-- Full-text matches come first (title before body before comments). Only when full text finds
-- fewer than 5 threads do titles that merely look like the query join, so a misspelled word
-- still finds its thread without flooding good queries with near misses. An empty query lists
-- every thread matching the filters.
-- Filters: a city also matches threads for both cities; "verified" means confirmed by a
-- moderator within the last 6 months, the same window after which the UI hints at staleness.
-- Runs as the caller, so comment matches never come from comments the caller cannot read.
-- Queries are capped at 100 characters (the UI limit) so nobody makes the database parse and
-- trigram-match arbitrarily long input.
create function public.search_threads_v2(
  q text,
  p_category_id bigint default null,
  p_city public.city default null,
  p_has_best_answer boolean default null,
  p_verified boolean default null,
  p_sort text default 'relevance'
)
returns setof public.threads
language plpgsql
stable
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.4
as $$
begin
  if char_length(q) > 100 then
    raise exception 'search is limited to 100 characters' using errcode = '22001';
  end if;
  return query
  with query as (
    select websearch_to_tsquery('english', coalesce(q, '')) as tsq, btrim(coalesce(q, '')) as words
  ),
  candidates as (
    select t.id, t.title, t.search
    from public.threads t
    where t.status in ('published', 'archived')
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city = p_city or (t.city = 'both' and p_city <> 'both'))
      and (p_has_best_answer is null or (t.best_comment_id is not null) = p_has_best_answer)
      and (p_verified is null
        or coalesce(t.last_verified_at > now() - interval '6 months', false) = p_verified)
  ),
  text_hits as (
    select c.id, ts_rank(c.search, query.tsq) as rank, ts_filter(c.search, '{a}') @@ query.tsq as in_title
    from candidates c, query
    where c.search @@ query.tsq
    union all
    select cm.thread_id, ts_rank(cm.search, query.tsq) * 0.5, false
    from public.comments cm
    join candidates c on c.id = cm.thread_id, query
    where cm.search @@ query.tsq and cm.hidden_at is null
  ),
  text_ranked as (
    select id, bool_or(in_title) as in_title, max(rank) as rank from text_hits group by id
  ),
  matches as (
    select id, 2 as tier, in_title, rank as score from text_ranked
    union all
    select c.id, 1, false, extensions.word_similarity(query.words, c.title)
    from candidates c, query
    where query.words <> ''
      and query.words operator(extensions.<%) c.title
      and c.id not in (select id from text_ranked)
      and (select count(*) from text_ranked) < 5
    union all
    select c.id, 0, false, 0 from candidates c, query where query.words = ''
  )
  select t.*
  from matches m
  join public.threads t on t.id = m.id
  order by
    case when p_sort = 'newest' then t.created_at end desc,
    case when p_sort = 'top' then (
      select count(*) from public.comments cm where cm.thread_id = t.id and cm.hidden_at is null
    ) end desc,
    m.tier desc, m.in_title desc, m.score desc, t.last_activity_at desc, t.id desc;
end;
$$;

revoke execute on function
  public.search_threads_v2(text, bigint, public.city, boolean, boolean, text)
from public, anon, authenticated;

grant execute on function
  public.search_threads_v2(text, bigint, public.city, boolean, boolean, text)
to anon, authenticated;
