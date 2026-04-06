import Redis from 'ioredis'

let redisClient = null

export async function connectRedis() {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
        console.warn('[Redis] REDIS_URL not set – caching disabled')
        return
    }

    try {
        redisClient = new Redis(redisUrl, {
            lazyConnect: false,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.warn('[Redis] Could not connect after 3 retries – caching disabled')
                    return null   // stop retrying
                }
                return Math.min(times * 300, 3000)
            },
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            connectTimeout: 5000,
        })

        // Wait for the connection event (or error) before returning
        await new Promise((resolve) => {
            redisClient.once('ready', () => {
                console.log('[Redis] Connected successfully')
                resolve()
            })
            redisClient.once('error', (err) => {
                console.warn('[Redis] Connection error:', err.message, '– caching disabled')
                redisClient = null
                resolve()   // resolve (not reject) — app must not crash
            })
        })
    } catch (err) {
        console.warn('[Redis] Setup failed:', err.message, '– caching disabled')
        redisClient = null
    }
}

function isReady() {
    return redisClient && redisClient.status === 'ready'
}

/**
 * Get a cached JSON value. Returns null on miss or if Redis is offline.
 */
export async function cacheGet(key) {
    if (!isReady()) return null
    try {
        const val = await redisClient.get(key)
        return val ? JSON.parse(val) : null
    } catch {
        return null
    }
}

/**
 * Cache a JSON-serialisable value with a TTL in seconds.
 * Silently fails if Redis is offline.
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
    if (!isReady()) return
    try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
        // silent – cache miss is always acceptable
    }
}

/**
 * Delete one or more exact keys.
 */
export async function cacheDel(...keys) {
    if (!isReady() || keys.length === 0) return
    try {
        await redisClient.del(...keys)
    } catch {
        // silent
    }
}

/**
 * Delete all keys matching a glob pattern using non-blocking SCAN.
 * Example: cacheDelPattern('stats:userId:*')
 */
export async function cacheDelPattern(pattern) {
    if (!isReady()) return
    try {
        let cursor = '0'
        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = nextCursor
            if (keys.length > 0) await redisClient.del(...keys)
        } while (cursor !== '0')
    } catch {
        // silent
    }
}

export { redisClient }
