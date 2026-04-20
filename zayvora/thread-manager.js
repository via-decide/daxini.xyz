(function (global) {
  'use strict';

  const STORAGE = global.ZayvoraThreadStore;

  function buildThread(title) {
    const id = `task_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    return {
      id,
      title,
      status: 'running',
      created_at: new Date().toISOString(),
      messages: [],
      reasoning_steps: [],
      artifacts: [],
      logs: [],
    };
  }

  function createThread(title) {
    const thread = buildThread(title);
    STORAGE.saveThread(thread);
    return thread;
  }

  function loadThread(taskId) {
    return STORAGE.loadThread(taskId);
  }

  function listThreads() {
    return STORAGE.listThreads();
  }

  function switchThread(taskId) {
    const thread = loadThread(taskId);
    if (thread) {
      localStorage.setItem('zv_active_thread', thread.id);
    }
    return thread;
  }

  function getActiveThreadId() {
    return localStorage.getItem('zv_active_thread');
  }

  function appendMessage(taskId, message) {
    const thread = loadThread(taskId);
    if (!thread) return null;

    thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
    thread.messages.push({
      role: message.role || 'user',
      content: message.content || '',
      timestamp: message.timestamp || new Date().toISOString(),
    });

    STORAGE.saveThread(thread);
    return thread;
  }

  function updateStatus(taskId, status) {
    const thread = loadThread(taskId);
    if (!thread) return null;
    thread.status = status;
    STORAGE.saveThread(thread);
    return thread;
  }

  global.ZayvoraThreadManager = {
    createThread,
    loadThread,
    listThreads,
    switchThread,
    getActiveThreadId,
    appendMessage,
    updateStatus,
  };
})(window);
