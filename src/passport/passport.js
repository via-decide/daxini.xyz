import { emit } from '../router/events/eventBus.js';

export function handlePassportLoginSuccess(userId) {
  emit('user-login', {
    user: userId,
    time: Date.now()
  });
}
