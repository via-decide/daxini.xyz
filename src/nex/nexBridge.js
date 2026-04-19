import { routeAction } from '../router/actions/router.js';

export async function runResearch(query) {
  return routeAction('research', query);
}

export function queueResearchJob(query) {
  return runResearch(query);
}
