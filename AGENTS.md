<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Model routing

For non-trivial multi-step work (new feature architecture, design systems, multi-screen flows), delegate the planning phase to the `Plan` subagent with `model: opus`, then execute the resulting plan on the default model (Sonnet). Skip this for small/obvious tasks.
