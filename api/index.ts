// Vercel serverless entrypoint.
//
// Vercel runs the app as serverless functions rather than a long-lived process,
// so we export the bare Express app as the request handler. Express `Application`
// instances are `(req, res) => void` functions, which is exactly what
// `@vercel/node` expects — no adapter shim required. Crucially we must NOT call
// `app.listen()` here; the runtime owns the HTTP socket. Local dev and the
// Docker image continue to use `src/server.ts`, which does call `app.listen()`.
import app from '../src/app';

export default app;
