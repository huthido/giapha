import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, Bell, IdCard, GitFork, SearchCode, UserPlus, Share2, Search, X } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TreeCanvas } from '../components/family-tree/TreeCanvas';
import { AddMemberModal } from '../components/family-tree/AddMemberModal';
import { RelationRequestsModal } from '../components/family-tree/RelationRequestsModal';
import { CreateRelativeModal } from '../components/family-tree/CreateRelativeModal';
import { BranchManager } from '../components/family-tree/BranchManager';
import { RelationFinder } from '../components/family-tree/RelationFinder';
import { InviteModal } from '../components/family-tree/InviteModal';
import { ShareModal } from '../components/family-tree/ShareModal';
import { api } from '../lib/api';
import { filterSubtree } from '../lib/familyLayout';
import { useSocket } from '../contexts/SocketContext';
import type { FamilyNode, Relationship, Branch } from '../types';

export function FamilyTree() {
  const [nodes, setNodes] = useState<FamilyNode[]>([]);
  const [edges, setEdges] = useState<Relationship[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateRelative, setShowCreateRelative] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [showRelationFinder, setShowRelationFinder] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightUserId, setHighlightUserId] = useState<string | undefined>();
  const searchRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const loadingRef = useRef(false);

  const loadTree = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { nodes: ns, edges: es } = await api.get<{ nodes: FamilyNode[]; edges: Relationship[] }>('/family/tree');
      setNodes(ns); setEdges(es);
    } catch { /* ignore network errors */ }
    loadingRef.current = false;
    setLoading(false);
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const { received } = await api.get<{ received: unknown[] }>('/family/requests');
      setPendingCount(received.length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTree();
    loadPendingCount();
    api.get<Branch[]>('/branches').then(setBranches).catch(() => {});
  }, [loadTree, loadPendingCount]);

  useEffect(() => {
    if (!socket) return;
    socket.on('family:updated', loadTree);
    socket.on('relation-request', () => { setPendingCount(c => c + 1); });
    return () => {
      socket.off('family:updated', loadTree);
      socket.off('relation-request');
    };
  }, [socket, loadTree]);

  // Đóng search popover khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchResults = searchQuery.trim()
    ? nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  // Tính toán nodes/edges hiển thị theo nhánh đang chọn
  const activeBranch = branches.find(b => b.id === activeBranchId);
  const { nodes: visibleNodes, edges: visibleEdges } = activeBranch
    ? filterSubtree(nodes, edges, activeBranch.root_user_id)
    : { nodes, edges };

  const btnClass = 'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] touch-manipulation';

  return (
    <AppLayout title="Cây Gia Phả">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 min-h-[56px] flex-wrap">

          {/* Branch selector */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <select
              value={activeBranchId}
              onChange={e => setActiveBranchId(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[40px] max-w-[200px] truncate"
            >
              <option value="">🌳 Toàn bộ ({nodes.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  🌿 {b.name} ({filterSubtree(nodes, edges, b.root_user_id).nodes.length})
                </option>
              ))}
            </select>

            <button onClick={() => setShowBranchManager(true)}
              title="Quản lý nhánh"
              className="p-2 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors min-h-[40px]">
              <GitFork size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search popover */}
            <div className="relative" ref={searchRef}>
              <button onClick={() => { setSearchOpen(o => !o); setSearchQuery(''); setHighlightUserId(undefined); }}
                title="Tìm thành viên trong cây"
                className={`${btnClass} ${searchOpen ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                <Search size={16} />
                <span className="hidden sm:inline">Tìm</span>
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-30 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setHighlightUserId(undefined); }}
                      placeholder="Nhập tên thành viên..."
                      className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
                    />
                    {(searchQuery || highlightUserId) && (
                      <button onClick={() => { setSearchQuery(''); setHighlightUserId(undefined); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto">
                      {searchResults.map(n => (
                        <div key={n.id} onClick={() => { setHighlightUserId(n.user_id); setSearchQuery(n.name); }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                            highlightUserId === n.user_id ? 'bg-amber-50 dark:bg-amber-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}>
                          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">
                            {n.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{n.name}</p>
                            {n.date_of_birth && <p className="text-xs text-gray-400">{new Date(n.date_of_birth).getFullYear()}</p>}
                          </div>
                          {highlightUserId === n.user_id && <span className="text-amber-500 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">Không tìm thấy</p>
                  )}
                  {!searchQuery && (
                    <p className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">Nhập tên để tìm kiếm</p>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setShowShare(true)}
              title="Chia sẻ cây gia phả"
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <Share2 size={16} />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            <button onClick={() => setShowInvite(true)}
              title="Mời thành viên"
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <UserPlus size={16} />
              <span className="hidden sm:inline">Mời</span>
            </button>

            <button onClick={() => setShowRelationFinder(true)}
              title="Tìm mối quan hệ"
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <SearchCode size={16} />
              <span className="hidden sm:inline">Tìm quan hệ</span>
            </button>

            <button onClick={() => setShowRequests(true)}
              className={`relative ${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <Bell size={16} />
              <span className="hidden sm:inline">Yêu cầu</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>

            <button onClick={() => setShowCreateRelative(true)}
              title="Tạo tài khoản cho người thân"
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <IdCard size={16} />
              <span className="hidden sm:inline">Tạo tài khoản người thân</span>
            </button>

            <button onClick={() => setShowAddModal(true)}
              className={`${btnClass} bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white`}>
              <Plus size={16} />
              <span className="hidden xs:inline">Thêm quan hệ</span>
              <span className="xs:hidden">Thêm</span>
            </button>
          </div>
        </div>

        {/* Branch label khi đang xem nhánh */}
        {activeBranch && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Users size={14} />
            <span>Nhánh <strong>{activeBranch.name}</strong> — gốc: {activeBranch.root_name}</span>
            <span className="text-amber-400 dark:text-amber-600">·</span>
            <span>{visibleNodes.length} thành viên</span>
            <button onClick={() => setActiveBranchId('')}
              className="ml-auto text-xs text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:underline">
              Xem toàn bộ
            </button>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">Đang tải cây gia phả...</p>
              </div>
            </div>
          ) : visibleNodes.length === 0 && nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <p className="text-5xl mb-4">🌳</p>
                <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">Cây gia phả trống</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">Thêm quan hệ hoặc tạo tài khoản cho người thân để bắt đầu</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors min-h-[48px]">
                    <Plus size={16} /> Thêm quan hệ
                  </button>
                  <button onClick={() => setShowCreateRelative(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors min-h-[48px]">
                    <IdCard size={16} /> Tạo tài khoản người thân
                  </button>
                </div>
              </div>
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
              Không có thành viên nào trong nhánh này
            </div>
          ) : (
            <div className="relative h-full">
              <TreeCanvas nodes={visibleNodes} edges={visibleEdges} onRelationChanged={loadTree} highlightUserId={highlightUserId} />
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-gray-600 pointer-events-none select-none whitespace-nowrap">
                Kéo node để nối · Cuộn để zoom
              </p>
            </div>
          )}
        </div>
      </div>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} branches={branches} />
      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
      <AddMemberModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdded={loadTree} existingNodes={nodes} />
      <RelationRequestsModal open={showRequests} onClose={() => setShowRequests(false)} onAccepted={() => { loadTree(); loadPendingCount(); }} />
      <CreateRelativeModal open={showCreateRelative} onClose={() => setShowCreateRelative(false)} onCreated={loadTree} />
      <RelationFinder open={showRelationFinder} onClose={() => setShowRelationFinder(false)} nodes={nodes} />
      <BranchManager
        open={showBranchManager}
        onClose={() => setShowBranchManager(false)}
        nodes={nodes}
        branches={branches}
        onChanged={bs => { setBranches(bs); if (activeBranchId && !bs.find(b => b.id === activeBranchId)) setActiveBranchId(''); }}
      />
    </AppLayout>
  );
}
