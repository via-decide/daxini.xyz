import { incrementMetric } from '../../infra/observability/metrics.js';

const MODULE_TO_METRIC = {
  orchade: 'module_launches',
  mars: 'module_launches',
  skillhex: 'module_launches'
};

export function launchModule(moduleName, launchFn) {
  if (MODULE_TO_METRIC[moduleName]) {
    incrementMetric(MODULE_TO_METRIC[moduleName]);
  }

  return launchFn(moduleName);
}
