/**
 * Where sign-in leads. A guest who pressed Publish goes back to the task form
 * (restored from its draft) once signed in as a customer; everyone else goes to
 * the tabs. Held in memory only: a stored marker could fire on an unrelated
 * sign-in months later.
 */
import { replaceFromModal } from '@/lib/nav';

let backToTask = false;
let signedInRole: string | undefined;

export function returnToTaskAfterSignIn() {
  backToTask = true;
}

export function cancelReturnToTask() {
  backToTask = false;
}

/** Called by AuthProvider: the screens' own `user` is still stale at this point. */
export function noteSignedInRole(role: string | undefined) {
  signedInRole = role;
}

/** Every successful exit from the sign-in and sign-up screens. */
export function leaveAuth() {
  const toTask = backToTask && signedInRole?.toUpperCase() === 'CUSTOMER';
  backToTask = false;
  replaceFromModal(toTask ? '/create-task' : '/(tabs)');
}
