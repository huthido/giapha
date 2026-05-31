import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Image, X, Send, Video, Link } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { Post } from '../../types';
import { useToast } from '../ui/Toast';
import { youtubeId } from '../../lib/utils';

interface CreatePostProps { onPost: (post: Post) => void; }

export function CreatePost({ onPost }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    selected.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const hasContent = content.trim() || files.length > 0 || videoUrl.trim();

  const handleSubmit = async () => {
    if (!hasContent) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach(f => formData.append('media', f));
      if (videoUrl.trim()) formData.append('videoUrls', videoUrl.trim());
      const post = await api.upload<Post>('/posts', formData);
      onPost(post);
      setContent(''); setFiles([]); setPreviews([]);
      setVideoUrl(''); setShowVideoInput(false);
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  if (!user) return null;

  const ytId = youtubeId(videoUrl);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-5">
      <div className="flex gap-3">
        <Avatar src={user.avatar} name={user.name} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`${user.name} ơi, bạn đang nghĩ gì thế?`}
            rows={3}
            className="w-full resize-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent focus:outline-none"
          />

          {/* Ảnh preview */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {previews.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Video URL input */}
          {showVideoInput && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Link size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="Dán link YouTube, Vimeo, TikTok..."
                  className="flex-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
                <button onClick={() => { setVideoUrl(''); setShowVideoInput(false); }}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={14} />
                </button>
              </div>
              {/* YouTube thumbnail preview */}
              {ytId && (
                <img
                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt="YouTube thumbnail"
                  className="w-full rounded-xl object-cover max-h-48"
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-1">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 min-h-[40px]">
                <Image size={17} />
                <span className="hidden sm:inline">Ảnh</span>
              </button>
              <button onClick={() => setShowVideoInput(s => !s)}
                className={`flex items-center gap-1.5 text-sm transition-colors px-3 py-2 rounded-lg min-h-[40px] ${
                  showVideoInput
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                    : 'text-gray-500 dark:text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}>
                <Video size={17} />
                <span className="hidden sm:inline">Video URL</span>
              </button>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
            <button onClick={handleSubmit} disabled={loading || !hasContent}
              className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-medium transition-colors min-h-[40px]">
              <Send size={15} />
              {loading ? 'Đang đăng...' : 'Đăng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
