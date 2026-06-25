/**
 * Reject a promise (PostgREST builder, upload, etc.) if it doesn't settle in
 * `ms`. Prevents the UI from hanging forever on a dead/paused backend or a
 * stalled network request — the caller surfaces the error instead of spinning.
 */
export function withTimeout<T>(p: PromiseLike<T>, ms = 20000, label = 'Request'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out. Check your connection and try again.`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}
