import type { Message } from '../../types';
import { Avatar } from '../ui/Avatar';
import { formatTime, parseJSON } from '../../lib/utils';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onImageClick: (url: string) => void;
}

export function MessageBubble({ message, isMe, onImageClick }: MessageBubbleProps) {
  const media: string[] = parseJSON(message.media, []);

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      {!isMe && (
        <Avatar src={message.sender_avatar} name={message.sender_name} size="xs" />
      )}
      <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {media.length > 0 && (
          <div className={`grid gap-1 ${media.length > 1 ? 'grid-cols-2' : ''}`}>
            {media.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                onClick={() => onImageClick(url)}
                className="rounded-xl max-w-[200px] max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            ))}
          </div>
        )}
        {message.content && (
          <div className={`px-3 py-2 rounded-2xl text-sm ${
            isMe
              ? 'bg-amber-500 dark:bg-amber-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-bl-sm shadow-sm'
          }`}>
            {message.content}
          </div>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
