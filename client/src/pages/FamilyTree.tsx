import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, Bell, Baby } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { TreeCanvas } from '../components/family-tree/TreeCanvas';
import { AddMemberModal } from '../components/family-tree/AddMemberModal';
import { RelationRequestsModal } from '../components/family-tree/RelationRequestsModal';
import { CreateChildModal } from '../components/family-tree/CreateChildModal';
import { api } from '../lib/api';
import { useSocket } from '../contexts/SocketContext';
import type { FamilyNode, Relationship } from '../types';

export function FamilyTree() {
  const [nodes, setNodes] = useState<FamilyNode[]>([]);
  const [edges, setEdges] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);
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

  useEffect(() => { loadTree(); loadPendingCount(); }, [loadTree, loadPendingCount]);

  useEffect(() => {
    if (!socket) return;
    socket.on('family:updated', loadTree);
    socket.on('relation-request', () => { setPendingCount(c => c + 1); });
    return () => {
      socket.off('family:updated', loadTree);
      socket.off('relation-request');
    };
  }, [socket, loadTree]);

  const btnClass = 'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] touch-manipulation';

  return (
    <AppLayout title="Cây Gia Phả">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 min-h-[56px] gap-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
            <Users size={16} />
            <span>{nodes.length} thành viên</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="hidden md:inline text-xs text-gray-400 dark:text-gray-500">
              Kéo node để nối • Cuộn để zoom
            </span>

            {/* Yêu cầu pending */}
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

            {/* Tạo tài khoản con */}
            <button onClick={() => setShowCreateChild(true)}
              className={`${btnClass} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300`}>
              <Baby size={16} />
              <span className="hidden sm:inline">Tạo tài khoản con</span>
            </button>

            {/* Thêm quan hệ */}
            <button onClick={() => setShowAddModal(true)}
              className={`${btnClass} bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white`}>
              <Plus size={16} />
              <span className="hidden xs:inline">Thêm quan hệ</span>
              <span className="xs:hidden">Thêm</span>
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">Đang tải cây gia phả...</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
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
          ) : (
            <TreeCanvas nodes={nodes} edges={edges} onRelationChanged={loadTree} />
          )}
        </div>
      </div>

      <AddMemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={loadTree}
        existingNodes={nodes}
      />

      <RelationRequestsModal
        open={showRequests}
        onClose={() => setShowRequests(false)}
        onAccepted={() => { loadTree(); loadPendingCount(); }}
      />

      <CreateChildModal
        open={showCreateChild}
        onClose={() => setShowCreateChild(false)}
        onCreated={loadTree}
      />
    </AppLayout>
  );
}
