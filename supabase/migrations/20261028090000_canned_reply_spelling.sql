-- The city is spelled "Nuremberg" in user-facing text; only the university's official name keeps
-- "Erlangen-Nürnberg". Fixes the seeded canned reply without touching moderator-edited wording.
update public.canned_replies
set label = 'Not about student life in Erlangen/Nuremberg',
    body = 'This forum is for student life in Erlangen and Nuremberg, and this thread is outside that topic, so we could not publish it.'
where label = 'Not about student life in Erlangen/Nürnberg'
  and body = 'This forum is for student life in Erlangen and Nürnberg, and this thread is outside that topic, so we could not publish it.';
