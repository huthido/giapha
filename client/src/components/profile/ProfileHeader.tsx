import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Edit2, Save, X, MessageCircle, Phone, Video, Baby, MapPin, Briefcase, Heart, KeyRound } from 'lucide-react';
import type { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { ProfileEditForm } from './ProfileEditForm';
import { formatDate, mediaUrl } from '../../lib/utils';

interface FormData {
  name: string; bio: string; date_of_birth: string; death_date: string;
  phone: string; address: string; gender: string; hometown: string; occupation: string;
}

interface ProfileHeaderProps {
  profile: User;
  isMe: boolean;         // true nếu là chính mình HOẶC người tạo tài khoản con
  isManagedByMe?: boolean;  // true khi đang xem tài khoản con của mình
  isOnline: boolean;
  editing: boolean;
  form: FormData;
  onFormChange: (key: keyof FormData, value: string) => void;
  onSave: () => void;
  onEditToggle: () => void;
  onCancelEdit: () => void;
  onAvatarUpload: (file: File) => void;
  onCoverUpload: (file: File) => void;
  onChat: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onGrantLogin?: () => void;  // hiện nút cấp đăng nhập cho tài khoản được quản lý
}

export function ProfileHeader({
  profile, isMe, isManagedByMe = false, isOnline, editing, form, onFormChange,
  onSave, onEditToggle, onCancelEdit,
  onAvatarUpload, onCoverUpload,
  onChat, onAudioCall, onVideoCall, onGrantLogin,
}: ProfileHeaderProps) {
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const pickFile = (cb: (f: File) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) cb(f); e.target.value = ''; };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
      {/* Cover */}
      <div className="relative h-40 bg-gradient-to-r from-amber-400 to-orange-400 group">
        {profile.cover_photo && (
          <img src={mediaUrl(profile.cover_photo)} alt="" className="w-full h-full object-cover" />
        )}
        {isMe && (
          <button onClick={() => coverRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/40 text-white px-3 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <Camera size={12} /> Đổi ảnh bìa
          </button>
        )}
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={pickFile(onCoverUpload)} />
      </div>

      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          {/* Avatar */}
          <div className="relative group">
            <Avatar src={profile.avatar} name={profile.name} size="xl"
              online={isOnline} className="border-4 border-white dark:border-gray-900 shadow-md ring-2 ring-amber-200 dark:ring-amber-800" />
            {isMe && (
              <button onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </button>
            )}
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={pickFile(onAvatarUpload)} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isMe ? (
              editing ? (
                <>
                  <button onClick={onSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
                    <Save size={14} /> Lưu
                  </button>
                  <button onClick={onCancelEdit}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  {onGrantLogin && (
                    <button onClick={onGrantLogin}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
                      <KeyRound size={14} /> Cấp đăng nhập
                    </button>
                  )}
                  <button onClick={onEditToggle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                </>
              )
            ) : (
              <>
                <button onClick={onChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors">
                  <MessageCircle size={14} /> Nhắn tin
                </button>
                <button onClick={onAudioCall}
                  className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors">
                  <Phone size={16} />
                </button>
                <button onClick={onVideoCall}
                  className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors">
                  <Video size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info / Edit form */}
        {editing ? (
          <div className="space-y-3">
            {isManagedByMe && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                <Baby size={13} />
                Bạn đang chỉnh sửa thông tin cho <strong>{profile.name}</strong>
              </div>
            )}
            <ProfileEditForm form={form} onChange={onFormChange} />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{profile.name}</h1>
              {profile.relation && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                  {profile.relation}
                </span>
              )}
              {profile.managed_by && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                  <Baby size={10} /> Tài khoản được quản lý
                </span>
              )}
            </div>
            {profile.bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.bio}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
              {profile.gender && <span>{profile.gender === 'nam' ? '♂' : profile.gender === 'nữ' ? '♀' : '⚧'} {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</span>}
              {profile.date_of_birth && <span>🎂 {formatDate(profile.date_of_birth)}</span>}
              {profile.death_date && <span>🕊️ {formatDate(profile.death_date)}</span>}
              {profile.occupation && <span className="flex items-center gap-1"><Briefcase size={11} /> {profile.occupation}</span>}
              {profile.hometown && <span className="flex items-center gap-1"><MapPin size={11} /> {profile.hometown}</span>}
              {profile.address && <span className="flex items-center gap-1"><Heart size={11} /> {profile.address}</span>}
              {profile.phone && <span>📞 {profile.phone}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
