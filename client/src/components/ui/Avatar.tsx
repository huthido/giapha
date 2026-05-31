import { getInitials, mediaUrl } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const dotSizes = { xs: 'w-1.5 h-1.5', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' };

export function Avatar({ src, name, size = 'md', online, className = '' }: AvatarProps) {
  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div className={`${sizes[size]} rounded-full overflow-hidden bg-amber-500 flex items-center justify-center text-white font-semibold`}>
        {src
          ? <img src={mediaUrl(src)} alt={name} className="w-full h-full object-cover" />
          : <span>{getInitials(name)}</span>
        }
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 block rounded-full border-2 border-white dark:border-gray-900 ${online ? 'bg-green-500' : 'bg-gray-400'} ${dotSizes[size]}`} />
      )}
    </div>
  );
}
