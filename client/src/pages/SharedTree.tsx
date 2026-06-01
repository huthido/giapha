import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X, Lock, Eye, GitBranch } from 'lucide-react';
import type { FamilyNode, Relationship } from '../types';
import { computeFamilyLayout, NODE_R } from '../lib/familyLayout';
import { ZoomControls } from '../components/family-tree/ZoomControls';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { formatDate } from '../lib/utils';

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:5109';
const GEN_COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

interface ShareData {
  title: string | null;
  creator_name: string;
  branch_name: string | null;
  nodes: FamilyNode[];
  edges: Relationship[];
}

interface PopupInfo {
  node: FamilyNode & { x: number; y: number };
  screenX: number;
  screenY: number;
}

interface Transform { x: number; y: number; scale: number; }

export function SharedTree() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTree = useCallback(async (pw?: string) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const url = `${SERVER}/api/shares/view/${token}${pw ? `?password=${encodeURIComponent(pw)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        if (json.requires_password) { setRequiresPassword(true); setPwError(pw ? 'Mật khẩu không đúng' : ''); }
        else setError(json.error ?? 'Lỗi tải dữ liệu');
      } else {
        setData(json);
        setRequiresPassword(false);
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  }, [token]);

  useEffect(() => {
    const pw = searchParams.get('password') ?? undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTree(pw);
  }, [fetchTree, searchParams]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (requiresPassword) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl w-full max-w-sm p-8 border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Link được bảo vệ</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nhập mật khẩu để xem cây gia phả</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); fetchTree(password); }} className="space-y-4">
          <input
            type="password" value={password} onChange={e => { setPassword(e.target.value); setPwError(''); }}
            placeholder="Mật khẩu" autoFocus required
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          <button type="submit" disabled={submitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm">
            {submitting ? 'Đang kiểm tra...' : 'Xác nhận'}
          </button>
        </form>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🌳</p>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Không thể tải cây gia phả</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 min-h-[56px]">
        <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <GitBranch size={16} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">
            {data?.title ?? 'Cây Gia Phả'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            Chia sẻ bởi {data?.creator_name}
            {data?.branch_name && ` · Nhánh: ${data.branch_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
            <Eye size={11} /> Chỉ xem
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {data && <PublicTreeCanvas nodes={data.nodes} edges={data.edges} />}
      </div>
    </div>
  );
}

// ── Read-only canvas ──────────────────────────────────────────────────────────

interface PublicTreeCanvasProps {
  nodes: FamilyNode[];
  edges: Relationship[];
}

function PublicTreeCanvas({ nodes, edges }: PublicTreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  const layout = useMemo(() => computeFamilyLayout(nodes, edges), [nodes, edges]);

  const fitView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || layout.width === 0) return;
    const scale = Math.max(0.3, Math.min(1, (rect.width - 40) / layout.width, (rect.height - 40) / layout.height));
    setTransform({ x: (rect.width - layout.width * scale) / 2, y: 24, scale });
  }, [layout.width, layout.height]);

  useEffect(() => { fitView(); }, [fitView]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(t => ({ ...t, scale: Math.min(Math.max(t.scale * delta, 0.3), 3) }));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const touchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [dragging, dragStart]);
  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (pinchRef.current && e.touches.length === 2) {
      e.preventDefault();
      const ratio = touchDist(e.touches as unknown as React.TouchList) / pinchRef.current.dist;
      const scale = Math.min(Math.max(pinchRef.current.scale * ratio, 0.3), 3);
      setTransform(prev => ({ ...prev, scale }));
    } else if (dragging && e.touches[0]) {
      e.preventDefault();
      setTransform(prev => ({ ...prev, x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }));
    }
  }, [dragging, dragStart]);
  const handleTouchEnd = useCallback(() => { pinchRef.current = null; setDragging(false); }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const linkPath = (l: typeof layout.links[number]) => {
    if (l.kind === 'spouse') return `M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`;
    const midY = (l.y1 + l.y2) / 2;
    return `M ${l.x1} ${l.y1} L ${l.x1} ${midY} L ${l.x2} ${midY} L ${l.x2} ${l.y2}`;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-950">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none touch-none"
        onMouseDown={e => { setDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); }}
        onTouchStart={e => {
          if (e.touches.length === 2) { pinchRef.current = { dist: touchDist(e.touches), scale: transform.scale }; setDragging(false); }
          else { setDragging(true); setDragStart({ x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y }); }
        }}
        onClick={() => setPopup(null)}
      >
        <defs>
          <pattern id="grid-pub" width="40" height="40" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x % 40} ${transform.y % 40})`}>
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d6ccbe" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pub)" className="dark:opacity-10" />

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {layout.links.map(l => (
            <path key={l.id} d={linkPath(l)} fill="none"
              stroke={l.kind === 'spouse' ? '#f97316' : '#c9a98a'}
              strokeWidth={l.kind === 'spouse' ? 2.5 : 1.8}
              strokeDasharray={l.kind === 'spouse' ? '6 3' : 'none'}
              strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
          ))}

          {layout.nodes.map(node => {
            const color = GEN_COLORS[node.depth % GEN_COLORS.length];
            // Chỉ hiện avatar nếu là URL ngoài (Google/Facebook), bỏ /uploads/
            const avatarSrc = node.avatar?.startsWith('http') ? node.avatar : null;
            return (
              <g key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setPopup({ node, screenX: node.x * transform.scale + transform.x, screenY: node.y * transform.scale + transform.y }); }}
              >
                <circle r={NODE_R + 4} fill="white" stroke={color} strokeWidth={2} opacity={0.97}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))" />
                {avatarSrc ? (
                  <image href={avatarSrc} x={-NODE_R} y={-NODE_R}
                    width={NODE_R * 2} height={NODE_R * 2}
                    clipPath={`circle(${NODE_R}px at center)`}
                    preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle r={NODE_R} fill={`${color}22`} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight="bold" fill={color}>
                      {node.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </text>
                  </>
                )}
                <text textAnchor="middle" y={NODE_R + 18} fontSize={11} fontWeight="600" fill="#6b5d4d">
                  {node.name.split(' ').slice(-1)[0]}
                </text>
                {node.date_of_birth && (
                  <text textAnchor="middle" y={NODE_R + 31} fontSize={9} fill="#a89a87">
                    {new Date(node.date_of_birth).getFullYear()}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {popup && (
        <PublicNodePopup
          node={popup.node}
          screenX={popup.screenX}
          screenY={popup.screenY}
          onClose={() => setPopup(null)}
        />
      )}

      <ZoomControls
        onZoomIn={() => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))}
        onZoomOut={() => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.8, 0.3) }))}
        onReset={fitView}
      />

      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-gray-600 pointer-events-none select-none whitespace-nowrap">
        Kéo để di chuyển · Cuộn để zoom
      </p>
    </div>
  );
}

// ── Simple read-only node popup ───────────────────────────────────────────────

interface PublicNodePopupProps {
  node: FamilyNode;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

function PublicNodePopup({ node, screenX, screenY, onClose }: PublicNodePopupProps) {
  const popupW = Math.min(220, window.innerWidth - 24);
  const style = {
    width: popupW,
    left: Math.min(Math.max(12, screenX + 16), window.innerWidth - popupW - 12),
    top:  Math.min(Math.max(12, screenY - 60), window.innerHeight - 200),
  };
  const avatarSrc = node.avatar?.startsWith('http') ? node.avatar : null;

  return (
    <div className="absolute z-20 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4"
      style={style} onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            {avatarSrc
              ? <img src={avatarSrc} alt={node.name} className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-amber-600">{node.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
            }
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{node.name}</p>
            {node.date_of_birth && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(node.date_of_birth)}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
          <X size={16} />
        </button>
      </div>
      {node.bio && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{node.bio}</p>}
      {node.hometown && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">📍 {node.hometown}</p>}
    </div>
  );
}
