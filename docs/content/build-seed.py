"""Builds supabase/seed/initial_content.sql from docs/content/**. Usage: python3 docs/content/build-seed.py ."""
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
content = root / "docs" / "content"
out = root / "supabase" / "seed" / "initial_content.sql"

CATEGORIES = {"rp-visa", "courses", "accommodation", "jobs", "first-steps", "other"}
CITIES = {"erlangen", "nuremberg", "both", "null"}


def split(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n\n?(.*)$", text, re.S)
    assert m, path
    meta = {}
    for line in m.group(1).splitlines():
        k, v = line.split(":", 1)
        v = v.strip()
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        meta[k.strip()] = v
    return meta, m.group(2).strip() + "\n"


def lit(s):
    return "'" + s.replace("'", "''") + "'"


def dollar(s, tag):
    assert f"${tag}$" not in s
    return f"${tag}${s}${tag}$"


threads = []
for p in sorted((content / "threads").glob("*.md")):
    meta, body = split(p)
    assert meta["category"] in CATEGORIES, p
    assert meta["city"] in CITIES, p
    assert 8 <= len(meta["title"]) <= 150, p
    assert len(body) <= 20000, p
    threads.append((meta, body))

guides = []
for p in sorted((content / "guides").glob("*.md")):
    meta, body = split(p)
    steps = []
    for chunk in re.split(r"^## ", body, flags=re.M)[1:]:
        lines = chunk.strip().splitlines()
        title = lines[0].strip()
        assert lines[1].startswith("thread: "), (p, title)
        thread_title = lines[1][len("thread: "):].strip()
        assert thread_title in {t[0]["title"] for t in threads}, (p, thread_title)
        step_body = "\n".join(lines[2:]).strip()
        assert 2 <= len(title) <= 120 and len(step_body) <= 5000
        steps.append((title, thread_title, step_body))
    assert 4 <= len(meta["title"]) <= 120 and len(meta["summary"]) <= 300
    guides.append((meta, steps))

sql = []
sql.append("""-- Initial content for the PSA FAU Community Forum: verified starter threads and guides.
-- Generated from docs/content/** (see docs/content/README.md). Paste into the Supabase SQL
-- editor and run once; running it again skips threads whose title and guides whose slug exist.

do $seed$
declare
  author uuid;
  guide bigint;
begin
  select u.id into author
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('mahadzx@gmail.com');

  if author is null then
    raise exception 'author mahadzx@gmail.com not found: sign in once so the profile exists, then run this again';
  end if;
""")

for meta, body in threads:
    city = "null" if meta["city"] == "null" else f"{lit(meta['city'])}::public.city"
    sql.append(f"""
  insert into public.threads (title, body, category_id, city, author_id, status, reviewed_by, reviewed_at)
  select {lit(meta['title'])},
    {dollar(body, 'body')},
    c.id, {city}, author, 'published', author, now()
  from public.categories c
  where c.slug = {lit(meta['category'])}
    and not exists (select 1 from public.threads t where t.title = {lit(meta['title'])});
""")

for meta, steps in guides:
    sql.append(f"""
  if not exists (select 1 from public.guides where slug = {lit(meta['slug'])}) then
    insert into public.guides (slug, title, summary, is_featured, sort_order, created_by)
    values ({lit(meta['slug'])}, {lit(meta['title'])}, {lit(meta['summary'])}, {meta['is_featured']}, {int(meta['sort_order'])}, author)
    returning id into guide;
""")
    for pos, (title, thread_title, step_body) in enumerate(steps, start=1):
        sql.append(f"""
    insert into public.guide_steps (guide_id, position, title, body, thread_id)
    values (guide, {pos}, {lit(title)}, {dollar(step_body, 'step')},
      (select t.id from public.threads t where t.title = {lit(thread_title)} order by t.id limit 1));
""")
    sql.append("  end if;\n")

sql.append("end\n$seed$;\n")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("".join(sql), encoding="utf-8")
print(f"{len(threads)} threads, {len(guides)} guides, {sum(len(s) for _, s in guides)} steps -> {out}")
