import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Trash2 } from 'lucide-react';
import type { Post, Comment } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Lightbox } from '../ui/Lightbox';
import { ReactionPicker } from './ReactionPicker';
import { MediaGallery } from './MediaGallery';
import { CommentSection } from './CommentSection';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime, REACTION_EMOJIS, parseJSON } from '../../lib/utils';
import { useToast } from '../ui/Toast';

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [myReaction, setMyReaction] = useState<string | null>(post.my_reaction);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const media: string[] = parseJSON(post.media, []);

  const handleReaction = async (type: string) => {
    setPickerVisible(false);
    const prev = myReaction;
    const prevCount = reactionCount;
    if (myReaction === type) {
      setMyReaction(null);
      setReactionCount(c => c - 1);
    } else {
      if (!myReaction) setReactionCount(c => c + 1);
      setMyReaction(type);
    }
    try {
      await api.post(`/posts/${post.id}/reactions`, { type });
    } catch {
      setMyReaction(prev);
      setReactionCount(prevCount);
    }
  };

  const loadComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const cs = await api.get<Comment[]>(`/posts/${post.id}/comments`);
        setComments(cs);
      } catch {}
    }
    setShowComments(s => !s);
  };

  const submitComment = async (text: string) => {
    try {
      const c = await api.post<Comment>(`/posts/${post.id}/comments`, { content: text });
      setComments(prev => [...prev, c]);
      setCommentCount(n => n + 1);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!confirm('Xóa bài viết này?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      onDelete(post.id);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <Link to={`/profile/${post.author_id}`} className="flex items-center gap-3 hover:opacity-80">
            <Avatar src={post.author_avatar} name={post.author_name} />
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{post.author_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatTime(post.created_at)}</p>
            </div>
          </Link>
          {user?.id === post.author_id && (
            <button onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {post.content && (
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        )}
      </div>

      <MediaGallery media={media} onClick={setLightboxSrc} />

      {/* Stats */}
      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-gray-800">
        {reactionCount > 0 && <span>{reactionCount} cảm xúc</span>}
        <button onClick={loadComments} className="ml-auto hover:text-gray-600 dark:hover:text-gray-300">
          {commentCount} bình luận
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 sm:px-4 py-1.5 flex gap-1 border-t border-gray-100 dark:border-gray-800">
        <div className="relative flex-1">
          <button
            onMouseEnter={() => setPickerVisible(true)}
            onMouseLeave={() => setPickerVisible(false)}
            onClick={() => handleReaction('like')}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              myReaction
                ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-base">{myReaction ? REACTION_EMOJIS[myReaction] : '👍'}</span>
            {myReaction ? myReaction.charAt(0).toUpperCase() + myReaction.slice(1) : 'Thích'}
          </button>
          <ReactionPicker
            visible={pickerVisible}
            onReact={handleReaction}
            onMouseEnter={() => setPickerVisible(true)}
            onMouseLeave={() => setPickerVisible(false)}
          />
        </div>
        <button onClick={loadComments}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <MessageCircle size={18} />
          Bình luận
        </button>
      </div>

      {showComments && (
        <CommentSection comments={comments} onSubmit={submitComment} />
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
