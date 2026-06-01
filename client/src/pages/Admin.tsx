import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Search, Trash2, ChevronDown, ChevronUp, Baby } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../lib/utils';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  date_of_birth: string | null;
  phone: string | null;
  address: string | null;
  role: 'admin' | 'member';
  created_at: string;
  managed_by: string | null;
  gender: string | null;
  hometown: string | null;
  occupation: string | null;
}

function MemberRow({ member, isSelf, adminCount, onRoleChange, onDelete }: {
  member: Member;
  isSelf: boolean;
  adminCount: number;
  onRoleChange: (id: string, role: 'admin' | 'member') => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLastAdmin = member.role === 'admin' && adminCount <= 1;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar src={member.avatar} name={member.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {member.name}
              {isSelf && <span className="text-gray-400 font-normal ml-1">(bạn)</span>}
              {member.managed_by && <span className="ml-1"><Baby size={12} className="inline text-blue-400" /></span>}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              member.role === 'admin'
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {member.role === 'admin' && <Shield size={10} />}
              {member.role === 'admin' ? 'Admin' : 'Thành viên'}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.email}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {member.role === 'admin' ? (
            <button onClick={() => onRoleChange(member.id, 'member')}
              disabled={isSelf || isLastAdmin}
              title={isSelf ? 'Không thể đổi vai trò của chính mình' : isLastAdmin ? 'Phải có ít nhất 1 admin' : ''}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ShieldOff size={13} /> Thu hồi
            </button>
          ) : (
            <button onClick={() => onRoleChange(member.id, 'admin')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-white bg-amber-500 hover:bg-amber-600 transition-colors">
              <Shield size={13} /> Cấp quyền
            </button>
          )}

          {!isSelf && (
            <button onClick={() => onDelete(member.id, member.name)}
              className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
          {member.phone      && <span>📞 {member.phone}</span>}
          {member.date_of_birth && <span>🎂 {formatDate(member.date_of_birth)}</span>}
          {member.gender     && <span>⚧ {member.gender}</span>}
          {member.hometown   && <span>🏠 {member.hometown}</span>}
          {member.occupation && <span>💼 {member.occupation}</span>}
          {member.address    && <span>📍 {member.address}</span>}
          <span className="text-gray-400 dark:text-gray-600">Tham gia: {formatDate(member.created_at)}</span>
          {member.managed_by && <span className="text-blue-400">Tài khoản con</span>}
        </div>
      )}
    </div>
  );
}

export function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'member'>('all');

  useEffect(() => {
    api.get<Member[]>('/users')
      .then(setMembers)
      .catch((e: any) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const adminCount = members.filter(m => m.role === 'admin').length;

  const changeRole = async (id: string, role: 'admin' | 'member') => {
    try {
      await api.put(`/users/${id}/role`, { role });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
      showToast(role === 'admin' ? 'Đã cấp quyền admin' : 'Đã thu hồi quyền admin', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Xóa tài khoản "${name}"? Thao tác này không thể hoàn tác.`)) return;
    try {
      await api.delete(`/users/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      showToast(`Đã xóa tài khoản ${name}`, 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const filtered = members
    .filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()) || m.email?.toLowerCase().includes(query.toLowerCase()))
    .filter(m => filter === 'all' || m.role === filter);

  return (
    <AppLayout title="Quản lý thành viên">
      <div className="px-4 sm:px-6 py-5 sm:py-6 max-w-3xl mx-auto">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {(['all', 'admin', 'member'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {f === 'all' ? `Tất cả (${members.length})` : f === 'admin' ? `Admin (${adminCount})` : `Thành viên (${members.length - adminCount})`}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-16">Không tìm thấy thành viên</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <MemberRow key={m.id} member={m} isSelf={m.id === user?.id} adminCount={adminCount}
                onRoleChange={changeRole} onDelete={deleteMember} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
