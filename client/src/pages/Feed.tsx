import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { CreatePost } from '../components/feed/CreatePost';
import { PostCard } from '../components/feed/PostCard';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import type { Post, User } from '../types';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get<Post[]>('/posts'),
      api.get<User[]>('/users'),
    ]).then(([ps, ms]) => {
      setPosts(ps);
      setMembers(ms.filter(m => m.id !== user?.id).slice(0, 8));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Trang chủ">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {members.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-4">
            <div className="flex gap-4 overflow-x-auto pb-1">
              {members.map(m => (
                <Link key={m.id} to={`/profile/${m.id}`}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 group">
                  <Avatar src={m.avatar} name={m.name} size="lg" online={onlineUsers.has(m.id)} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors max-w-[56px] truncate text-center">
                    {m.name.split(' ').pop()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <CreatePost onPost={p => setPosts(prev => [p, ...prev])} />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-48 animate-pulse border border-gray-100 dark:border-gray-800" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌳</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có bài viết nào. Hãy chia sẻ điều gì đó!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map(post => (
              <PostCard key={post.id} post={post} onDelete={id => setPosts(prev => prev.filter(p => p.id !== id))} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
