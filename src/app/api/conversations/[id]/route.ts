import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { getEnv } from '@/config/env'
import { validateModel, getProviderForModel } from '@/config/models'
import type { ProviderId } from '@/config/models'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { conversationUseCase } = getContainer()

  const [conversation, messages] = await Promise.all([
    conversationUseCase.getConversation(id, session.user.email),
    conversationUseCase.listMessages(id),
  ])

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ conversation, messages })
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { title, model, useRag } = body as {
    title?: string
    model?: string
    useRag?: boolean
  }

  // Validate model if provided. Allow cross-provider models when multiple
  // provider keys are configured; reject only if the model is unknown to
  // the registry entirely or belongs to a provider that is not configured.
  if (model !== undefined) {
    const env = getEnv()
    const modelProvider = getProviderForModel(model)

    if (modelProvider === null) {
      // Model not in registry at all
      return NextResponse.json(
        { error: `model not valid for provider ${env.AI_PROVIDER}` },
        { status: 422 },
      )
    }

    // If the model belongs to a different provider than AI_PROVIDER, ensure
    // that provider's key is actually configured so the model can be used.
    if (!validateModel(model, env.AI_PROVIDER as ProviderId)) {
      const providerKey = modelProvider === 'openai'
        ? env.OPENAI_API_KEY
        : modelProvider === 'anthropic'
          ? env.ANTHROPIC_API_KEY
          : env.OLLAMA_BASE_URL

      if (!providerKey) {
        return NextResponse.json(
          { error: `model not valid for provider ${env.AI_PROVIDER}` },
          { status: 422 },
        )
      }
      // Cross-provider model is valid — the chat route resolves provider from model id
    }
  }

  const { conversationUseCase } = getContainer()
  const conversation = await conversationUseCase.updateConversation(
    id,
    session.user.email,
    { title, model, useRag },
  )

  return NextResponse.json({ conversation })
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { conversationUseCase } = getContainer()

  // Verify ownership before deleting
  const conversation = await conversationUseCase.getConversation(id, session.user.email)
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await conversationUseCase.deleteConversation(id, session.user.email)
  return new Response(null, { status: 204 })
}
