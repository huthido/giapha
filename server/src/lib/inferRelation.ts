// Infer the Vietnamese kinship term between two people by traversing the
// relationship graph with BFS and composing hops with a rule table.

export interface PathStep { userId: string; via: string; }
export type Graph = Map<string, Array<{ to: string; rel: string }>>;

const MAX_DEPTH = 6;

// ── Category helpers ──────────────────────────────────────────────────────────

const PARENTS      = new Set(['cha','mẹ','cha/mẹ','cha nuôi','mẹ nuôi']);
const CHILDREN     = new Set(['con','con trai','con gái','con nuôi','con trai nuôi','con gái nuôi']);
const CHILD_INLAW  = new Set(['rể','dâu']);
const SIBLINGS     = new Set(['anh','chị','em','em trai','em gái','anh nuôi','chị nuôi','em nuôi','em trai nuôi','em gái nuôi']);
const SPOUSES      = new Set(['vợ','chồng']);
const GRANDPARENTS = new Set(['ông','bà']);
const GRANDCHILD   = new Set(['cháu','cháu trai','cháu gái']);
const UNCLE_AUNT   = new Set(['bác','chú','thím','cô','dì','cậu','dượng','mợ']);
const COUSINS      = new Set(['anh họ','chị họ','em họ']);
const PARENT_INLAW = new Set(['bố vợ','mẹ vợ','bố chồng','mẹ chồng']);
const SIB_INLAW    = new Set(['anh rể','em rể','chị dâu','em dâu']);

type Cat = 'parent'|'child'|'child_inlaw'|'sibling'|'spouse'|'grandparent'|'grandchild'|'uncle_aunt'|'cousin'|'parent_inlaw'|'sib_inlaw'|'other';

function cat(r: string): Cat {
  if (PARENTS.has(r))      return 'parent';
  if (CHILDREN.has(r))     return 'child';
  if (CHILD_INLAW.has(r))  return 'child_inlaw';
  if (SIBLINGS.has(r))     return 'sibling';
  if (SPOUSES.has(r))      return 'spouse';
  if (GRANDPARENTS.has(r)) return 'grandparent';
  if (GRANDCHILD.has(r))   return 'grandchild';
  if (UNCLE_AUNT.has(r))   return 'uncle_aunt';
  if (COUSINS.has(r))      return 'cousin';
  if (PARENT_INLAW.has(r)) return 'parent_inlaw';
  if (SIB_INLAW.has(r))    return 'sib_inlaw';
  return 'other';
}

const isMale   = (r: string) => ['cha','cha/mẹ','cha nuôi','anh','anh nuôi','con trai','con trai nuôi','em trai','em trai nuôi','ông','chú','bác','cậu'].includes(r);
const isFemale = (r: string) => ['mẹ','mẹ nuôi','chị','chị nuôi','con gái','con gái nuôi','em gái','em gái nuôi','bà','cô','dì','thím','mợ'].includes(r);
const isPaternal = (r: string) => ['cha','cha/mẹ','cha nuôi'].includes(r);

// ── Two-hop composition rules ─────────────────────────────────────────────────

