# Delegation and review

Read when planning multi-step work or a review.

The lead agent should not block on long-running steps: split work into small, focused subagents
that run in parallel. One agent, one question, one deliverable.

- Give each parallel agent an explicit list of files it owns, so no two agents edit the same file.
- Parallel agents run only `tsc` and `lint`; the lead runs `next build` once they are all done.
- Use lite models for mechanical edits and lookups, stronger models for auth, RLS and schema.

## Review lenses (one agent per lens)

- **auth & security**: session handling, open redirects, RLS policies, secrets in client bundles
- **correctness**: logic, edge cases, error states
- **Next.js 16 conventions**: cacheComponents/Suspense, proxy, caching, metadata
- **accessibility & mobile**: 360px width, labels, focus, contrast in light and dark
- **simplification**: remove needless abstraction and dead code

A finding is a hypothesis until it is reproduced in the code.
