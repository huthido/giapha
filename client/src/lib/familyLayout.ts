import type { FamilyNode, Relationship } from '../types';

// Auto-layout of the family tree from the relationships between members.
// Spouses are merged into a single "unit"; children hang below their parents'
// unit; generations stack top→bottom. Positions are computed from the graph —
// there is no manual dragging.

export interface LaidOutNode extends FamilyNode {
  x: number;
  y: number;
  depth: number;
}

export interface TreeLink {
  id: string;
  kind: 'spouse' | 'parent';
  x1: number; y1: number; x2: number; y2: number;
}

export interface FamilyLayout {
  nodes: LaidOutNode[];
  links: TreeLink[];
  width: number;
  height: number;
}

export const NODE_R = 40;
const SLOT_W = 120;   // horizontal space per person
const LEVEL_H = 175;  // vertical space per generation
const GAP = 28;       // gap between sibling subtrees
const PAD = 60;

// Relationship `(user_id=U, related_user_id=R, relation_type=T)` means "R is the
// T of U". The API exposes the matching node ids as from_node_id (U) / to_node_id (R).
const CHILD_TYPES = new Set(['con trai', 'con gái', 'con', 'con trai nuôi', 'con gái nuôi', 'con nuôi']);
const PARENT_TYPES = new Set(['cha/mẹ', 'cha', 'mẹ', 'cha nuôi', 'mẹ nuôi']);
const SPOUSE_TYPES = new Set(['vợ', 'chồng']);

function addTo(m: Map<string, Set<string>>, k: string, v: string) {
  let s = m.get(k);
  if (!s) { s = new Set(); m.set(k, s); }
  s.add(v);
}

/**
 * Lọc cây gia phả theo nhánh: trả về tập con gồm rootUser và
 * tất cả hậu duệ (đệ quy qua con) cùng vợ/chồng của họ.
 * Không kéo theo tổ tiên hay người thân bên vợ/chồng.
 */
export function filterSubtree(
  nodes: FamilyNode[],
  edges: Relationship[],
  rootUserId: string,
): { nodes: FamilyNode[]; edges: Relationship[] } {
  // Xây maps theo user_id
  const childrenOf = new Map<string, Set<string>>();
  const spouseOf   = new Map<string, Set<string>>();

  for (const e of edges) {
    const t = e.relation_type;
    if (CHILD_TYPES.has(t)) {
      let s = childrenOf.get(e.user_id); if (!s) { s = new Set(); childrenOf.set(e.user_id, s); } s.add(e.related_user_id);
    } else if (PARENT_TYPES.has(t)) {
      let s = childrenOf.get(e.related_user_id); if (!s) { s = new Set(); childrenOf.set(e.related_user_id, s); } s.add(e.user_id);
    } else if (SPOUSE_TYPES.has(t)) {
      let s = spouseOf.get(e.user_id); if (!s) { s = new Set(); spouseOf.set(e.user_id, s); } s.add(e.related_user_id);
    }
  }

  // Phase 1: BFS chỉ theo chiều con → hậu duệ
  const descendants = new Set<string>([rootUserId]);
  const queue = [rootUserId];
  while (queue.length) {
    const uid = queue.shift()!;
    for (const ch of childrenOf.get(uid) ?? []) {
      if (!descendants.has(ch)) { descendants.add(ch); queue.push(ch); }
    }
  }

  // Phase 2: thêm vợ/chồng của mỗi hậu duệ
  const included = new Set(descendants);
  for (const uid of descendants) {
    for (const sp of spouseOf.get(uid) ?? []) included.add(sp);
  }

  return {
    nodes: nodes.filter(n => included.has(n.user_id)),
    edges: edges.filter(e => included.has(e.user_id) && included.has(e.related_user_id)),
  };
}

