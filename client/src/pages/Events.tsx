import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarDays, Users, User } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import type { FamilyEvent, User as UserType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { formatDate } from '../lib/utils';

type Tab = 'upcoming' | 'all';

function EventCard({ event, me, onDelete }: { event: FamilyEvent; me: UserType | null; onDelete: () => void }) {
  const canDelete = me?.id === event.created_by || me?.role === 'admin';
  const isPast = event.date < new Date().toISOString().slice(0, 10);
  return (
    <div className={`flex gap-4 p-4 rounded-2xl border transition-colors ${isPast ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50' : 'border-amber-100 dark:border-amber-900/50 bg-white dark:bg-gray-900'}`}>
      {/* Date block */}
      <div className={`flex-shrink-0 w-14 text-center rounded-xl py-2 ${isPast ? 'bg-gray-200 dark:bg-gray-800' : 'bg-amber-500'}`}>
        <p className={`text-xs font-medium ${isPast ? 'text-gray-500 dark:text-gray-400' : 'text-amber-100'}`}>
          {new Date(event.date + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'short' })}
        </p>
        <p className={`text-2xl font-bold leading-none ${isPast ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>
          {new Date(event.date + 'T00:00:00').getDate()}
        </p>
        <p className={`text-xs ${isPast ? 'text-gray-400 dark:text-gray-500' : 'text-amber-100'}`}>
          {new Date(event.date + 'T00:00:00').getFullYear()}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              event.type === 'family'
                ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
            }`}>
              {event.type === 'family' ? <Users size={10} className="inline mr-1" /> : <User size={10} className="inline mr-1" />}
              {event.type === 'family' ? 'Gia đình' : 'Cá nhân'}
            </span>
            {event.end_date && event.end_date !== event.date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">→ {formatDate(event.end_date)}</span>
            )}
          </div>
          {canDelete && (
            <button onClick={onDelete}
              className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex-shrink-0">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mt-1">{event.title}</h3>

        {event.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{event.description}</p>
        )}

        {event.user_name && (
          <div className="flex items-center gap-1.5 mt-2">
            <Avatar src={event.user_avatar} name={event.user_name} size="xs" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{event.user_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Events() {
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<UserType[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    title: '', date: '', end_date: '', description: '',
    type: 'family' as 'family' | 'personal', user_id: '',
  });

  const load = async (t: Tab) => {
    setLoading(true);
    const params = t === 'upcoming' ? '?upcoming=true' : '';
    const data = await api.get<FamilyEvent[]>(`/events${params}`);
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    if (showCreate) api.get<UserType[]>('/users').then(setMembers);
  }, [showCreate]);

  const handleCreate = async () => {
    try {
      const payload: any = { ...form };
      if (!payload.end_date) delete payload.end_date;
      if (!payload.description) delete payload.description;
      if (payload.type !== 'personal') delete payload.user_id;
      const ev = await api.post<FamilyEvent>('/events', payload);
      setShowCreate(false);
      setForm({ title: '', date: '', end_date: '', description: '', type: 'family', user_id: '' });
      if (tab === 'upcoming' && ev.date >= new Date().toISOString().slice(0, 10)) {
        setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)));
      } else if (tab === 'all') {
        setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)));
      }
      showToast('Đã thêm sự kiện', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá sự kiện này?')) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <AppLayout title="Sự kiện">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {(['upcoming', 'all'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {t === 'upcoming' ? 'Sắp tới' : 'Tất cả'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Thêm sự kiện
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {tab === 'upcoming' ? 'Không có sự kiện sắp tới' : 'Chưa có sự kiện nào'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <EventCard key={ev.id} event={ev} me={user} onDelete={() => handleDelete(ev.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Thêm sự kiện" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tiêu đề *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="VD: Giỗ ông nội, Đám cưới, Tết Nguyên Đán..."
              className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ngày bắt đầu *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ngày kết thúc</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                min={form.date} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Loại</label>
            <div className="flex gap-2">
              {(['family', 'personal'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t, user_id: '' }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    form.type === t ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}>
                  {t === 'family' ? <><Users size={14} /> Gia đình</> : <><User size={14} /> Cá nhân</>}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'personal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gắn với người</label>
              <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                className={inputClass}>
                <option value="">-- Chọn thành viên --</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ghi chú</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Mô tả thêm về sự kiện..."
              className={`${inputClass} resize-none`} />
          </div>

          <button onClick={handleCreate} disabled={!form.title.trim() || !form.date}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors">
            Lưu sự kiện
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
