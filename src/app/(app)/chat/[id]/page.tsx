import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getContainer } from '@/config/container'
import { ChatInterface } from '@/components/chat/chat-interface'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ChatConversationPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  const userId = session!.user!.email!

  const { conversationUseCase } = getContainer()

  const [conversation, messages] = await Promise.all([
    conversationUseCase.getConversation(id, userId),
    conversationUseCase.listMessages(id),
  ])

  if (!conversation) {
    notFound()
  }

  return (
    <ChatInterface conversation={conversation} initialMessages={messages} />
  )
}
