import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

const activeRooms = new Map<string, Set<string>>();

export function registerCallHandlers(io: Server, socket: Socket, userId: string) {
  socket.on('call-user', (data: { to: string; convId: string; type: 'audio' | 'video' }) => {
    // Only let a caller ring someone they actually share a conversation with.
    const sharesConversation = db.prepare(
      `SELECT 1 FROM conversation_members a
       JOIN conversation_members b ON a.conversation_id = b.conversation_id
       WHERE a.user_id = ? AND b.user_id = ? LIMIT 1`
    ).get(userId, data.to);
    if (!sharesConversation) return;

    const callerInfo = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(userId);
    io.to(`user:${data.to}`).emit('incoming-call', {
      from: userId,
      caller: callerInfo,
      convId: data.convId,
      type: data.type,
    });
  });

  socket.on('call-accepted', (data: { to: string; convId: string }) => {
    io.to(`user:${data.to}`).emit('call-accepted', { from: userId, convId: data.convId });
  });

  socket.on('call-declined', (data: { to: string }) => {
    io.to(`user:${data.to}`).emit('call-declined', { from: userId });
  });

  socket.on('call-ended', (data: { to?: string; convId: string; duration?: number }) => {
    if (data.to) {
      io.to(`user:${data.to}`).emit('call-ended', { from: userId });
    }
    const room = activeRooms.get(data.convId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) activeRooms.delete(data.convId);
    }
  });

  socket.on('join-call-room', (convId: string) => {
    socket.join(`call:${convId}`);
    if (!activeRooms.has(convId)) activeRooms.set(convId, new Set());
    activeRooms.get(convId)!.add(userId);
    const others = [...(activeRooms.get(convId) || [])].filter(id => id !== userId);
    socket.emit('room-users', { convId, users: others });
    socket.to(`call:${convId}`).emit('user-joined-call', { userId, convId });
  });

  socket.on('leave-call-room', (convId: string) => {
    socket.leave(`call:${convId}`);
    const room = activeRooms.get(convId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) activeRooms.delete(convId);
    }
    socket.to(`call:${convId}`).emit('user-left-call', { userId, convId });
  });

  socket.on('webrtc-offer', (data: { to: string; offer: object; convId: string }) => {
    io.to(`user:${data.to}`).emit('webrtc-offer', { from: userId, offer: data.offer, convId: data.convId });
  });

  socket.on('webrtc-answer', (data: { to: string; answer: object; convId: string }) => {
    io.to(`user:${data.to}`).emit('webrtc-answer', { from: userId, answer: data.answer, convId: data.convId });
  });

  socket.on('webrtc-ice-candidate', (data: { to: string; candidate: object; convId: string }) => {
    io.to(`user:${data.to}`).emit('webrtc-ice-candidate', { from: userId, candidate: data.candidate, convId: data.convId });
  });

  socket.on('disconnecting', () => {
    for (const [convId, room] of activeRooms.entries()) {
      if (room.has(userId)) {
        room.delete(userId);
        socket.to(`call:${convId}`).emit('user-left-call', { userId, convId });
        if (room.size === 0) activeRooms.delete(convId);
      }
    }
  });
}
