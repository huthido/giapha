import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Server } from 'socket.io';
import db from '../db/database';
import { verifyJWT, isAdmin, AuthRequest } from '../middleware/auth';
import { buildGraph, findPath, composePath } from '../lib/inferRelation';

let _io: Server | null = null;
export function setFamilyIO(io: Server) { _io = io; }

const router = Router();

/** A node may be edited by the member it represents, or by any admin. */
// GET /family/infer/:targetUserId  — infer kinship between current user and target
router.get('/infer/:targetUserId', verifyJWT, (req: AuthRequest, res: Response): void => {
  const from = req.userId!;
  const to   = String(req.params.targetUserId);
  if (from === to) { res.json({ term: '(chính bạn)', description: '', path: [] }); return; }

  const rels = db.prepare(
    'SELECT user_id, related_user_id, relation_type FROM relationships'
  ).all() as { user_id: string; related_user_id: string; relation_type: string }[];

  const graph = buildGraph(rels);
  const path  = findPath(from, to, graph);

  if (!path) { res.json({ term: null, description: 'Chưa có mối quan hệ nào được khai báo', path: [] }); return; }

  const nodeIds = path.map(s => s.userId);
  const users = nodeIds.length
    ? (db.prepare(`SELECT id, name FROM users WHERE id IN (${nodeIds.map(() => '?').join(',')})`)
         .all(nodeIds) as { id: string; name: string }[])
    : [];
  const nameOf = new Map(users.map(u => [u.id, u.name]));

  const { term, description } = composePath(path);
  const namedPath = path.map(s => ({ name: nameOf.get(s.userId) ?? s.userId, via: s.via }));

  res.json({ term, description, path: namedPath });
});

// GET /family/infer-between?from=userId&to=userId — giữa bất kỳ hai người
router.get('/infer-between', verifyJWT, (req: AuthRequest, res: Response): void => {
  const from = String(req.query.from ?? '');
  const to   = String(req.query.to   ?? '');
  if (!from || !to) { res.status(400).json({ error: 'Cần from và to' }); return; }
  if (from === to)  { res.json({ term: '(cùng một người)', description: '', path: [], fromName: '', toName: '' }); return; }

  const rels = db.prepare(
    'SELECT user_id, related_user_id, relation_type FROM relationships'
  ).all() as { user_id: string; related_user_id: string; relation_type: string }[];

  const graph = buildGraph(rels);
  const path  = findPath(from, to, graph);

  // Lấy tên tất cả người trong đường đi + điểm đầu/cuối
  const allIds = [from, to, ...(path ?? []).map(s => s.userId)];
  const users = (db.prepare(
    `SELECT id, name, avatar FROM users WHERE id IN (${allIds.map(() => '?').join(',')})`
  ).all(...allIds)) as { id: string; name: string; avatar: string | null }[];
  const infoOf = new Map(users.map(u => [u.id, u]));

  if (!path) {
    res.json({ term: null, description: 'Không tìm thấy đường quan hệ', path: [],
      fromName: infoOf.get(from)?.name ?? from, fromAvatar: infoOf.get(from)?.avatar ?? null,
      toName: infoOf.get(to)?.name ?? to,     toAvatar: infoOf.get(to)?.avatar ?? null,
    });
    return;
  }

  const { term, description } = composePath(path);
  // namedPath: mỗi bước gồm tên người TẠI điểm đó và nhãn quan hệ đến bước tiếp
  const namedPath = path.map(s => ({
    name:   infoOf.get(s.userId)?.name   ?? s.userId,
    avatar: infoOf.get(s.userId)?.avatar ?? null,
    via:    s.via,
  }));

  res.json({
    term, description, path: namedPath,
    fromName: infoOf.get(from)?.name ?? from, fromAvatar: infoOf.get(from)?.avatar ?? null,
    toName:   infoOf.get(to)?.name   ?? to,   toAvatar:   infoOf.get(to)?.avatar   ?? null,
  });
});

function canEditNode(nodeId: string, userId: string | undefined): boolean {
  if (isAdmin(userId)) return true;
  const node = db.prepare('SELECT user_id FROM family_nodes WHERE id = ?').get(nodeId) as { user_id?: string } | undefined;
  return !!node && node.user_id === userId;
}

