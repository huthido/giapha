import { useState } from 'react';
import type { Comment } from '../../types';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';

interface CommentSectionProps {
  comments: Comment[];
  onSubmit: (text: string) => void;
}

export function CommentSection({ comments, onSubmit }: CommentSectionProps) {
  const [text, setText] = useState('');
  const { user } = useAuth();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) { onSubmit(text.trim()); setText(''); }
    }
  };

  return (
    <div className="px-4 pb-3 border-t border-gray-50 dark:border-gray-800">
      <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <Avatar src={c.author_avatar} name={c.author_name} size="xs" />
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{c.author_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Avatar src={user?.avatar} name={user?.name || ''} size="xs" />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Bình luận..."
          className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600"
        />
      </div>
    </div>
  );
}
