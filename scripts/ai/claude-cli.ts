#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { askClaude } from './claudeClient';

const usage = `Usage:
  npx tsx scripts/ai/claude-cli.ts --prompt "Your question"
  npx tsx scripts/ai/claude-cli.ts --file path/to/file --prompt "Edit or summarize this file"
  echo "Some text" | npx tsx scripts/ai/claude-cli.ts

Notes:
  - This tool runs locally and requires ANTHROPIC_API_KEY in environment or .env
  - Install the SDK with: npm install anthropic
`;

async function readStdin() {
  const stat = await fs.stat('/dev/stdin').catch(() => null);
  if (!stat) return '';
  return new Promise<string>((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  let file: string | null = null;
  let prompt = '';
  let modelFlag: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' || a === '-f') {
      file = argv[++i];
      continue;
    }
    if (a === '--prompt' || a === '-p') {
      prompt = argv[++i];
      continue;
    }
    if (a === '--help' || a === '-h') {
      console.log(usage);
      return;
    }
    if (a === '--model' || a === '-m') {
      modelFlag = argv[++i];
      continue;
    }
  }

  if (!prompt) {
    const stdin = await readStdin();
    if (stdin && stdin.trim()) prompt = stdin.trim();
  }

  if (file) {
    const resolved = path.resolve(file);
    const content = await fs.readFile(resolved, 'utf8');
    const header = `--- FILE: ${resolved} ---\n`;
    prompt = `${header}${content}\n\nINSTRUCCIÓN: ${prompt}`;
  }

  if (!prompt) {
    console.error('No prompt provided. Use --prompt, --file or pipe input.');
    console.log(usage);
    process.exit(1);
  }

  try {
    const answer = await askClaude(prompt, modelFlag ? { model: modelFlag } : undefined);
    console.log('\n=== Claude response ===\n');
    console.log(answer);
  } catch (err: any) {
    console.error('Error calling Claude:', err.message ?? err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