router.get('/tree', verifyJWT, (_req: AuthRequest, res: Response): void => {
  const nodes = db.prepare(
    `SELECT fn.*, u.name, u.avatar, u.bio, u.date_of_birth, u.managed_by
     FROM family_nodes fn
     JOIN users u ON fn.user_id = u.id
     ORDER BY fn.generation, fn.pos_x`
  ).all();

  const edges = db.prepare(
    `SELECT r.*,
     u1.name as user_name, u2.name as related_name,
     fn1.id as from_node_id, fn2.id as to_node_id
     FROM relationships r
     JOIN users u1 ON r.user_id = u1.id
     JOIN users u2 ON r.related_user_id = u2.id
     JOIN family_nodes fn1 ON fn1.user_id = r.user_id
     JOIN family_nodes fn2 ON fn2.user_id = r.related_user_id`
  ).all();

  res.json({ nodes, edges });
});

router.put('/nodes/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  if (!canEditNode(String(req.params.id), req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const { pos_x, pos_y } = req.body;
  db.prepare('UPDATE family_nodes SET pos_x = ?, pos_y = ? WHERE id = ?')
    .run(pos_x, pos_y, req.params.id);
  res.json({ ok: true });
});

router.post('/relationships', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { user_id, related_user_id, relation_type } = req.body;
  if (!user_id || !related_user_id || !relation_type) {
    res.status(400).json({ error: 'Thiếu thông tin' }); return;
  }
  // You may only declare relationships that involve yourself, unless you're an admin.
  if (!isAdmin(req.userId) && req.userId !== user_id && req.userId !== related_user_id) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }

  const id1 = uuidv4();
  const id2 = uuidv4();
  const reverseMap: Record<string, string> = {
    // Cha mẹ – Con
    'cha': 'con', 'mẹ': 'con', 'cha/mẹ': 'con',
    'con trai': 'cha/mẹ', 'con gái': 'cha/mẹ', 'con': 'cha/mẹ',
    // Vợ chồng
    'vợ': 'chồng', 'chồng': 'vợ',
    // Anh chị em ruột
    'anh': 'em', 'chị': 'em',
    'em trai': 'anh/chị', 'em gái': 'anh/chị', 'em': 'anh/chị',
    // Ông bà – Cháu
    'ông': 'cháu', 'bà': 'cháu',
    'cháu trai': 'ông/bà', 'cháu gái': 'ông/bà', 'cháu': 'ông/bà',
    // Chú bác cô dì cậu (và vợ/chồng của họ)
    'bác': 'cháu',
    'chú': 'cháu', 'thím': 'cháu',
    'cô': 'cháu', 'dượng': 'cháu',
    'dì': 'cháu', 'cậu': 'cháu', 'mợ': 'cháu',
    // Con dâu / Rể  →  bố/mẹ của vợ/chồng
    'rể': 'bố vợ', 'dâu': 'bố chồng',
    // Anh chị em vợ/chồng
    'anh rể': 'em', 'em rể': 'anh/chị',
    'chị dâu': 'em', 'em dâu': 'anh/chị',
    // Anh chị em họ
    'anh họ': 'em họ', 'chị họ': 'em họ', 'em họ': 'anh họ/chị họ',
    // Bố mẹ vợ/chồng
    'bố vợ': 'rể', 'mẹ vợ': 'rể',
    'bố chồng': 'dâu', 'mẹ chồng': 'dâu',
    // Quan hệ nuôi
    'cha nuôi': 'con nuôi', 'mẹ nuôi': 'con nuôi',
    'con nuôi': 'cha/mẹ nuôi', 'con trai nuôi': 'cha/mẹ nuôi', 'con gái nuôi': 'cha/mẹ nuôi',
    'anh nuôi': 'em nuôi', 'chị nuôi': 'em nuôi',
    'em nuôi': 'anh/chị nuôi', 'em trai nuôi': 'anh/chị nuôi', 'em gái nuôi': 'anh/chị nuôi',
  };

  try {
    db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
      .run(id1, user_id, related_user_id, relation_type);
    const reverse = reverseMap[relation_type] || relation_type;
    db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
      .run(id2, related_user_id, user_id, reverse);
    _io?.emit('family:updated');
    res.status(201).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /family/relationships/between/:targetUserId — list all QH from current user → target
router.get('/relationships/between/:targetUserId', verifyJWT, (req: AuthRequest, res: Response): void => {
  const me = req.userId!;
  const target = String(req.params.targetUserId);
  const rows = db.prepare(
    'SELECT id, user_id, related_user_id, relation_type FROM relationships WHERE user_id = ? AND related_user_id = ?'
  ).all(me, target) as { id: string; user_id: string; related_user_id: string; relation_type: string }[];
  res.json(rows);
});

// PUT /family/relationships/:id — sửa relation_type (và cập nhật chiều ngược)
router.put('/relationships/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const rel = db.prepare('SELECT * FROM relationships WHERE id = ?')
    .get(req.params.id) as { id: string; user_id: string; related_user_id: string; relation_type: string } | undefined;
  if (!rel) { res.status(404).json({ error: 'Không tìm thấy quan hệ' }); return; }
  if (!isAdmin(req.userId) && req.userId !== rel.user_id && req.userId !== rel.related_user_id) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const { relation_type } = req.body as { relation_type: string };
  if (!relation_type) { res.status(400).json({ error: 'Thiếu relation_type' }); return; }

  const reverseMap: Record<string, string> = {
    'cha': 'con', 'mẹ': 'con', 'cha/mẹ': 'con',
    'con trai': 'cha/mẹ', 'con gái': 'cha/mẹ', 'con': 'cha/mẹ',
    'vợ': 'chồng', 'chồng': 'vợ',
    'anh': 'em', 'chị': 'em',
    'em trai': 'anh/chị', 'em gái': 'anh/chị', 'em': 'anh/chị',
    'ông': 'cháu', 'bà': 'cháu',
    'cháu trai': 'ông/bà', 'cháu gái': 'ông/bà', 'cháu': 'ông/bà',
    'bác': 'cháu', 'chú': 'cháu', 'thím': 'cháu', 'cô': 'cháu',
    'dì': 'cháu', 'cậu': 'cháu', 'dượng': 'cháu', 'mợ': 'cháu',
    'rể': 'bố vợ', 'dâu': 'bố chồng',
    'anh rể': 'em', 'em rể': 'anh/chị', 'chị dâu': 'em', 'em dâu': 'anh/chị',
    'anh họ': 'em họ', 'chị họ': 'em họ', 'em họ': 'anh họ/chị họ',
    'bố vợ': 'rể', 'mẹ vợ': 'rể', 'bố chồng': 'dâu', 'mẹ chồng': 'dâu',
    'cha nuôi': 'con nuôi', 'mẹ nuôi': 'con nuôi',
    'con nuôi': 'cha/mẹ nuôi', 'con trai nuôi': 'cha/mẹ nuôi', 'con gái nuôi': 'cha/mẹ nuôi',
    'anh nuôi': 'em nuôi', 'chị nuôi': 'em nuôi',
    'em nuôi': 'anh/chị nuôi', 'em trai nuôi': 'anh/chị nuôi', 'em gái nuôi': 'anh/chị nuôi',
  };
  const reverse = reverseMap[relation_type] || relation_type;

  db.prepare('UPDATE relationships SET relation_type = ? WHERE id = ?').run(relation_type, rel.id);
  // Cập nhật chiều ngược (nếu tồn tại)
  db.prepare(
    'UPDATE relationships SET relation_type = ? WHERE user_id = ? AND related_user_id = ?'
  ).run(reverse, rel.related_user_id, rel.user_id);

  _io?.emit('family:updated');
  res.json({ ok: true });
});

