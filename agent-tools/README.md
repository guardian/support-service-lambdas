# agent-tools

## Overview

`agent-tools` is the MCP server for repository-safe agent operations (verify, repair, test, and read-only git helpers), scoped to `handlers/*` and `modules/*` targets.

Tool definitions and descriptions are source-of-truth in `agent-tools/src/index.ts`.

The copilot instructions file encourages agents to use this rather than make up arbitrary shell commands.

## Safety note

`test` is less safe than `verify`/`repair` because it executes arbitrary code from the workspace.

## How to test

```bash
cd agent-tools
pnpm type-check && pnpm lint --fix && pnpm fix-formatting

echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | pnpm --filter agent-tools run start
```

## References

- MCP docs: https://modelcontextprotocol.io/docs
- SDK docs: https://github.com/modelcontextprotocol/typescript-sdk
