/**
 * RFC4122 v4 UUID (Math.random based — fine for a client-side idempotency key,
 * not for crypto). Used to give each create-wizard mount a STABLE capsule id so
 * a retry after a slow/timed-out request upserts the same row instead of
 * creating a duplicate cap.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