// DELETE /family/relationships/id/:id — xóa 1 quan hệ cụ thể (và chiều ngược)
router.delete('/relationships/id/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const rel = db.prepare('SELECT * FROM relationships WHERE id = ?')
    .get(req.params.id) as { id: string; user_id: string; related_user_id: string; relation_type: string } | undefined;
  if (!rel) { res.status(404).json({ error: 'Không tìm thấy quan hệ' }); return; }
  if (!isAdmin(req.userId) && req.userId !== rel.user_id && req.userId !== rel.related_user_id) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  db.prepare('DELETE FROM relationships WHERE id = ?').run(rel.id);
  // Xóa chiều ngược với cùng relation_type hoặc reverse của nó
  db.prepare(
    'DELETE FROM relationships WHERE user_id = ? AND related_user_id = ?'
  ).run(rel.related_user_id, rel.user_id);
  _io?.emit('family:updated');
  res.json({ ok: true });
});

router.delete('/relationships/:userId/:relatedId', verifyJWT, (req: AuthRequest, res: Response): void => {
  if (!isAdmin(req.userId) && req.userId !== req.params.userId && req.userId !== req.params.relatedId) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  db.prepare('DELETE FROM relationships WHERE user_id = ? AND related_user_id = ?')
    .run(req.params.userId, req.params.relatedId);
  db.prepare('DELETE FROM relationships WHERE user_id = ? AND related_user_id = ?')
    .run(req.params.relatedId, req.params.userId);
  _io?.emit('family:updated');
  res.json({ ok: true });
});

