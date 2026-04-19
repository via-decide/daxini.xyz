import { logEvent } from '../../infra/observability/logger.js';
import { incrementMetric } from '../../infra/observability/metrics.js';

export async function runZayvoraQuery(query, runQuery) {
  logEvent('zayvora-query', query);
  incrementMetric('zayvora_requests');

  return runQuery(query);
}
