import { NextResponse } from 'next/server'
import { getContainer } from '@/config/container'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { scheduledAgentUseCase } = getContainer()
  const result = await scheduledAgentUseCase.runDueSchedules()

  return NextResponse.json(result)
}
