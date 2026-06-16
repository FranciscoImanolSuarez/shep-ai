/**
 * Canonical model factory for all provider→SDK model construction.
 *
 * Two variants:
 *   - `getProviderModel(provider, modelId)` — raw model, no middleware.
 *     Use in routes and the VercelAIAdapter (embeddings, simple generation).
 *   - `getObservedModel(provider, modelId)` — same model wrapped with
 *     Braintrust observability and @ai-sdk/devtools (when available).
 *     Use in agent-runner where tracing is required.
 *
 * Keeping both in one place eliminates the four-site switch duplication.
 */

import type { LanguageModel } from 'ai'
import { wrapLanguageModel } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelMiddleware } from 'ai'

// ---------------------------------------------------------------------------
// Middleware — loaded once at module init, env-gated
// ---------------------------------------------------------------------------

let _devMiddleware: LanguageModelMiddleware | undefined
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@ai-sdk/devtools') as typeof import('@ai-sdk/devtools')
    _devMiddleware = mod.devToolsMiddleware()
  } catch (err) {
    console.warn('[model-factory] devToolsMiddleware unavailable, continuing without it', err)
  }
}

let _btWrap: <T extends object>(model: T) => T = (m) => m
if (process.env.BRAINTRUST_API_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bt = require('braintrust') as typeof import('braintrust')
    bt.initLogger({ projectName: process.env.BRAINTRUST_PROJECT ?? 'shep-ai' })
    _btWrap = bt.wrapAISDKModel
  } catch (err) {
    console.warn('[model-factory] Braintrust unavailable, continuing without it', err)
  }
}

// ---------------------------------------------------------------------------
// Raw model construction
// ---------------------------------------------------------------------------

/**
 * Returns the raw SDK LanguageModel for the given provider + modelId.
 * No observability middleware is applied. Use for routes and simple adapters.
 */
export function getProviderModel(provider: string, modelId: string): LanguageModel {
  switch (provider) {
    case 'anthropic':
      return anthropic(modelId || 'claude-sonnet-4-20250514')
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL
          ? `${process.env.OLLAMA_BASE_URL}/v1`
          : 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama(modelId || 'llama3.1')
    }
    case 'openai':
    default:
      return openai(modelId || 'gpt-4o')
  }
}

// ---------------------------------------------------------------------------
// Observed model (Braintrust + devtools)
// ---------------------------------------------------------------------------

/**
 * Returns the provider model wrapped with Braintrust and @ai-sdk/devtools
 * middleware (when available). Use in agent-runner and anywhere traces are needed.
 *
 * Braintrust: identity when BRAINTRUST_API_KEY is unset.
 * devtools: only applied in NODE_ENV=development.
 */
export function getObservedModel(provider: string, modelId: string): LanguageModel {
  const raw = getProviderModel(provider, modelId)
  // _btWrap is typed as <T extends object>(model: T) => T but LanguageModel is a
  // union that includes `string` which is not `object`. Cast through unknown both ways.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const observed = _btWrap(raw as any) as LanguageModel
  if (_devMiddleware) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return wrapLanguageModel({ model: observed as any, middleware: _devMiddleware })
  }
  return observed
}
