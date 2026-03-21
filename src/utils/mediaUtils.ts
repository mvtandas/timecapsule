export const getMediaUrl = (capsule: any): string | null => {
  if (!capsule) return null;
  if (capsule.media_url && capsule.media_type !== 'none') return capsule.media_url;
  if (capsule.content_refs && Array.isArray(capsule.content_refs)) {
    for (const ref of capsule.content_refs) {
      if (typeof ref === 'string' && ref.startsWith('http')) return ref;
      if (ref?.url && ref.url.startsWith('http')) return ref.url;
      if (ref?.file_url && ref.file_url.startsWith('http')) return ref.file_url;
    }
  }
  return null;
};

export const isLocked = (openAt: string | null | undefined): boolean => {
  if (!openAt) return false;
  return new Date(openAt).getTime() > Date.now();
};
