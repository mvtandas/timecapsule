export const timeAgo = (d: string | null | undefined): string => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return formatDate(d);
};

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (d: string): string => {
  return new Date(d).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
