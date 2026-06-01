import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, Bell, Baby, GitFork } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TreeCanvas } from '../components/family-tree/TreeCanvas';
import { AddMemberModal } from '../components/family-tree/AddMemberModal';
import { RelationRequestsModal } from '../components/family-tree/RelationRequestsModal';
import { CreateChildModal } from '../components/family-tree/CreateChildModal';
import { BranchManager } from '../components/family-tree/BranchManager';
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
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { socket } = useSocket();
  const loadingRef = useRef(false);

  const loadTree = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { nodes: ns, edges: es } = await api.get<{ nodes: FamilyNode[]; edges: Relationship[] }>('/family/tree');
      setNodes(ns); setEdges(es);
    } catch {}
    loadingRef.current = false;
    setLoading(false);
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const { received } = await api.get<{ received: unknown[] }>('/family/requests');
      setPendingCount(received.length);
    } catch {}
  }, []);

  useEffect(() => {
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
            <span className="hidden md:inline text-xs text-gray-400 dark:text-gray-500">
              Kéo node để nối • Cuộn để zoom
            </span>

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

            <button onClick={() => setShowCreateChild(true)}
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <Baby size={16} />
              <span className="hidden sm:inline">Tạo tài khoản con</span>
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
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">Thêm quan hệ hoặc tạo tài khoản cho con để bắt đầu</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors min-h-[48px]">
                    <Plus size={16} /> Thêm quan hệ
                  </button>
                  <button onClick={() => setShowCreateChild(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors min-h-[48px]">
                    <Baby size={16} /> Tạo tài khoản con
                  </button>
                </div>
              </div>
            </div>
          ) : visibleNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
              Không có thành viên nào trong nhánh này
            </div>
          ) : (
            <TreeCanvas nodes={visibleNodes} edges={visibleEdges} onRelationChanged={loadTree} />
          )}
        </div>
      </div>

      <AddMemberModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdded={loadTree} existingNodes={nodes} />
      <RelationRequestsModal open={showRequests} onClose={() => setShowRequests(false)} onAccepted={() => { loadTree(); loadPendingCount(); }} />
      <CreateChildModal open={showCreateChild} onClose={() => setShowCreateChild(false)} onCreated={loadTree} />
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
