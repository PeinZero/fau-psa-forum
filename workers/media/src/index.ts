import { handleRequest, type Env } from "./handler";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx, { cache: caches.default });
  },
};
