import { routeAction } from '../router/actions/router.js';

export async function handleZayvoraQuery(query) {
  return routeAction('reason', query);
}

export async function runZayvoraQuery(query) {
  return handleZayvoraQuery(query);
}
