import { addLog, initLiveLog } from './components/live-log.js';
import { renderReasoningGraph, activateNode, clearNodes } from './components/reasoning-graph.js';

const templates = [
  { key: 'research', label: '🧠 Research', prompt: 'Research the current state of AI agent memory architectures and summarize the top 5 approaches.' },
  { key: 'create', label: '🎬 Create', prompt: 'Create a launch plan for a short-form educational content series with scripts and hooks.' },
  { key: 'game-dev', label: '🧩 Game Dev', prompt: 'Design a replayable progression loop for an indie survival game with clear player rewards.' },
  { key: 'analyze', label: '📊 Analyze', prompt: 'Analyze this product concept and provide strengths, risks, and metrics to validate it.' },
  { key: 'solve', label: '🛠 Solve', prompt: 'Solve this engineering bottleneck by outlining root causes and a prioritized fix strategy.' },
  { key: 'documents', label: '📁 Documents', prompt: 'Draft a concise technical specification document from this project idea.' },
  { key: 'explore', label: '🔭 Explore Knowledge', prompt: 'Explore adjacent opportunities related to this idea and suggest unconventional directions.' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTemplates() {
  const container = document.getElementById('task-templates');
  const input = document.getElementById('main-prompt');
  if (!container || !input) return;

  container.innerHTML = '';
  templates.forEach((template) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-item';
    button.textContent = template.label;
    button.addEventListener('click', () => {
      input.value = template.prompt;
      input.focus();
      document.querySelectorAll('.template-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      addLog(`[TEMPLATE] Loaded ${template.label}`);
    });
    container.appendChild(button);
  });
}

function setProgress(message) {
  const progress = document.getElementById('task-progress');
  if (progress) progress.textContent = message;
}

function setResult(message) {
  const result = document.getElementById('result-output');
  if (result) result.textContent = message;
}

function renderMetrics(executionMs) {
  const metrics = document.getElementById('metrics-output');
  if (!metrics) return;
  const seconds = (executionMs / 1000).toFixed(1);
  metrics.innerHTML = `
    <p>✔ Execution complete</p>
    <p>Execution time: ${seconds}s</p>
    <p>Sources: 8</p>
    <p>Reasoning steps: 5</p>
    <p>Confidence: High</p>
  `;
}

async function runTask() {
  const input = document.getElementById('main-prompt');
  const runButton = document.getElementById('run-task');
  if (!input || !runButton) return;

  const prompt = input.value.trim();
  if (!prompt) {
    setProgress('Enter a mission prompt first.');
    return;
  }

  runButton.disabled = true;
  clearNodes();
  setProgress('Starting execution...');
  setResult('Running reasoning engine...');
  const startedAt = performance.now();

  activateNode('user');
  addLog('[INPUT] Mission received');
  await sleep(400);

  addLog('[ZAYVORA] Planning task...');
  activateNode('planning');
  setProgress('Planning');
  await sleep(800);

  addLog('[TOOLKIT] Searching knowledge base...');
  activateNode('knowledge');
  setProgress('Knowledge retrieval');
  await sleep(900);

  addLog('[ENGINE] Building solution...');
  activateNode('reasoning');
  setProgress('Reasoning');
  await sleep(1000);

  addLog('[VERIFY] Checking reasoning...');
  activateNode('verify');
  setProgress('Verification');
  await sleep(600);

  activateNode('output');
  addLog('[DONE] Task completed');
  setProgress('Execution complete');
  setResult(`Mission output ready: ${prompt.slice(0, 140)}${prompt.length > 140 ? '…' : ''}`);
  renderMetrics(performance.now() - startedAt);

  runButton.disabled = false;
}

function setupCommandPalette() {
  const palette = document.getElementById('command-palette');
  const prompt = document.getElementById('main-prompt');
  if (!palette || !prompt) return;

  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const trigger = (isMac && event.metaKey && event.key.toLowerCase() === 'k')
      || (!isMac && event.ctrlKey && event.key.toLowerCase() === 'k');

    if (!trigger) return;
    event.preventDefault();
    palette.hidden = !palette.hidden;
    if (!palette.hidden) palette.querySelector('button')?.focus();
  });

  palette.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) {
      if (target.id === 'command-palette') palette.hidden = true;
      return;
    }

    if (action === 'run') {
      runTask();
    } else {
      const template = templates.find((item) => item.key === action);
      if (template) {
        prompt.value = template.prompt;
        addLog(`[PALETTE] Loaded ${template.label}`);
      }
    }
    palette.hidden = true;
  });
}

function initWorkspace() {
  renderReasoningGraph();
  initLiveLog();
  addLog('[ZAYVORA] Mission control ready');
  buildTemplates();
  setupCommandPalette();

  const runButton = document.getElementById('run-task');
  if (runButton) runButton.addEventListener('click', runTask);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspace);
} else {
  initWorkspace();
}
