-- Pinned welcome announcement from the owner for the friends-and-family round. Skipped on databases
-- without the owner account (local, CI) and when it already exists.
do $welcome$
declare
  author uuid;
begin
  select u.id into author
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower('mahadzx@gmail.com');

  if author is null
    or exists (select 1 from public.announcements where title = 'Welcome to the PSA FAU Community Forum') then
    return;
  end if;

  insert into public.announcements (title, body, is_pinned, author_id)
  values (
    'Welcome to the PSA FAU Community Forum',
    $body$Salam and welcome! 👋

Every semester the same questions come up in our WhatsApp groups: *How do I get an Anmeldung appointment? Which health insurance do I need? How does the residence permit extension work in Erlangen?* The answers are usually great, but a week later they are buried under hundreds of messages and the next person asks again.

This forum is our attempt to fix that: **one place where good answers stay findable.**

## How it works

- **Read freely.** You don't need an account to browse threads or guides.
- **Ask a question.** Sign in with Google or your email and click *Ask a question*. Search first, your question may already be answered.
- **Answer and vote.** Reply to threads, upvote helpful answers, and tag people with @username.
- **Moderators keep it clean.** New threads are reviewed before they go live, and the most helpful reply is marked as the best answer.

## Where to start

- The **guides** "First weeks in Erlangen" and "First weeks in Nuremberg" walk you through Anmeldung, bank account, health insurance and the residence permit step by step.
- Under **Browse** you'll find threads on the blocked account, student jobs and the 140-day rule, finding a room without getting scammed, the Deutschlandticket and more. Each one links to the official sources.

## We need your feedback 🙏

This is an early test version, shared with a small group first. Things will break and some parts will feel unfinished. Please tell us what's confusing, what's missing and which questions you would ask: use **Send feedback** in your account menu (top right), or reply in the WhatsApp group.

Want to help more? Write a thread about something you learned the hard way, or apply to become a moderator from your account page.

A quick note: this is an independent student project by members of the Pakistan Student Association community. It is not run or endorsed by FAU, and answers here are community advice, not official guidance. For anything binding, always check with the university or the relevant office.

Thanks for being one of the first here!

— Mahad$body$,
    true,
    author
  );
end
$welcome$;
