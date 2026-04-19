import { runPlugin } from './pluginLoader.js';

export async function runToolkitPlugin(name, input) {
  return runPlugin(name, input);
}
