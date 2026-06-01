import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { verifyJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// BFS subtree filter — trả về tập user_id kết nối với rootUserId
function subtreeUserIds(rootUserId: string, edges: { user_id: string; related_user_id: string }[]): Set<string> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!adj.has(e.user_id)) adj.set(e.user_id, new Set());
    adj.get(e.user_id)!.add(e.related_user_id);
    if (!adj.has(e.related_user_id)) adj.set(e.related_user_id, new Set());
    adj.get(e.related_user_id)!.add(e.user_id);
  }
  const visited = new Set<string>([rootUserId]);
  const queue = [rootUserId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nbr of adj.get(cur) ?? []) {
      if (!visited.has(nbr)) { visited.add(nbr); queue.push(nbr); }
    }
  }
  return visited;
}

// POST /api/shares — tạo link chia sẻ
router.post('/', verifyJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, branch_id, password, expires_days } = req.body;

  // Validate branch thuộc quyền quản lý nếu có
  if (branch_id) {
    const branch = db.prepare('SELECT id FROM branches WHERE id = ?').get(branch_id);
    if (!branch) { res.status(400).json({ error: 'Nhánh không tồn tại' }); return; }
  }

  const id = uuidv4();
  const token = uuidv4().replace(/-/g, '');
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const expiresAt = expires_days
    ? new Date(Date.now() + Number(expires_days) * 86400000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO tree_shares (id, token, created_by, branch_id, title, password_hash, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, token, req.userId, branch_id || null, title || null, passwordHash, expiresAt);

  res.status(201).json({ id, token });
});

// GET /api/shares — list share của tôi
router.get('/', verifyJWT, (req: AuthRequest, res: Response): void => {
  const shares = db.prepare(`
    SELECT s.id, s.token, s.title, s.branch_id, s.expires_at, s.status,
           s.view_count, s.created_at,
           (s.password_hash IS NOT NULL) AS has_password,
           b.name AS branch_name
    FROM tree_shares s
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.created_by = ?
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all(req.userId);
  res.json(shares);
});

// DELETE /api/shares/:id — thu hồi share
router.delete('/:id', verifyJWT, (req: AuthRequest, res: Response): void => {
  const share = db.prepare('SELECT id, created_by FROM tree_shares WHERE id = ?')
    .get(req.params.id) as { id: string; created_by: string } | undefined;
  if (!share) { res.status(404).json({ error: 'Không tìm thấy' }); return; }
  if (share.created_by !== req.userId) { res.status(403).json({ error: 'Không có quyền' }); return; }

  db.prepare("UPDATE tree_shares SET status = 'revoked' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/shares/view/:token — xem cây (public)
// Query: ?password=xxx (nếu share có mật khẩu)
router.get('/view/:token', async (req: Request, res: Response): Promise<void> => {
  const share = db.prepare(`
    SELECT s.*, u.name AS creator_name, b.root_user_id
    FROM tree_shares s
    JOIN users u ON s.created_by = u.id
    LEFT JOIN branches b ON s.branch_id = b.id
    WHERE s.token = ?
  `).get(req.params.token) as any;

  if (!share) { res.status(404).json({ error: 'Link chia sẻ không tồn tại' }); return; }
  if (share.status === 'revoked') { res.status(410).json({ error: 'Link chia sẻ đã bị thu hồi' }); return; }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    res.status(410).json({ error: 'Link chia sẻ đã hết hạn' }); return;
  }

  // Kiểm tra mật khẩu
  if (share.password_hash) {
    const pw = (req.query.password as string) ?? '';
    if (!pw) { res.status(401).json({ error: 'Cần mật khẩu', requires_password: true }); return; }
    const ok = await bcrypt.compare(pw, share.password_hash);
    if (!ok) { res.status(401).json({ error: 'Mật khẩu không đúng', requires_password: true }); return; }
  }

  // Lấy dữ liệu cây — chỉ trả về thông tin công khai (không có email, phone, address)
  const allNodes = db.prepare(`
    SELECT fn.id, fn.user_id, fn.parent_node_id, fn.spouse_node_id,
           fn.generation, fn.pos_x, fn.pos_y,
           u.name, u.bio, u.date_of_birth, u.gender, u.hometown, u.managed_by,
           CASE WHEN u.avatar LIKE 'http%' THEN u.avatar
                WHEN u.oauth_avatar IS NOT NULL THEN u.oauth_avatar
                ELSE NULL END AS avatar
    FROM family_nodes fn
    JOIN users u ON fn.user_id = u.id
    ORDER BY fn.generation, fn.pos_x
  `).all() as any[];

  const allEdges = db.prepare(`
    SELECT r.id, r.user_id, r.related_user_id, r.relation_type,
           u1.name AS user_name, u2.name AS related_name,
           fn1.id AS from_node_id, fn2.id AS to_node_id
    FROM relationships r
    JOIN users u1 ON r.user_id = u1.id
    JOIN users u2 ON r.related_user_id = u2.id
    JOIN family_nodes fn1 ON fn1.user_id = r.user_id
    JOIN family_nodes fn2 ON fn2.user_id = r.related_user_id
  `).all() as any[];

  // Lọc theo nhánh nếu có
  let nodes = allNodes;
  let edges = allEdges;
  if (share.root_user_id) {
    const visibleIds = subtreeUserIds(share.root_user_id, allEdges);
    nodes = allNodes.filter((n: any) => visibleIds.has(n.user_id));
    edges = allEdges.filter((e: any) => visibleIds.has(e.user_id) && visibleIds.has(e.related_user_id));
  }

  // Tăng view count
  db.prepare('UPDATE tree_shares SET view_count = view_count + 1 WHERE id = ?').run(share.id);

  res.json({
    title: share.title,
    creator_name: share.creator_name,
    branch_name: share.branch_name ?? null,
    nodes,
    edges,
  });
});

export default router;