// ── Relationship Requests ────────────────────────────────────────────────────

// POST /family/requests — gửi yêu cầu thiết lập quan hệ
router.post('/requests', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { to_user_id, relation_type, message } = req.body as {
    to_user_id: string; relation_type: string; message?: string;
  };
  if (!to_user_id || !relation_type) {
    res.status(400).json({ error: 'Thiếu thông tin' }); return;
  }
  if (to_user_id === req.userId) {
    res.status(400).json({ error: 'Không thể gửi yêu cầu cho chính mình' }); return;
  }
  const target = db.prepare('SELECT id, name FROM users WHERE id = ?').get(to_user_id) as { id: string; name: string } | undefined;
  if (!target) { res.status(404).json({ error: 'Không tìm thấy người dùng' }); return; }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO relationship_requests (id, from_user_id, to_user_id, relation_type, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.userId, to_user_id, relation_type, message ?? null);
  } catch {
    res.status(409).json({ error: 'Yêu cầu này đã tồn tại' }); return;
  }

  // Notify target via socket
  _io?.to(`user:${to_user_id}`).emit('relation-request', { id, from_user_id: req.userId, relation_type });

  // Create a notification row
  const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId) as { name: string } | undefined;
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, data)
    VALUES (?, ?, 'relation_request', ?, ?, ?)
  `).run(
    uuidv4(), to_user_id,
    `Yêu cầu quan hệ từ ${sender?.name ?? 'ai đó'}`,
    `${sender?.name ?? 'Ai đó'} muốn khai báo bạn là ${relation_type} của họ`,
    JSON.stringify({ request_id: id })
  );

  res.status(201).json({ ok: true, id });
});

// GET /family/requests — lấy yêu cầu liên quan đến tôi
router.get('/requests', verifyJWT, (req: AuthRequest, res: Response): void => {
  const received = db.prepare(`
    SELECT rr.*, u.name as from_name, u.avatar as from_avatar
    FROM relationship_requests rr
    JOIN users u ON rr.from_user_id = u.id
    WHERE rr.to_user_id = ? AND rr.status = 'pending'
    ORDER BY rr.created_at DESC
  `).all(req.userId);

  const sent = db.prepare(`
    SELECT rr.*, u.name as to_name, u.avatar as to_avatar
    FROM relationship_requests rr
    JOIN users u ON rr.to_user_id = u.id
    WHERE rr.from_user_id = ? AND rr.status = 'pending'
    ORDER BY rr.created_at DESC
  `).all(req.userId);

  res.json({ received, sent });
});

// PUT /family/requests/:id/accept — chấp nhận yêu cầu
router.put('/requests/:id/accept', verifyJWT, (req: AuthRequest, res: Response): void => {
  const rq = db.prepare('SELECT * FROM relationship_requests WHERE id = ?')
    .get(req.params.id) as any;
  if (!rq) { res.status(404).json({ error: 'Không tìm thấy yêu cầu' }); return; }
  if (rq.to_user_id !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  if (rq.status !== 'pending') { res.status(400).json({ error: 'Yêu cầu đã được xử lý' }); return; }

  const reverseMap: Record<string, string> = {
    'cha': 'con', 'mẹ': 'con', 'cha/mẹ': 'con',
    'con trai': 'cha/mẹ', 'con gái': 'cha/mẹ', 'con': 'cha/mẹ',
    'vợ': 'chồng', 'chồng': 'vợ',
    'anh': 'em', 'chị': 'em', 'em trai': 'anh/chị', 'em gái': 'anh/chị', 'em': 'anh/chị',
    'ông': 'cháu', 'bà': 'cháu', 'cháu trai': 'ông/bà', 'cháu gái': 'ông/bà', 'cháu': 'ông/bà',
    'bác': 'cháu', 'chú': 'cháu', 'thím': 'cháu', 'cô': 'cháu',
    'dì': 'cháu', 'cậu': 'cháu', 'dượng': 'cháu', 'mợ': 'cháu',
    'rể': 'bố vợ', 'dâu': 'bố chồng',
    'bố vợ': 'rể', 'mẹ vợ': 'rể', 'bố chồng': 'dâu', 'mẹ chồng': 'dâu',
    'cha nuôi': 'con nuôi', 'mẹ nuôi': 'con nuôi',
    'con nuôi': 'cha/mẹ nuôi', 'con trai nuôi': 'cha/mẹ nuôi', 'con gái nuôi': 'cha/mẹ nuôi',
    'anh nuôi': 'em nuôi', 'chị nuôi': 'em nuôi',
    'em nuôi': 'anh/chị nuôi', 'em trai nuôi': 'anh/chị nuôi', 'em gái nuôi': 'anh/chị nuôi',
  };

  db.prepare('UPDATE relationship_requests SET status = ? WHERE id = ?').run('accepted', rq.id);
  db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), rq.from_user_id, rq.to_user_id, rq.relation_type);
  const reverse = reverseMap[rq.relation_type] ?? rq.relation_type;
  db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), rq.to_user_id, rq.from_user_id, reverse);

  // Notify the requester
  const accepter = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId) as { name: string } | undefined;
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, body, data) VALUES (?, ?, 'relation_accepted', ?, ?, ?)`)
    .run(uuidv4(), rq.from_user_id,
      `${accepter?.name ?? 'Ai đó'} đã chấp nhận quan hệ`,
      `${accepter?.name ?? 'Ai đó'} xác nhận là ${rq.relation_type} của bạn`,
      JSON.stringify({ relation_type: rq.relation_type }));
  _io?.to(`user:${rq.from_user_id}`).emit('notification', { type: 'relation_accepted' });
  _io?.emit('family:updated');
  res.json({ ok: true });
});

