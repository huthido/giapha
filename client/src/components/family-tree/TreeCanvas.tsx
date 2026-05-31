import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FamilyNode, Relationship } from '../../types';
import { computeFamilyLayout, NODE_R, type LaidOutNode } from '../../lib/familyLayout';
import { NodePopup } from './NodePopup';
import { ZoomControls } from './ZoomControls';
import { DragRelationModal } from './DragRelationModal';
import { useCall } from '../../contexts/CallContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/utils';

const GEN_COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

interface Transform { x: number; y: number; scale: number; }
interface Popup { node: LaidOutNode; screenX: number; screenY: number; }
interface DragLink { fromNode: LaidOutNode; curX: number; curY: number; }

interface TreeCanvasProps {
  nodes: FamilyNode[];
  edges: Relationship[];
  onRelationChanged?: () => void;
}

export function TreeCanvas({ nodes, edges, onRelationChanged }: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [draggingCanvas, setDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<Popup | null>(null);
  const [dragLink, setDragLink] = useState<DragLink | null>(null);
  const [linkTarget, setLinkTarget] = useState<LaidOutNode | null>(null);
  const [showRelModal, setShowRelModal] = useState(false);
  const [relModalFrom, setRelModalFrom] = useState<FamilyNode | null>(null);
  const dragLinkRef = useRef<DragLink | null>(null);
  const { onlineUsers } = useSocket();
  const { callUser } = useCall();
  const { user } = useAuth();
  const navigate = useNavigate();

  const layout = useMemo(() => computeFamilyLayout(nodes, edges), [nodes, edges]);

  // Fit the whole tree into view whenever its structure (size) changes.
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

  const startPan = (clientX: number, clientY: number) => {
    setDraggingCanvas(true);
    setDragStart({ x: clientX - transform.x, y: clientY - transform.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingCanvas) setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [draggingCanvas, dragStart]);

  const handleMouseUp = useCallback(() => setDraggingCanvas(false), []);

  // --- Touch: one finger pans, two fingers pinch-zoom. ---
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const touchDist = (t: React.TouchList | TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e.touches), scale: transform.scale };
      setDraggingCanvas(false);
      return;
    }
    startPan(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (pinchRef.current && e.touches.length === 2) {
      e.preventDefault();
      const ratio = touchDist(e.touches) / pinchRef.current.dist;
      const scale = Math.min(Math.max(pinchRef.current.scale * ratio, 0.3), 3);
      setTransform(prev => ({ ...prev, scale }));
    } else if (draggingCanvas && e.touches[0]) {
      e.preventDefault();
      setTransform(prev => ({ ...prev, x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y }));
    }
  }, [draggingCanvas, dragStart]);

  const handleTouchEnd = useCallback(() => { pinchRef.current = null; setDraggingCanvas(false); }, []);

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

  // ── Drag-to-connect: drag từ node này sang node kia để tạo quan hệ ──
  const dragThreshold = 8; // px di chuyển để kích hoạt drag
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const startNodeDrag = (e: React.MouseEvent | React.TouchEvent, node: LaidOutNode) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOriginRef.current = { x: clientX, y: clientY };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const cx = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      const moved = Math.hypot(cx - dragOriginRef.current!.x, cy - dragOriginRef.current!.y);
      if (moved < dragThreshold) return;

      setDraggingCanvas(false);
      const dl = { fromNode: node, curX: cx, curY: cy };
      setDragLink(dl);
      dragLinkRef.current = dl;

      // highlight target node under cursor
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const svgX = (cx - rect.left - transform.x) / transform.scale;
        const svgY = (cy - rect.top  - transform.y) / transform.scale;
        const hit = layout.nodes.find(n =>
          n.id !== node.id &&
          Math.hypot(n.x - svgX, n.y - svgY) <= NODE_R + 8
        ) ?? null;
        setLinkTarget(hit);
        setDragLink({ fromNode: node, curX: cx, curY: cy });
        dragLinkRef.current = { fromNode: node, curX: cx, curY: cy };
      }
    };

    const onUp = (ev: MouseEvent | TouchEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      dragOriginRef.current = null;

      const cur = dragLinkRef.current;
      if (!cur) return; // no drag happened → normal click handled separately

      setDragLink(null);
      dragLinkRef.current = null;
      const cx = 'changedTouches' in ev ? ev.changedTouches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'changedTouches' in ev ? ev.changedTouches[0].clientY : (ev as MouseEvent).clientY;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) { setLinkTarget(null); return; }

      const svgX = (cx - rect.left - transform.x) / transform.scale;
      const svgY = (cy - rect.top  - transform.y) / transform.scale;
      const hit = layout.nodes.find(n =>
        n.id !== cur.fromNode.id &&
        Math.hypot(n.x - svgX, n.y - svgY) <= NODE_R + 8
      ) ?? null;
      setLinkTarget(null);

      if (hit) {
        // mở modal thêm quan hệ với 2 node đã chọn
        setRelModalFrom(cur.fromNode);
        setShowRelModal(true);
        // ghi node đích vào state để AddMemberModal biết
        setRelModalTarget(hit);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  };

  const [relModalTarget, setRelModalTarget] = useState<LaidOutNode | null>(null);

  const handleNodeClick = (e: React.MouseEvent, node: LaidOutNode) => {
    e.stopPropagation();
    if (dragLinkRef.current) return; // drag was active, don't open popup
    setPopup({
      node,
      screenX: node.x * transform.scale + transform.x,
      screenY: node.y * transform.scale + transform.y,
    });
  };

  const handleChat = async (node: LaidOutNode) => {
    setPopup(null);
    try {
      const conv = await api.post<{ id: string }>('/conversations', { type: 'direct', memberIds: [node.user_id] });
      navigate(`/chat?conv=${conv.id}`);
    } catch {}
  };

  const handleCall = async (userId: string, type: 'audio' | 'video') => {
    setPopup(null);
    try {
      const conv = await api.post<{ id: string }>('/conversations', { type: 'direct', memberIds: [userId] });
      callUser(userId, conv.id, type);
    } catch {}
  };

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
        onMouseDown={e => startPan(e.clientX, e.clientY)}
        onTouchStart={handleTouchStart}
        onClick={() => setPopup(null)}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x % 40} ${transform.y % 40})`}>
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d6ccbe" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="dark:opacity-10" />

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          {/* Connectors */}
          {layout.links.map(l => (
            <path key={l.id} d={linkPath(l)} fill="none"
              stroke={l.kind === 'spouse' ? '#f97316' : '#c9a98a'}
              strokeWidth={l.kind === 'spouse' ? 2.5 : 1.8}
              strokeDasharray={l.kind === 'spouse' ? '6 3' : 'none'}
              strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
          ))}

          {/* Drag-to-connect preview line */}
          {dragLink && (() => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return null;
            const tx = (dragLink.curX - rect.left - transform.x) / transform.scale;
            const ty = (dragLink.curY - rect.top  - transform.y) / transform.scale;
            return (
              <line
                x1={dragLink.fromNode.x} y1={dragLink.fromNode.y}
                x2={tx} y2={ty}
                stroke="#f97316" strokeWidth={2} strokeDasharray="6 4"
                opacity={0.8} strokeLinecap="round" pointerEvents="none"
              />
            );
          })()}

          {/* Nodes */}
          {layout.nodes.map(node => {
            const color = GEN_COLORS[node.depth % GEN_COLORS.length];
            const isOnline = onlineUsers.has(node.user_id);
            const isMe = node.user_id === user?.id;
            const isDragTarget = linkTarget?.id === node.id;
            const isDragSource = dragLink?.fromNode.id === node.id;
            return (
              <g key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                onClick={e => handleNodeClick(e, node)}
                onMouseDown={e => { e.stopPropagation(); startNodeDrag(e, node); }}
                onTouchStart={e => { e.stopPropagation(); startNodeDrag(e, node); }}
                style={{ cursor: 'pointer' }}
              >
                <circle r={NODE_R + 4} fill="white"
                  stroke={isDragTarget ? '#22c55e' : isDragSource ? '#f97316' : isMe ? '#f97316' : color}
                  strokeWidth={isDragTarget ? 3.5 : isMe ? 3 : 2} opacity={0.97}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))" />
                {node.avatar ? (
                  <image href={mediaUrl(node.avatar)} x={-NODE_R} y={-NODE_R}
                    width={NODE_R * 2} height={NODE_R * 2}
                    clipPath={`circle(${NODE_R}px at center)`}
                    preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <>
                    <circle r={NODE_R} fill={`${color}22`} />
                    <text textAnchor="middle" dominantBaseline="central"
                      fontSize={18} fontWeight="bold" fill={color}>
                      {node.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </text>
                  </>
                )}
                {isOnline && (
                  <circle cx={NODE_R - 8} cy={NODE_R - 8} r={6} fill="#22c55e" stroke="white" strokeWidth={2} />
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
        <NodePopup
          node={popup.node}
          screenX={popup.screenX}
          screenY={popup.screenY}
          onClose={() => setPopup(null)}
          onViewProfile={userId => { navigate(`/profile/${userId}`); setPopup(null); }}
          onChat={handleChat}
          onAudioCall={userId => handleCall(userId, 'audio')}
          onVideoCall={userId => handleCall(userId, 'video')}
          onRelationChanged={onRelationChanged}
        />
      )}

      <ZoomControls
        onZoomIn={() => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.2, 3) }))}
        onZoomOut={() => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.8, 0.3) }))}
        onReset={fitView}
      />

      {/* Drag-to-connect modal */}
      <DragRelationModal
        open={showRelModal}
        onClose={() => { setShowRelModal(false); setRelModalFrom(null); setRelModalTarget(null); }}
        fromNode={relModalFrom}
        toNode={relModalTarget}
        onAdded={() => { onRelationChanged?.(); }}
      />

      {/* Drag hint */}
      {dragLink && !linkTarget && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Thả vào một thành viên để tạo quan hệ
        </div>
      )}
      {dragLink && linkTarget && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-green-600/90 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Thả để kết nối với {linkTarget.name}
        </div>
      )}
    </div>
  );
}
