# Dev-only Claude tooling

Purpose: provide a local, server-side CLI to call Claude (Anthropic) from VS Code without exposing secrets or frontend code.

Setup

- From the repo root run:

```bash
npm install anthropic
```

- Create a local `.env` (do NOT commit it) with your API key:

```bash
echo "ANTHROPIC_API_KEY=sk-..." > .env
```


Usage

- Run a quick prompt:

```bash
npx tsx scripts/ai/claude-cli.ts --prompt "Resume the file src/foo.ts in one paragraph"
```

- Send a file and instruction (recommended for editing/summarizing code):

```bash
npx tsx scripts/ai/claude-cli.ts --file src/path/to/file.ts --prompt "Suggest improvements and show a patch"
```

- Pipe text into the CLI:

```bash
echo "Write a test for function X" | npx tsx scripts/ai/claude-cli.ts
```

Model selection

- By default this CLI uses a code-specialized model (`claude-code-2`). To override:

```bash
npx tsx scripts/ai/claude-cli.ts --prompt "Refactor this code" --model claude-2.1
```

Security notes

- This tool is server-side and should never be imported into frontend bundles.
- Keep `.env` in `.gitignore` (do not commit secrets).