// PUT /family/requests/:id/reject — từ chối yêu cầu
router.put('/requests/:id/reject', verifyJWT, (req: AuthRequest, res: Response): void => {
  const rq = db.prepare('SELECT * FROM relationship_requests WHERE id = ?')
    .get(req.params.id) as any;
  if (!rq) { res.status(404).json({ error: 'Không tìm thấy yêu cầu' }); return; }
  if (rq.to_user_id !== req.userId && !isAdmin(req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  db.prepare('UPDATE relationship_requests SET status = ? WHERE id = ?').run('rejected', rq.id);
  res.json({ ok: true });
});

// ── Managed child accounts ────────────────────────────────────────────────────

// POST /family/children — cha/mẹ tạo tài khoản cho con chưa có tài khoản
router.post('/children', verifyJWT, (req: AuthRequest, res: Response): void => {
  const { name, date_of_birth, relation_type } = req.body as {
    name: string; date_of_birth?: string; relation_type: string;
  };
  if (!name || !relation_type) {
    res.status(400).json({ error: 'Thiếu tên hoặc loại quan hệ' }); return;
  }
  const childId   = uuidv4();
  const nodeId    = uuidv4();
  const internalEmail = `managed_${childId}@family.internal`;
  const dummyHash = `__managed__${childId}`;

  db.prepare(`INSERT INTO users (id, name, email, password, role, date_of_birth, managed_by) VALUES (?, ?, ?, ?, 'member', ?, ?)`)
    .run(childId, name, internalEmail, dummyHash, date_of_birth ?? null, req.userId);
  db.prepare(`INSERT INTO family_nodes (id, user_id, generation, pos_x, pos_y) VALUES (?, ?, 0, 0, 0)`)
    .run(nodeId, childId);

  const reverseMap: Record<string, string> = {
    'con trai': 'cha/mẹ', 'con gái': 'cha/mẹ', 'con': 'cha/mẹ',
    'con nuôi': 'cha/mẹ nuôi', 'con trai nuôi': 'cha/mẹ nuôi', 'con gái nuôi': 'cha/mẹ nuôi',
  };
  db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), req.userId, childId, relation_type);
  const reverse = reverseMap[relation_type] ?? 'cha/mẹ';
  db.prepare('INSERT OR IGNORE INTO relationships (id, user_id, related_user_id, relation_type) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), childId, req.userId, reverse);

  _io?.emit('family:updated');
  res.status(201).json({ ok: true, child_id: childId });
});

router.put('/nodes/:id/generation', verifyJWT, (req: AuthRequest, res: Response): void => {
  if (!canEditNode(String(req.params.id), req.userId)) {
    res.status(403).json({ error: 'Không có quyền' }); return;
  }
  const { generation, parent_node_id, spouse_node_id } = req.body;
  db.prepare(
    'UPDATE family_nodes SET generation = COALESCE(?, generation), parent_node_id = COALESCE(?, parent_node_id), spouse_node_id = COALESCE(?, spouse_node_id) WHERE id = ?'
  ).run(generation ?? null, parent_node_id ?? null, spouse_node_id ?? null, req.params.id);
  res.json({ ok: true });
});

export default router;
