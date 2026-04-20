(function (global) {
  'use strict';

  const STATUS_LABEL = {
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    pending: 'Pending',
  };

  function renderTimeline(container, steps) {
    if (!container) return;
    if (!Array.isArray(steps) || steps.length === 0) {
      container.innerHTML = '<div class="zv-timeline-empty">Live execution timeline will appear here.</div>';
      return;
    }

    const sortedSteps = [...steps].sort((a, b) => a.step - b.step);
    container.innerHTML = sortedSteps.map((step) => {
      const status = step.status || 'pending';
      const label = step.label || `Step ${step.step}`;
      return `
        <div class="zv-timeline-item ${status}">
          <div class="zv-timeline-step">STEP ${step.step}</div>
          <div class="zv-timeline-label">${escapeHtml(label)}</div>
          <div class="zv-timeline-status">${STATUS_LABEL[status] || status}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  global.ZayvoraLiveTimeline = {
    renderTimeline,
  };
})(window);
