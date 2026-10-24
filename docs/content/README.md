# Starter content

Eight verified starter threads and two guides for the launch. Each thread lists its official
sources and ends with "Last checked: October 2026"; every amount carries an "as of" date.

- `threads/*.md`: one thread per file. Front matter: `title`, `category` (category slug),
  `city` (`erlangen`, `nuremberg`, `both` or `null` for not city-specific). The rest is the
  markdown body.
- `guides/*.md`: front matter `slug`, `title`, `summary`, `is_featured`, `sort_order`. Each
  `## ` heading is a step in order; the line `thread: <exact thread title>` links the step to
  that thread, and the text below it is the step body.
- `build-seed.py`: turns these files into `supabase/seed/initial_content.sql`.

## Review

1. Read each thread and open its sources. Fees, the blocked-account amount, insurance
   contributions and the Nuremberg office move (Stadthaus Q from 30 November 2026) are the
   most likely to change.
2. Edit the markdown, not the SQL, then regenerate:

   ```sh
   python3 docs/content/build-seed.py .
   ```

   The script checks category slugs, cities, title and body lengths, and that every guide step
   names an existing thread title.

## Load

1. Sign in to the forum once with `mahadzx@gmail.com`, so the author profile exists.
2. Remove the pre-launch test content: in the Supabase SQL editor, paste
   `supabase/seed/cleanup_test_content.sql`. Preview first (instructions at the top of the file),
   then run the whole file. It deletes every thread, announcement and guide created before
   25 October 2026 except the starter content below, with their comments, votes and notifications.
3. Paste `supabase/seed/initial_content.sql` and run it.
   - Threads are inserted as `published` with that account as author and reviewer.
   - Threads whose title already exists and guides whose slug already exists are skipped, so
     running it again is safe. A changed title counts as a new thread.
   - If the account is missing, the script stops with an error and inserts nothing.
4. Optional: open each thread as a moderator and mark it verified, so it shows the
   "Verified Oct 2026" badge.

Both guides are featured on the home page (`is_featured: true`); set it to `false` in the
front matter before loading if you want only one.
