// @ts-nocheck
// Vercel serverless entry: runs the whole Express app as one function.
//
// Imports the PRE-BUILT server bundle (dist/index.cjs) rather than server
// source, because @vercel/node does not resolve the @shared/* tsconfig path
// aliases — esbuild has already inlined them into the bundle. MUST use a
// namespace/named import: the CJS bundle marks __esModule with NO default
// export, so `import createApp from ...` would be undefined and crash every
// invocation. This file is intentionally outside tsconfig `include`.
import * as serverBundle from "../dist/index.cjs";

const { createApp } = serverBundle;

// Cache the built app across warm invocations (createApp wires routes once).
let appPromise;

export default async function handler(req, res) {
  try {
    appPromise ??= createApp().then((r) => r.app);
    const app = await appPromise;
    // Pass the raw req/res straight through — let Express's json middleware
    // consume the request stream (do not read req.body first).
    return app(req, res);
  } catch (err) {
    // Don't cache a rejected init: clear it so the next invocation can retry.
    appPromise = undefined;
    console.error("Failed to initialize app:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