function composeTwo(r1: string, r2: string): string | null {
  const c1 = cat(r1), c2 = cat(r2);

  // parent + parent → ông/bà
  if (c1 === 'parent' && c2 === 'parent')
    return isFemale(r2) ? 'bà' : 'ông';

  // grandparent + parent → cụ
  if (c1 === 'grandparent' && c2 === 'parent') return 'cụ';

  // parent + sibling → chú/bác/cô/cậu/dì
  if (c1 === 'parent' && c2 === 'sibling') {
    const pat = isPaternal(r1);
    const older = r2 === 'anh' || r2 === 'anh nuôi' || r2 === 'chị' || r2 === 'chị nuôi';
    if (pat) {
      if (older) return 'bác';
      return isMale(r2) ? 'chú' : 'cô';
    } else {
      if (older) return 'bác';
      return isMale(r2) ? 'cậu' : 'dì';
    }
  }

  // grandparent + sibling → ông/bà (great-uncle/aunt roughly)
  if (c1 === 'grandparent' && c2 === 'sibling') return 'ông/bà (đời trên)';

  // parent + child → anh/chị/em (half or full sibling)
  if (c1 === 'parent' && c2 === 'child') {
    if (isMale(r2))   return 'anh/em trai';
    if (isFemale(r2)) return 'chị/em gái';
    return 'anh/chị/em';
  }

  // parent + spouse → bố/mẹ kế (step-parent context, uncommon to declare)
  // uncle/aunt + child → anh/chị/em họ
  if (c1 === 'uncle_aunt' && c2 === 'child') return 'anh/chị/em họ';

  // sibling + child → cháu
  if (c1 === 'sibling' && c2 === 'child') return 'cháu';

  // sibling + grandchild → cháu
  if (c1 === 'sibling' && c2 === 'grandchild') return 'cháu';

  // child + child → cháu nội/ngoại
  if (c1 === 'child' && c2 === 'child') return 'cháu';

  // grandchild + child → chắt
  if (c1 === 'grandchild' && c2 === 'child') return 'chắt';
  if (c1 === 'child'      && c2 === 'grandchild') return 'chắt';

  // child + child_inlaw → dâu/rể
  if (c1 === 'child' && c2 === 'spouse') {
    if (isMale(r1))   return 'con dâu';
    if (isFemale(r1)) return 'con rể';
    return 'dâu/rể';
  }

  // sibling + spouse → anh rể / chị dâu / em rể / em dâu
  if (c1 === 'sibling' && c2 === 'spouse') {
    const older = r1 === 'anh' || r1 === 'anh nuôi' || r1 === 'chị' || r1 === 'chị nuôi';
    if (r1 === 'anh' && r2 === 'vợ')                             return 'chị dâu';
    if (r1 === 'chị' && r2 === 'chồng')                          return 'anh rể';
    if ((r1 === 'em' || r1 === 'em trai') && r2 === 'vợ')        return 'em dâu';
    if ((r1 === 'em' || r1 === 'em gái')  && r2 === 'chồng')     return 'em rể';
    return older ? 'anh rể/chị dâu' : 'em rể/em dâu';
  }

  // spouse + parent → bố/mẹ vợ/chồng
  if (c1 === 'spouse' && c2 === 'parent') {
    const w = r1 === 'vợ';
    if (isMale(r2))   return w ? 'bố vợ'  : 'bố chồng';
    if (isFemale(r2)) return w ? 'mẹ vợ'  : 'mẹ chồng';
    return w ? 'bố/mẹ vợ' : 'bố/mẹ chồng';
  }

  // spouse + sibling → anh/chị/em vợ/chồng
  if (c1 === 'spouse' && c2 === 'sibling') {
    const suf = r1 === 'vợ' ? ' vợ' : ' chồng';
    if (r2 === 'anh' || r2 === 'anh nuôi')              return 'anh' + suf;
    if (r2 === 'chị' || r2 === 'chị nuôi')              return 'chị' + suf;
    if (r2 === 'em trai' || r2 === 'em trai nuôi')      return 'em trai' + suf;
    if (r2 === 'em gái'  || r2 === 'em gái nuôi')       return 'em gái' + suf;
    return 'anh/chị/em' + suf;
  }

  // grandparent + child → cha/mẹ (their child is your parent)
  if (c1 === 'grandparent' && c2 === 'child') return 'cha/mẹ';

  // cousin + child → cháu họ
  if (c1 === 'cousin' && c2 === 'child') return 'cháu họ';

  // parent_inlaw + ... (don't try to compose further)
  return null;
}

// ── BFS path finder ───────────────────────────────────────────────────────────

export function buildGraph(rels: { user_id: string; related_user_id: string; relation_type: string }[]): Graph {
  const g: Graph = new Map();
  for (const r of rels) {
    if (!g.has(r.user_id)) g.set(r.user_id, []);
    g.get(r.user_id)!.push({ to: r.related_user_id, rel: r.relation_type });
  }
  return g;
}

export function findPath(from: string, to: string, graph: Graph): PathStep[] | null {
  if (from === to) return [];
  const visited = new Set<string>([from]);
  const queue: Array<{ id: string; path: PathStep[] }> = [{ id: from, path: [] }];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.path.length >= MAX_DEPTH) continue;
    for (const edge of graph.get(cur.id) ?? []) {
      if (visited.has(edge.to)) continue;
      const next: PathStep[] = [...cur.path, { userId: edge.to, via: edge.rel }];
      if (edge.to === to) return next;
      visited.add(edge.to);
      queue.push({ id: edge.to, path: next });
    }
  }
  return null;
}

// ── Compose a full path into a term + human-readable description ──────────────

export function composePath(path: PathStep[]): { term: string | null; description: string } {
  if (!path.length) return { term: null, description: '' };
  if (path.length === 1) return { term: path[0].via, description: path[0].via };

  // Try composing step-by-step (left fold)
  let term: string | null = path[0].via;
  for (let i = 1; i < path.length; i++) {
    term = term ? composeTwo(term, path[i].via) : null;
    if (!term) break;
  }

  // Human-readable chain: "cha → anh → con trai"
  const chain = path.map(s => s.via).join(' → ');
  const description = term ? `${term} (${chain})` : chain;
  return { term, description };
}
