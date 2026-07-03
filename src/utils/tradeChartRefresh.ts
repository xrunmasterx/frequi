const TRADE_CHART_REFRESH_INTERVAL_MS: Record<string, number> = {
  '1m': 10_000,
  '3m': 30_000,
  '5m': 60_000,
  '15m': 60_000,
  '30m': 60_000,
  '1h': 180_000,
  '2h': 300_000,
  '4h': 300_000,
  '6h': 600_000,
  '8h': 600_000,
  '12h': 600_000,
  '1d': 900_000,
  '3d': 900_000,
  '1w': 900_000,
  '2w': 900_000,
  '1M': 900_000,
  '1y': 900_000,
};

const DEFAULT_TRADE_CHART_REFRESH_INTERVAL_MS = 60_000;

export function getTradeChartRefreshIntervalMs(timeframe: string): number {
  return TRADE_CHART_REFRESH_INTERVAL_MS[timeframe] ?? DEFAULT_TRADE_CHART_REFRESH_INTERVAL_MS;
}

export async function runDedupedChartRefresh(
  inFlight: Set<string>,
  key: string,
  refresh: () => Promise<void>,
): Promise<boolean> {
  if (inFlight.has(key)) {
    return false;
  }

  inFlight.add(key);
  try {
    await refresh();
    return true;
  } finally {
    inFlight.delete(key);
  }
}
