import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PostCard } from '../components/feed/PostCard';
import { Lightbox } from '../components/ui/Lightbox';
import { api } from '../lib/api';
import type { User, Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../components/ui/Toast';
import { parseJSON, isVideoUrl, mediaUrl } from '../lib/utils';

interface FormData {
  name: string; bio: string; date_of_birth: string; phone: string; address: string;
}

export function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me, updateUser } = useAuth();
  const { callUser } = useCall();
  const { onlineUsers } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isMe = userId === me?.id;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // Người tạo tài khoản managed cũng có quyền chỉnh sửa
  const isManagedByMe = !isMe && !!profile?.managed_by && profile.managed_by === me?.id;
  const isEditable = isMe || isManagedByMe;
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormData>({ name: '', bio: '', date_of_birth: '', phone: '', address: '' });
  const [activeTab, setActiveTab] = useState<'posts' | 'photos'>('posts');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get<User & { posts: Post[] }>(`/users/${userId}`)
      .then(data => {
        const { posts: ps, ...u } = data;
        setProfile(u);
        setPosts(ps);
        setForm({ name: u.name, bio: u.bio || '', date_of_birth: u.date_of_birth || '', phone: u.phone || '', address: u.address || '' });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    try {
      const updated = await api.put<User>(`/users/${userId}`, form);
      setProfile(updated);
      if (isMe) updateUser(updated);
      setEditing(false);
      showToast('Đã cập nhật hồ sơ', 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleAvatarUpload = async (file: File) => {
    const fd = new FormData(); fd.append('avatar', file);
    try {
      const { url } = await api.upload<{ url: string }>(`/users/${userId}/avatar`, fd);
      setProfile(p => p ? { ...p, avatar: url } : p);
      if (isMe) updateUser({ ...me!, avatar: url });
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleCoverUpload = async (file: File) => {
    const fd = new FormData(); fd.append('cover', file);
    try {
      const { url } = await api.upload<{ url: string }>(`/users/${userId}/cover`, fd);
      setProfile(p => p ? { ...p, cover_photo: url } : p);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleChat = async () => {
    if (!profile) return;
    const conv = await api.post<{ id: string }>('/conversations', { type: 'direct', memberIds: [profile.id] });
    navigate(`/chat?conv=${conv.id}`);
  };

  // Calls need a real conversation id (an empty one makes all calls share one room).
  const handleCall = async (type: 'audio' | 'video') => {
    if (!profile) return;
    try {
      const conv = await api.post<{ id: string }>('/conversations', { type: 'direct', memberIds: [profile.id] });
      callUser(profile.id, conv.id, type);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-gray-400 dark:text-gray-500">Không tìm thấy người dùng</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <ProfileHeader
          profile={profile}
          isMe={isEditable}
          isManagedByMe={isManagedByMe}
          isOnline={onlineUsers.has(profile.id)}
          editing={editing}
          form={form}
          onFormChange={(key, value) => setForm(f => ({ ...f, [key]: value }))}
          onSave={handleSave}
          onEditToggle={() => setEditing(true)}
          onCancelEdit={() => setEditing(false)}
          onAvatarUpload={handleAvatarUpload}
          onCoverUpload={handleCoverUpload}
          onChat={handleChat}
          onAudioCall={() => handleCall('audio')}
          onVideoCall={() => handleCall('video')}
        />

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-4">
          {(['posts', 'photos'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 min-h-[48px] touch-manipulation ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {tab === 'posts' ? 'Bài viết' : 'Ảnh'}
            </button>
          ))}
        </div>

        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0
              ? <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Chưa có bài viết nào</div>
              : posts.map(post => (
                <PostCard key={post.id} post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
              ))
            }
          </div>
        )}

        {activeTab === 'photos' && (() => {
          const photos = posts.flatMap(p => parseJSON<string[]>(p.media, []).filter(u => !isVideoUrl(u)));
          return photos.length === 0
            ? <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Chưa có ảnh nào</div>
            : (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((url, idx) => (
                  <div key={idx}
                    className="aspect-square rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800"
                    onClick={() => setLightboxSrc(mediaUrl(url))}>
                    <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                  </div>
                ))}
              </div>
            );
        })()}
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </AppLayout>
  );
}
