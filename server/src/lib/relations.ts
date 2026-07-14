/**
 * Chiều ngược của mỗi loại quan hệ:
 * nếu B là <X> của A thì A là <REVERSE[X]> của B.
 */
export const REVERSE: Record<string, string> = {
  'cha': 'con', 'mẹ': 'con', 'cha/mẹ': 'con', 'cha nuôi': 'con nuôi', 'mẹ nuôi': 'con nuôi',
  'con': 'cha/mẹ', 'con trai': 'cha/mẹ', 'con gái': 'cha/mẹ',
  'con nuôi': 'cha/mẹ', 'con trai nuôi': 'cha/mẹ', 'con gái nuôi': 'cha/mẹ',
  'vợ': 'chồng', 'chồng': 'vợ',
  'anh': 'em', 'chị': 'em', 'em': 'anh', 'em trai': 'anh', 'em gái': 'chị',
  'anh nuôi': 'em nuôi', 'chị nuôi': 'em nuôi', 'em nuôi': 'anh nuôi',
  'em trai nuôi': 'anh nuôi', 'em gái nuôi': 'chị nuôi',
  'ông': 'cháu', 'bà': 'cháu',
  'cháu': 'ông', 'cháu trai': 'ông', 'cháu gái': 'bà',
  'rể': 'bố vợ', 'dâu': 'bố chồng',
  'bố vợ': 'rể', 'mẹ vợ': 'rể', 'bố chồng': 'dâu', 'mẹ chồng': 'dâu',
  'anh rể': 'em dâu', 'em rể': 'chị dâu', 'chị dâu': 'em rể', 'em dâu': 'anh rể',
  'bác': 'cháu', 'chú': 'cháu', 'thím': 'cháu', 'cô': 'cháu',
  'dì': 'cháu', 'cậu': 'cháu', 'dượng': 'cháu', 'mợ': 'cháu',
  'anh họ': 'em họ', 'chị họ': 'em họ', 'em họ': 'anh họ',
};

/** Email nội bộ đánh dấu tài khoản được quản lý (chưa thể tự đăng nhập). */
export const MANAGED_EMAIL_SUFFIX = '@family.internal';

export function managedEmail(userId: string): string {
  return `managed_${userId}${MANAGED_EMAIL_SUFFIX}`;
}

export function isManagedEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(MANAGED_EMAIL_SUFFIX);
}
