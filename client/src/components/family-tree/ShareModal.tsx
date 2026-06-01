import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Link2, Share2, Trash2, RefreshCw, Clock, Eye, Lock, Globe } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { formatDate } from '../../lib/utils';
import type { Branch } from '../../types';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
}

interface ShareRecord {
  id: string;
  token: string;
  title: string | null;
  branch_id: string | null;
  branch_name: string | null;
  expires_at: string | null;
  status: 'active' | 'revoked';
  view_count: number;
  has_password: number;
  created_at: string;
}

type Tab = 'create' | 'list';

export function ShareModal({ open, onClose, branches }: ShareModalProps) {
  const [tab, setTab] = useState<Tab>('create');

  // Create state
  const [title, setTitle] = useState('');
  const [branchId, setBranchId] = useState('');
  const [password, setPassword] = useState('');
  const [expiresDays, setExpiresDays] = useState('');
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState('');

  // List state
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { showToast } = useToast();

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 placeholder-gray-400 dark:placeholder-gray-500';
  const selectClass = `${inputClass} appearance-none`;

  const loadShares = useCallback(async () => {
    setListLoading(true);
    try { setShares(await api.get<ShareRecord[]>('/shares')); } catch { /* ignore */ }
    setListLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && tab === 'list') loadShares();
  }, [open, tab, loadShares]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { token } = await api.post<{ token: string }>('/shares', {
        title: title || undefined,
        branch_id: branchId || undefined,
        password: password || undefined,
        expires_days: expiresDays ? Number(expiresDays) : undefined,
      });
      setNewLink(`${window.location.origin}/share/${token}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tạo link', 'error');
    } finally { setCreating(false); }
  };

  const copyLink = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeShare = async (id: string) => {
    if (!confirm('Thu hồi link chia sẻ này? Người xem sẽ không truy cập được nữa.')) return;
    setRevoking(id);
    try {
      await api.delete(`/shares/${id}`);
      setShares(prev => prev.map(s => s.id === id ? { ...s, status: 'revoked' } : s));
      showToast('Đã thu hồi link chia sẻ', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi thu hồi', 'error');
    } finally { setRevoking(null); }
  };

  const resetCreate = () => {
    setTitle(''); setBranchId(''); setPassword(''); setExpiresDays('');
    setNewLink('');
  };

  const handleClose = () => {
    resetCreate();
    setTab('create');
    onClose();
  };

  const switchTab = (t: Tab) => { setTab(t); setNewLink(''); };

  return (
    <Modal open={open} onClose={handleClose} title="Chia sẻ cây gia phả">
      {/* Tab bar */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-5">
        <button onClick={() => switchTab('create')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'create' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Tạo link mới
        </button>
        <button onClick={() => switchTab('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'list' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Đã tạo {shares.length > 0 && `(${shares.length})`}
        </button>
      </div>

      {/* ── Tab: Tạo mới ── */}
      {tab === 'create' && !newLink && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <Globe size={15} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Người nhận link có thể xem cây gia phả mà không cần đăng nhập. Thông tin nhạy cảm (email, điện thoại) sẽ được ẩn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Tiêu đề <span className="font-normal text-gray-400">(tùy chọn)</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Cây gia phả họ Nguyễn" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Phạm vi chia sẻ</label>
            <select value={branchId} onChange={e => setBranchId(e.target.value)} className={selectClass}>
              <option value="">🌳 Toàn bộ cây gia phả</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>🌿 Nhánh: {b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                <Lock size={11} className="inline mr-1" />Mật khẩu <span className="font-normal text-gray-400">(tùy chọn)</span>
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Để trống = không cần mật khẩu" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Thời hạn</label>
              <select value={expiresDays} onChange={e => setExpiresDays(e.target.value)} className={selectClass}>
                <option value="">Không hết hạn</option>
                <option value="7">7 ngày</option>
                <option value="30">30 ngày</option>
                <option value="90">90 ngày</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Hủy
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
              <Share2 size={15} />
              {creating ? 'Đang tạo...' : 'Tạo link chia sẻ'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Tạo mới — link vừa tạo ── */}
      {tab === 'create' && newLink && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
            <Link2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Link chia sẻ đã sẵn sàng!</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Đường link</label>
            <div className="flex gap-2">
              <input readOnly value={newLink}
                className={`${inputClass} text-xs flex-1 truncate`}
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={() => copyLink(newLink, 'new')}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0">
                {copiedId === 'new' ? <Check size={15} /> : <Copy size={15} />}
                {copiedId === 'new' ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>
          {password && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock size={11} /> Link được bảo vệ bằng mật khẩu. Hãy gửi mật khẩu riêng cho người xem.
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={resetCreate}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Tạo link khác
            </button>
            <button onClick={() => switchTab('list')}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors">
              Xem danh sách
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Đã tạo ── */}
      {tab === 'list' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {shares.length === 0 && !listLoading ? 'Chưa có link chia sẻ nào' : `${shares.length} link`}
            </p>
            <button onClick={loadShares} disabled={listLoading}
              className="p-1.5 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {shares.map(share => {
              const isRevoked = share.status === 'revoked';
              const isExpired = !!share.expires_at && new Date(share.expires_at) < new Date();
              const isActive = !isRevoked && !isExpired;
              const shareLink = `${window.location.origin}/share/${share.token}`;

              return (
                <div key={share.id}
                  className={`p-3 rounded-xl border ${isActive ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {share.title ?? (share.branch_name ? `Nhánh: ${share.branch_name}` : 'Toàn bộ cây gia phả')}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{share.branch_name ? `Nhánh: ${share.branch_name}` : 'Toàn bộ'}</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      isRevoked ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                      isExpired ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' :
                      'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    }`}>
                      {isRevoked ? 'Thu hồi' : isExpired ? 'Hết hạn' : 'Đang hoạt động'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><Eye size={11} /> {share.view_count} lượt xem</span>
                    {share.has_password ? <span className="flex items-center gap-1"><Lock size={11} /> Có mật khẩu</span> : null}
                    {share.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {isExpired ? `Hết hạn ${formatDate(share.expires_at)}` : `Hạn ${formatDate(share.expires_at)}`}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="flex gap-1.5">
                      <button onClick={() => copyLink(shareLink, share.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors">
                        {copiedId === share.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === share.id ? 'Đã sao chép' : 'Sao chép link'}
                      </button>
                      <button onClick={() => revokeShare(share.id)} disabled={revoking === share.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 dark:text-red-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 size={12} />
                        {revoking === share.id ? 'Đang thu hồi...' : 'Thu hồi'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => switchTab('create')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors mt-2">
            <Share2 size={15} />
            Tạo link chia sẻ mới
          </button>
        </div>
      )}
    </Modal>
  );
}
