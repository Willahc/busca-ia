/**
 * Branded identifier for an authenticated or known actor.
 * Prevents using raw emails or usernames as authorization keys.
 */
export type ActorId = string & { readonly __brand: unique symbol };

export function createActorId(raw: string): ActorId {
  if (!raw || raw.trim().length === 0) {
    throw new Error("ActorId cannot be empty or whitespace.");
  }
  return raw.trim() as ActorId;
}