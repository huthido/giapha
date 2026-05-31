import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Search } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

interface Member {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  date_of_birth: string | null;
  role: 'admin' | 'member';
}

export function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Member[]>('/users')
      .then(setMembers)
      .catch((err: any) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const adminCount = members.filter(m => m.role === 'admin').length;

  const changeRole = async (member: Member, role: 'admin' | 'member') => {
    setSavingId(member.id);
    try {
      await api.put(`/users/${member.id}/role`, { role });
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, role } : m)));
      showToast(
        role === 'admin'
          ? `Đã cấp quyền quản trị cho ${member.name}`
          : `Đã thu hồi quyền quản trị của ${member.name}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setSavingId(null);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <AppLayout title="Quản lý thành viên">
      <div className="px-4 sm:px-6 py-5 sm:py-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {members.length} thành viên · {adminCount} quản trị viên
          </p>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm thành viên..."
              className="pl-9 pr-3 py-2 w-56 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-16">Không tìm thấy thành viên</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(member => {
              const isSelf = member.id === user?.id;
              const isLastAdmin = member.role === 'admin' && adminCount <= 1;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl"
                >
                  <Avatar src={member.avatar} name={member.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {member.name}
                      {isSelf && <span className="text-gray-400 font-normal"> (bạn)</span>}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'admin'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {member.role === 'admin' ? <Shield size={11} /> : null}
                      {member.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                    </span>
                  </div>

                  {member.role === 'admin' ? (
                    <button
                      onClick={() => changeRole(member, 'member')}
                      disabled={isSelf || isLastAdmin || savingId === member.id}
                      title={
                        isSelf ? 'Không thể đổi vai trò của chính mình'
                          : isLastAdmin ? 'Phải có ít nhất một quản trị viên' : ''
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShieldOff size={14} /> Thu hồi
                    </button>
                  ) : (
                    <button
                      onClick={() => changeRole(member, 'admin')}
                      disabled={savingId === member.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      <Shield size={14} /> Cấp quyền
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
