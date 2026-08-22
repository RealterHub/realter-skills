#!/usr/bin/env node

async function readStdin() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const input = await readStdin();
const file = String(input?.tool_input?.file_path ?? "");
if (/(^|\/)(quotation|.+\.quotation)\.json$/i.test(file)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "El estado de la cotización solo puede modificarse con quotation.mjs init, ingest o answer.",
    },
  }));
}
