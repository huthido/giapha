import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

export function registerChatHandlers(io: Server, socket: Socket, userId: string) {
  socket.on('join-conversation', (convId: string) => {
    const isMember = db.prepare(
      'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
    ).get(convId, userId);
    if (isMember) socket.join(`conv:${convId}`);
  });

  socket.on('leave-conversation', (convId: string) => {
    socket.leave(`conv:${convId}`);
  });

  socket.on('send-message', (data: {
    convId: string;
    content?: string;
    media?: string[];
    type?: string;
  }) => {
    const isMember = db.prepare(
      'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
    ).get(data.convId, userId);
    if (!isMember) return;

    const id = uuidv4();
    db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, content, media, type, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id, data.convId, userId,
      data.content || null,
      JSON.stringify(data.media || []),
      data.type || 'text',
      JSON.stringify([userId])
    );

    const message = db.prepare(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?`
    ).get(id);

    io.to(`conv:${data.convId}`).emit('new-message', message);
  });

  socket.on('typing', (data: { convId: string }) => {
    socket.to(`conv:${data.convId}`).emit('user-typing', { convId: data.convId, userId });
  });

  socket.on('stop-typing', (data: { convId: string }) => {
    socket.to(`conv:${data.convId}`).emit('user-stop-typing', { convId: data.convId, userId });
  });

  socket.on('mark-read', (convId: string) => {
    db.prepare(
      `UPDATE messages SET read_by = json_insert(read_by, '$[#]', ?)
       WHERE conversation_id = ? AND NOT (read_by LIKE '%' || ? || '%') AND sender_id != ?`
    ).run(userId, convId, userId, userId);
    socket.to(`conv:${convId}`).emit('messages-read', { convId, userId });
  });
}