export function computeFamilyLayout(nodes: FamilyNode[], edges: Relationship[]): FamilyLayout {
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  const childrenOf = new Map<string, Set<string>>();
  const parentsOf = new Map<string, Set<string>>();
  const spouseOf = new Map<string, Set<string>>();

  for (const e of edges) {
    const from = e.from_node_id;
    const to = e.to_node_id;
    if (!from || !to || from === to || !nodeById.has(from) || !nodeById.has(to)) continue;
    const t = e.relation_type;
    if (CHILD_TYPES.has(t)) { addTo(childrenOf, from, to); addTo(parentsOf, to, from); }
    else if (PARENT_TYPES.has(t)) { addTo(parentsOf, from, to); addTo(childrenOf, to, from); }
    else if (SPOUSE_TYPES.has(t)) { addTo(spouseOf, from, to); addTo(spouseOf, to, from); }
  }

  // Union spouses into shared units.
  const uf = new Map<string, string>(nodes.map(n => [n.id, n.id]));
  const find = (x: string): string => {
    let r = uf.get(x) ?? x;
    while (r !== uf.get(r)) r = uf.get(r)!;
    let cur = x;
    while (uf.get(cur) !== r) { const next = uf.get(cur)!; uf.set(cur, r); cur = next; }
    return r;
  };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) uf.set(ra, rb); };
  for (const [a, set] of spouseOf) for (const b of set) union(a, b);

  const nodeByBirth = (a: string, b: string) => {
    const na = nodeById.get(a)!, nb = nodeById.get(b)!;
    const da = na.date_of_birth || '', db = nb.date_of_birth || '';
    if (da && db && da !== db) return da < db ? -1 : 1;
    return na.name.localeCompare(nb.name);
  };

  const unitMembers = new Map<string, string[]>();
  for (const n of nodes) {
    const u = find(n.id);
    let arr = unitMembers.get(u);
    if (!arr) { arr = []; unitMembers.set(u, arr); }
    arr.push(n.id);
  }
  for (const arr of unitMembers.values()) arr.sort(nodeByBirth);

  // Unit-level parent/child graph.
  const unitChildren = new Map<string, Set<string>>();
  const unitParents = new Map<string, Set<string>>();
  for (const [child, ps] of parentsOf) {
    const cu = find(child);
    for (const p of ps) {
      const pu = find(p);
      if (pu === cu) continue;
      addTo(unitChildren, pu, cu);
      addTo(unitParents, cu, pu);
    }
  }

  const units = [...unitMembers.keys()];

  // Generation depth = longest path from a root unit.
  const depth = new Map<string, number>(units.map(u => [u, 0]));
  for (let i = 0; i < units.length; i++) {
    let changed = false;
    for (const [pu, kids] of unitChildren) {
      const nd = depth.get(pu)! + 1;
      for (const cu of kids) if (nd > depth.get(cu)!) { depth.set(cu, nd); changed = true; }
    }
    if (!changed) break;
  }

  const firstMember = (u: string) => unitMembers.get(u)![0];
  const sortUnits = (arr: string[]) => arr.sort((a, b) => nodeByBirth(firstMember(a), firstMember(b)));
  const roots = sortUnits(units.filter(u => !(unitParents.get(u)?.size)));

  // Tidy x-placement: leaves consume a cursor, parents center over their kids.
  const centerX = new Map<string, number>();
  const visited = new Set<string>();
  let cursor = 0;

  const place = (u: string): number => {
    if (visited.has(u)) return centerX.get(u)!;
    visited.add(u);
    const span = unitMembers.get(u)!.length * SLOT_W;
    const kids = sortUnits([...(unitChildren.get(u) ?? [])].filter(k => !visited.has(k)));
    let c: number;
    if (kids.length === 0) {
      c = cursor + span / 2;
      cursor += span + GAP;
    } else {
      const cs = kids.map(place);
      c = (Math.min(...cs) + Math.max(...cs)) / 2;
    }
    centerX.set(u, c);
    return c;
  };
  for (const r of roots) place(r);
  for (const u of units) if (!visited.has(u)) place(u); // detached / cyclic fallback

  // Resolve node coordinates.
  const laid: LaidOutNode[] = [];
  for (const u of units) {
    const members = unitMembers.get(u)!;
    const c = centerX.get(u) ?? 0;
    const d = depth.get(u)!;
    const startX = c - (members.length * SLOT_W) / 2 + SLOT_W / 2;
    members.forEach((id, i) => {
      laid.push({ ...nodeById.get(id)!, x: startX + i * SLOT_W, y: d * LEVEL_H, depth: d });
    });
  }

  // Connector links.
  const links: TreeLink[] = [];
  const laidById = new Map(laid.map(n => [n.id, n]));
  for (const members of unitMembers.values()) {
    for (let i = 0; i + 1 < members.length; i++) {
      const a = laidById.get(members[i])!, b = laidById.get(members[i + 1])!;
      links.push({ id: `s-${a.id}-${b.id}`, kind: 'spouse', x1: a.x + NODE_R, y1: a.y, x2: b.x - NODE_R, y2: b.y });
    }
  }
  for (const [pu, kids] of unitChildren) {
    const pc = centerX.get(pu), pd = depth.get(pu);
    if (pc == null || pd == null) continue;
    for (const cu of kids) {
      const cc = centerX.get(cu), cd = depth.get(cu);
      if (cc == null || cd == null) continue;
      links.push({ id: `p-${pu}-${cu}`, kind: 'parent', x1: pc, y1: pd * LEVEL_H + NODE_R, x2: cc, y2: cd * LEVEL_H - NODE_R });
    }
  }

  // Normalise to a padded origin and report the bounding size.
  if (laid.length === 0) return { nodes: [], links: [], width: 0, height: 0 };
  const minX = Math.min(...laid.map(n => n.x));
  const minY = Math.min(...laid.map(n => n.y));
  const dx = PAD + NODE_R - minX;
  const dy = PAD + NODE_R - minY;
  for (const n of laid) { n.x += dx; n.y += dy; }
  for (const l of links) { l.x1 += dx; l.y1 += dy; l.x2 += dx; l.y2 += dy; }
  const width = Math.max(...laid.map(n => n.x)) + PAD + NODE_R;
  const height = Math.max(...laid.map(n => n.y)) + PAD + NODE_R;
  return { nodes: laid, links, width, height };
}
