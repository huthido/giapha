export interface User {
  id: string;
  name: string;
  email?: string;
  role?: 'admin' | 'member';
  avatar: string | null;
  cover_photo: string | null;
  bio: string | null;
  date_of_birth: string | null;
  death_date: string | null;
  phone: string | null;
  address: string | null;
  gender: string | null;
  hometown: string | null;
  occupation: string | null;
  created_at: string;
  relation?: string | null;
  managed_by?: string | null;
}

export interface FamilyNode {
  id: string;
  user_id: string;
  parent_node_id: string | null;
  spouse_node_id: string | null;
  generation: number;
  pos_x: number;
  pos_y: number;
  name: string;
  avatar: string | null;
  bio: string | null;
  date_of_birth: string | null;
  managed_by: string | null;
}

export interface Relationship {
  id: string;
  user_id: string;
  related_user_id: string;
  relation_type: string;
  user_name: string;
  related_name: string;
  from_node_id: string;
  to_node_id: string;
}

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string | null;
  media: string;
  reaction_count: number;
  comment_count: number;
  my_reaction: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string | null;
  media: string;
  type: 'text' | 'image' | 'video' | 'file' | 'call';
  read_by: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  avatar: string | null;
  created_by: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  members: Pick<User, 'id' | 'name' | 'avatar'>[];
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
  type: 'family' | 'personal';
  photo_count: number;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  uploader_id: string;
  uploader_name: string;
  uploader_avatar: string | null;
  url: string;
  caption: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: string;
  read: number;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  description: string | null;
  root_user_id: string;
  root_name: string;
  root_avatar: string | null;
  created_by: string;
  created_at: string;
}

export interface FamilyEvent {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  description: string | null;
  type: 'family' | 'personal';
  user_id: string | null;
  user_name: string | null;
  user_avatar: string | null;
  creator_name: string;
  created_by: string;
  created_at: string;
}

export interface IncomingCall {
  from: string;
  caller: Pick<User, 'id' | 'name' | 'avatar'>;
  convId: string;
  type: 'audio' | 'video';
}
