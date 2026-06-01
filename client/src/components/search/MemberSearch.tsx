import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, UserPlus, Send, ChevronDown } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import type { User } from '../../types';
import { RELATION_GROUPS, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

interface RelationForm {
  open: boolean;
  relationType: string;
  message: string;
  loading: boolean;
}

interface MemberCardProps {
  member: User;
  me: User;
  onRequestSent: (userId: string) => void;
}

function MemberCard({ member, me, onRequestSent }: MemberCardProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState<RelationForm>({
    open: false, relationType: 'con trai', message: '', loading: false,
  });

  const submit = async () => {
    setForm(f => ({ ...f, loading: true }));
    try {
      if (me.role === 'admin') {
        await api.post('/family/relationships', {
          user_id: me.id,
          related_user_id: member.id,
          relation_type: form.relationType,
        });
        showToast('Đã thêm quan hệ', 'success');
      } else {
        await api.post('/family/requests', {
          to_user_id: member.id,
          relation_type: form.relationType,
          message: form.message.trim() || undefined,
        });
        showToast('Đã gửi yêu cầu — chờ xác nhận', 'success');
      }
      onRequestSent(member.id);
      setForm(f => ({ ...f, open: false, message: '' }));
    } catch (err: any) { showToast(err.message, 'error'); }
    setForm(f => ({ ...f, loading: false }));
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar src={member.avatar} name={member.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{member.name}</p>
          <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {member.date_of_birth && <span>🎂 {formatDate(member.date_of_birth)}</span>}
            {member.bio && <span className="truncate max-w-[160px]">{member.bio}</span>}
          </div>
        </div>
        {member.id !== me.id && (
          <button
            onClick={() => setForm(f => ({ ...f, open: !f.open }))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
              form.open
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Thêm quan hệ</span>
            <ChevronDown size={12} className={`transition-transform ${form.open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {form.open && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-amber-50/50 dark:bg-amber-950/10 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            <strong>{member.name}</strong> là ... của tôi:
          </p>
          <select
            value={form.relationType}
            onChange={e => setForm(f => ({ ...f, relationType: e.target.value }))}
            className={inputClass}
          >
            {RELATION_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.types.map(r => <option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>

          {me.role !== 'admin' && (
            <input
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Kèm tin nhắn (tuỳ chọn)..."
              className={inputClass}
            />
          )}

          <div className="flex gap-2">
            <button onClick={() => setForm(f => ({ ...f, open: false }))}
              className="flex-1 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Huỷ
            </button>
            <button onClick={submit} disabled={form.loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors">
              {me.role === 'admin' ? <UserPlus size={14} /> : <Send size={14} />}
              {form.loading ? 'Đang gửi...' : me.role === 'admin' ? 'Thêm' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MemberSearchProps {
  open: boolean;
  onClose: () => void;
}

export function MemberSearch({ open, onClose }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<User[]>([]);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const { user: me } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string) => {
    const params = q ? `?q=${encodeURIComponent(q)}` : '';
    const data = await api.get<User[]>(`/users${params}`);
    setAll(data);
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsers('');
      setSentTo(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setAll([]);
    }
  }, [open, fetchUsers]);

  const handleQuery = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(v), 300);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !me) return null;

  const results = all.filter(u => u.id !== me.id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-b-2xl sm:rounded-2xl sm:mt-16 shadow-2xl flex flex-col max-h-[85dvh]">

        {/* Header search */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Tìm thành viên theo tên..."
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <button onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
              {query ? 'Không tìm thấy thành viên nào' : 'Nhập tên để tìm kiếm'}
            </div>
          ) : (
            results.map(member => (
              <div key={member.id} className={sentTo.has(member.id) ? 'opacity-50 pointer-events-none' : ''}>
                <MemberCard
                  member={member}
                  me={me}
                  onRequestSent={id => setSentTo(prev => new Set([...prev, id]))}
                />
                {sentTo.has(member.id) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
                    ✓ Đã gửi yêu cầu
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
