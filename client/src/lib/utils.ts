/**
 * Chuyển đường dẫn ảnh nội bộ (/uploads/...) thành URL an toàn có token.
 * Ảnh bên ngoài (http/https) được trả về nguyên vẹn.
 */
export function mediaUrl(src: string | null | undefined): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  const token = localStorage.getItem('giapha_token');
  return token ? `${src}?t=${token}` : src;
}

/** Kiểm tra URL có phải video nhúng (YouTube, Vimeo, TikTok, ...) */
export function isVideoUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

/** Lấy YouTube video ID từ URL */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return m?.[1] ?? null;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseJSON<T>(str: string, fallback: T): T {
  try { return JSON.parse(str); } catch { return fallback; }
}

export const RELATION_GROUPS: { label: string; types: string[] }[] = [
  { label: 'Cha mẹ – Con', types: ['cha', 'mẹ', 'cha/mẹ', 'con trai', 'con gái', 'con'] },
  { label: 'Vợ / Chồng',   types: ['vợ', 'chồng'] },
  { label: 'Anh chị em ruột', types: ['anh', 'chị', 'em trai', 'em gái', 'em'] },
  { label: 'Ông bà – Cháu',  types: ['ông', 'bà', 'cháu trai', 'cháu gái', 'cháu'] },
  { label: 'Chú bác cô dì cậu', types: ['bác', 'chú', 'thím', 'cô', 'dì', 'cậu', 'dượng', 'mợ'] },
  { label: 'Con dâu / Rể',   types: ['rể', 'dâu'] },
  { label: 'Anh chị em vợ/chồng', types: ['anh rể', 'em rể', 'chị dâu', 'em dâu'] },
  { label: 'Anh chị em họ', types: ['anh họ', 'chị họ', 'em họ'] },
  { label: 'Bố mẹ vợ/chồng', types: ['bố vợ', 'mẹ vợ', 'bố chồng', 'mẹ chồng'] },
  { label: 'Quan hệ nuôi', types: ['cha nuôi', 'mẹ nuôi', 'con nuôi', 'con trai nuôi', 'con gái nuôi', 'anh nuôi', 'chị nuôi', 'em nuôi', 'em trai nuôi', 'em gái nuôi'] },
];

export const RELATION_TYPES = RELATION_GROUPS.flatMap(g => g.types);

export const REACTION_EMOJIS: Record<string, string> = {
  like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢',
};
