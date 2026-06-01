import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Link2, UserPlus, Trash2, RefreshCw, Clock, UserCheck, Ban } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { RELATION_GROUPS, formatDate } from '../../lib/utils';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

interface Invite {
  id: string;
  token: string;
  relation_type: string | null;
  invitee_name: string | null;
  invitee_dob: string | null;
  message: string | null;
  expires_at: string;
  status: 'pending' | 'used' | 'revoked';
  used_by_name: string | null;
  used_at: string | null;
  created_at: string;
}

type Tab = 'create' | 'list';

function getEffectiveStatus(inv: Invite): 'pending' | 'expired' | 'used' | 'revoked' {
  if (inv.status === 'used') return 'used';
  if (inv.status === 'revoked') return 'revoked';
  if (new Date(inv.expires_at) < new Date()) return 'expired';
  return 'pending';
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Đang chờ',   cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  expired:  { label: 'Hết hạn',    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  used:     { label: 'Đã dùng',    cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  revoked:  { label: 'Đã thu hồi', cls: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
};

export function InviteModal({ open, onClose }: InviteModalProps) {
  const [tab, setTab] = useState<Tab>('create');

  // Create tab state
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeGender, setInviteeGender] = useState('');
  const [inviteeDob, setInviteeDob] = useState('');
  const [relationType, setRelationType] = useState('');
  const [message, setMessage] = useState('');
  const [expiresDays, setExpiresDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [newLinkCopied, setNewLinkCopied] = useState(false);

  // List tab state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const { showToast } = useToast();

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 placeholder-gray-400 dark:placeholder-gray-500';
  const selectClass = `${inputClass} appearance-none`;

  const loadInvites = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await api.get<Invite[]>('/invites');
      setInvites(data);
    } catch { /* ignore */ }
    setListLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && tab === 'list') loadInvites();
  }, [open, tab, loadInvites]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setNewLink('');
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { token } = await api.post<{ token: string }>('/invites', {
        invitee_name: inviteeName || undefined,
        invitee_gender: inviteeGender || undefined,
        invitee_dob: inviteeDob || undefined,
        relation_type: relationType || undefined,
        message: message || undefined,
        expires_days: expiresDays,
      });
      setNewLink(`${window.location.origin}/join?token=${token}`);
      // Refresh list nếu đang xem
      if (tab === 'list') loadInvites();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi tạo lời mời', 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyNewLink = async () => {
    await navigator.clipboard.writeText(newLink);
    setNewLinkCopied(true);
    setTimeout(() => setNewLinkCopied(false), 2000);
  };

  const copyInviteLink = async (token: string, id: string) => {
    const link = `${window.location.origin}/join?token=${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeInvite = async (id: string) => {
    if (!confirm('Thu hồi lời mời này? Link sẽ không dùng được nữa.')) return;
    setRevoking(id);
    try {
      await api.delete(`/invites/${id}`);
      setInvites(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'revoked' } : inv));
      showToast('Đã thu hồi lời mời', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi thu hồi', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const resetCreate = () => {
    setInviteeName(''); setInviteeGender(''); setInviteeDob('');
    setRelationType(''); setMessage(''); setExpiresDays(7);
    setNewLink(''); setNewLinkCopied(false);
  };

  const handleClose = () => {
    resetCreate();
    setTab('create');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Lời mời tham gia">
      {/* Tab bar */}
      <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-5">
        <button onClick={() => switchTab('create')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'create' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Tạo mới
        </button>
        <button onClick={() => switchTab('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'list' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          Đã tạo {invites.length > 0 && `(${invites.length})`}
        </button>
      </div>

      {/* ── Tab: Tạo mới ── */}
      {tab === 'create' && !newLink && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tạo đường link để gửi cho người thân. Họ sẽ đăng ký và tự động được thêm vào cây gia phả.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Tên người được mời <span className="font-normal text-gray-400">(gợi ý khi họ đăng ký)</span>
            </label>
            <input type="text" value={inviteeName} onChange={e => setInviteeName(e.target.value)}
              placeholder="VD: Nguyễn Văn B" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Giới tính</label>
              <select value={inviteeGender} onChange={e => setInviteeGender(e.target.value)} className={selectClass}>
                <option value="">Không xác định</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Ngày sinh</label>
              <input type="date" value={inviteeDob} onChange={e => setInviteeDob(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Mối quan hệ với bạn <span className="font-normal text-gray-400">(để trống nếu chưa biết)</span>
            </label>
            <select value={relationType} onChange={e => setRelationType(e.target.value)} className={selectClass}>
              <option value="">— Chưa xác định —</option>
              {RELATION_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Lời nhắn</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={2} placeholder="VD: Mình là con trai của bố, hãy tham gia để kết nối gia đình nhé!"
              className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Thời hạn link</label>
            <select value={expiresDays} onChange={e => setExpiresDays(Number(e.target.value))} className={selectClass}>
              <option value={1}>1 ngày</option>
              <option value={7}>7 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={90}>90 ngày</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Hủy
            </button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors">
              <UserPlus size={15} />
              {creating ? 'Đang tạo...' : 'Tạo link mời'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Tạo mới — link vừa tạo ── */}
      {tab === 'create' && newLink && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900/50">
            <Link2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Link mời đã được tạo!</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Đường link mời</label>
            <div className="flex gap-2">
              <input readOnly value={newLink}
                className={`${inputClass} text-xs flex-1 truncate`}
                onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={copyNewLink}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0">
                {newLinkCopied ? <Check size={15} /> : <Copy size={15} />}
                {newLinkCopied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Gửi link này cho người thân. Họ nhấn vào sẽ được hướng dẫn đăng ký và kết nối với bạn trong cây gia phả.
          </p>
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
              {invites.length === 0 && !listLoading ? 'Chưa có lời mời nào' : `${invites.length} lời mời`}
            </p>
            <button onClick={loadInvites} disabled={listLoading}
              className="p-1.5 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {listLoading && invites.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {invites.map(inv => {
                const status = getEffectiveStatus(inv);
                const badge = STATUS_BADGE[status];
                const canCopy = status === 'pending';
                const canRevoke = status === 'pending';

                return (
                  <div key={inv.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {inv.invitee_name ?? <span className="italic text-gray-400">Không đặt tên</span>}
                        </p>
                        {inv.relation_type && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">{inv.relation_type} của bạn</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-2">
                      {status === 'used' ? (
                        <>
                          <UserCheck size={12} />
                          <span>Dùng bởi <strong className="text-gray-600 dark:text-gray-300">{inv.used_by_name}</strong></span>
                          {inv.used_at && <span>· {formatDate(inv.used_at)}</span>}
                        </>
                      ) : status === 'revoked' ? (
                        <>
                          <Ban size={12} />
                          <span>Đã thu hồi</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>
                            {status === 'expired' ? 'Hết hạn' : 'Hạn'} {formatDate(inv.expires_at)}
                          </span>
                        </>
                      )}
                    </div>

                    {(canCopy || canRevoke) && (
                      <div className="flex gap-1.5">
                        {canCopy && (
                          <button onClick={() => copyInviteLink(inv.token, inv.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors">
                            {copiedId === inv.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === inv.id ? 'Đã sao chép' : 'Sao chép link'}
                          </button>
                        )}
                        {canRevoke && (
                          <button onClick={() => revokeInvite(inv.id)} disabled={revoking === inv.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 dark:text-red-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50">
                            <Trash2 size={12} />
                            {revoking === inv.id ? 'Đang thu hồi...' : 'Thu hồi'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => switchTab('create')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors mt-2">
            <UserPlus size={15} />
            Tạo lời mời mới
          </button>
        </div>
      )}
    </Modal>
  );
}
