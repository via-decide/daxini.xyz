import { addJob } from '../../infra/jobs/jobQueue.js';
import { incrementMetric } from '../../infra/observability/metrics.js';

export function queueResearchJob(query, runResearch) {
  addJob({
    type: 'research',
    run: () => runResearch(query)
  });

  incrementMetric('research_jobs');
}
