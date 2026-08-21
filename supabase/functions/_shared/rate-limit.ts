type RateLimitConfig = {
  scope: string;
  ipLimit: number;
  userLimit?: number;
  windowSeconds?: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  const candidate = forwarded?.split(',')[0]?.trim() || real?.trim() || 'unknown';
  return candidate.slice(0, 128);
}

async function checkBucket(admin: any, key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const { data, error } = await admin.rpc('check_edge_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Rate limit service unavailable: ${error.message}`);
  return {
    allowed: Boolean(data?.allowed),
    limit: Number(data?.limit ?? limit),
    remaining: Number(data?.remaining ?? 0),
    resetAt: Number(data?.reset_at ?? Math.floor(Date.now() / 1000) + windowSeconds),
  };
}

export async function enforceRateLimit(
  req: Request,
  admin: any,
  userId: string | null,
  config: RateLimitConfig,
): Promise<Response | null> {
  const windowSeconds = config.windowSeconds ?? 60;
  const ip = getClientIp(req);
  const ipResult = await checkBucket(admin, `${config.scope}:ip:${ip}`, config.ipLimit, windowSeconds);
  const userResult = userId && config.userLimit
    ? await checkBucket(admin, `${config.scope}:user:${userId}`, config.userLimit, windowSeconds)
    : ipResult;

  const result = !ipResult.allowed ? ipResult : userResult;
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-RateLimit-Limit': String(Math.min(ipResult.limit, userResult.limit)),
    'X-RateLimit-Remaining': String(Math.min(ipResult.remaining, userResult.remaining)),
    'X-RateLimit-Reset': String(result.resetAt),
    'Retry-After': String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))),
  });

  if (result.allowed) return null;

  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    retry_after_seconds: Math.max(1, result.resetAt - Math.floor(Date.now() / 1000)),
  }), { status: 429, headers });
}
