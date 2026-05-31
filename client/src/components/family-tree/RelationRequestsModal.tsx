import { useEffect, useState } from 'react';
import { Check, X, Clock, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { formatTime } from '../../lib/utils';

interface Request {
  id: string;
  from_user_id: string; from_name: string; from_avatar: string | null;
  to_user_id: string;   to_name?: string;  to_avatar?: string | null;
  relation_type: string;
  message: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

export function RelationRequestsModal({ open, onClose, onAccepted }: Props) {
  const [received, setReceived] = useState<Request[]>([]);
  const [sent, setSent] = useState<Request[]>([]);
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const load = () =>
    api.get<{ received: Request[]; sent: Request[] }>('/family/requests')
      .then(d => { setReceived(d.received); setSent(d.sent); })
      .catch(() => {});

  useEffect(() => { if (open) load(); }, [open]);

  const accept = async (id: string) => {
    setLoading(true);
    try {
      await api.put(`/family/requests/${id}/accept`, {});
      setReceived(r => r.filter(x => x.id !== id));
      onAccepted();
      showToast('Đã chấp nhận quan hệ', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    setLoading(false);
  };

  const reject = async (id: string) => {
    try {
      await api.put(`/family/requests/${id}/reject`, {});
      setReceived(r => r.filter(x => x.id !== id));
      showToast('Đã từ chối yêu cầu', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const tabBtn = (t: 'received' | 'sent', label: string, count: number) => (
    <button onClick={() => setTab(t)}
      className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${
        tab === t
          ? 'bg-amber-500 text-white'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}>
      {label} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Yêu cầu quan hệ">
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabBtn('received', 'Nhận được', received.length)}
          {tabBtn('sent', 'Đã gửi', sent.length)}
        </div>

        {tab === 'received' && (
          received.length === 0
            ? <Empty text="Không có yêu cầu nào đang chờ" />
            : received.map(r => (
              <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar src={r.from_avatar} name={r.from_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.from_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                      muốn khai báo bạn là{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{r.relation_type}</span>
                      {' '}của họ
                    </p>
                    {r.message && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">"{r.message}"</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => accept(r.id)} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors min-h-[44px] touch-manipulation">
                    <Check size={16} /> Chấp nhận
                  </button>
                  <button onClick={() => reject(r.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-200 text-gray-600 dark:text-gray-300 font-medium rounded-xl text-sm transition-colors min-h-[44px] touch-manipulation">
                    <X size={16} /> Từ chối
                  </button>
                </div>
              </div>
            ))
        )}

        {tab === 'sent' && (
          sent.length === 0
            ? <Empty text="Bạn chưa gửi yêu cầu nào" />
            : sent.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <Avatar src={r.to_avatar ?? null} name={r.to_name ?? '?'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.to_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    là <span className="font-semibold text-amber-600 dark:text-amber-400">{r.relation_type}</span> của bạn
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                  <Clock size={12} /> Chờ xác nhận
                </div>
              </div>
            ))
        )}
      </div>
    </Modal>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <Send size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
      <p className="text-sm text-gray-400 dark:text-gray-500">{text}</p>
    </div>
  );
}
