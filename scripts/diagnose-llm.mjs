/**
 * Diagnoses local LLM connectivity using the same env + provider resolution
 * as /api/chat. Prints config presence (never secret values) and the result
 * of a minimal completion against the configured provider.
 *
 * Run: node scripts/diagnose-llm.mjs
 */
import nextEnv from '../node_modules/.pnpm/@next+env@16.2.2/node_modules/@next/env/dist/index.js'
const { loadEnvConfig } = nextEnv
import { generateText, streamText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

loadEnvConfig(process.cwd())

const provider = process.env.AI_PROVIDER || 'openai'
const DEFAULT_MODEL = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  ollama: 'llama3.1',
}[provider]

console.log('--- env ---')
console.log('AI_PROVIDER       :', provider)
console.log('default model     :', DEFAULT_MODEL)
console.log('OPENAI_API_KEY    :', process.env.OPENAI_API_KEY ? `set (${process.env.OPENAI_API_KEY.length} chars)` : 'NOT SET')
console.log('ANTHROPIC_API_KEY :', process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.length} chars)` : 'NOT SET')
console.log('OLLAMA_BASE_URL   :', process.env.OLLAMA_BASE_URL || '(default http://localhost:11434)')

function buildModel() {
  switch (provider) {
    case 'anthropic':
      return anthropic(DEFAULT_MODEL)
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama(DEFAULT_MODEL)
    }
    default:
      return openai(DEFAULT_MODEL)
  }
}

console.log('\n--- live call ---')
try {
  const start = Date.now()
  const result = await generateText({
    model: buildModel(),
    prompt: 'Reply with exactly: ok',
  })
  console.log(`SUCCESS in ${Date.now() - start}ms`)
  console.log('text  :', JSON.stringify(result.text))
  console.log('usage :', result.usage)
} catch (err) {
  console.error('FAILED:', err?.name ?? '')
  console.error('message:', err?.message)
  if (err?.statusCode) console.error('status :', err.statusCode)
  if (err?.responseBody) console.error('body   :', String(err.responseBody).slice(0, 500))
  if (err?.cause) console.error('cause  :', err.cause?.message ?? err.cause)
  process.exitCode = 1
}

console.log('\n--- streaming call (same as /api/chat) ---')
try {
  const start = Date.now()
  const result = streamText({
    model: buildModel(),
    prompt: 'Count from 1 to 5, digits only.',
    onError({ error }) {
      console.error('stream onError:', error?.message ?? error)
    },
  })
  let chunks = 0
  let text = ''
  for await (const delta of result.textStream) {
    chunks += 1
    text += delta
  }
  console.log(`SUCCESS in ${Date.now() - start}ms — ${chunks} chunks`)
  console.log('text  :', JSON.stringify(text.slice(0, 80)))
} catch (err) {
  console.error('STREAM FAILED:', err?.message)
  if (err?.cause) console.error('cause :', err.cause?.message ?? err.cause)
  process.exitCode = 1
}
