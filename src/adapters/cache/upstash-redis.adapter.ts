import { Redis } from '@upstash/redis'
import type { CachePort } from '@/core/ports/out/cache.port'

export class UpstashRedisAdapter implements CachePort {
  private readonly redis: Redis

  constructor() {
    this.redis = Redis.fromEnv()
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key)
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, { ex: ttlSeconds })
    } else {
      await this.redis.set(key, value)
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
}
