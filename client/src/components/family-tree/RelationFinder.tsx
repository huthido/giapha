import { useState } from 'react';
import { Search, ArrowRight, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { api } from '../../lib/api';
import { mediaUrl } from '../../lib/utils';
import type { FamilyNode } from '../../types';
import { useToast } from '../ui/Toast';

interface PathStep {
  name: string;
  avatar: string | null;
  via: string;
}

interface InferResult {
  term: string | null;
  description: string;
  path: PathStep[];
  fromName: string;
  fromAvatar: string | null;
  toName: string;
  toAvatar: string | null;
}

interface RelationFinderProps {
  open: boolean;
  onClose: () => void;
  nodes: FamilyNode[];
}

function PersonSelect({
  label, value, onChange, nodes, exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  nodes: FamilyNode[];
  exclude: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = nodes
    .filter(n => n.user_id !== exclude)
    .filter(n => !search || n.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <Search size={13} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên..."
            className="flex-1 text-sm bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
          />
        </div>
        <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => { onChange(n.user_id); setSearch(''); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                value === n.user_id
                  ? 'bg-amber-50 dark:bg-amber-950/40'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Avatar src={n.avatar} name={n.name} size="xs" />
              <span className="text-sm text-gray-700 dark:text-gray-200">{n.name}</span>
              {n.date_of_birth && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {new Date(n.date_of_birth).getFullYear()}
                </span>
              )}
              {value === n.user_id && (
                <span className="text-amber-500 text-xs font-bold flex-shrink-0">✓</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">Không tìm thấy</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RelationFinder({ open, onClose, nodes }: RelationFinderProps) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [result, setResult] = useState<InferResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const reset = () => { setFromId(''); setToId(''); setResult(null); };

  const handleFind = async () => {
    if (!fromId || !toId) { showToast('Chọn đủ 2 người', 'error'); return; }
    setLoading(true);
    try {
      const data = await api.get<InferResult>(`/family/infer-between?from=${fromId}&to=${toId}`);
      setResult(data);
    } catch (err: any) { showToast(err.message, 'error'); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Tìm mối quan hệ" size="sm">
      <div className="space-y-4">
        <PersonSelect label="Người thứ nhất" value={fromId} onChange={v => { setFromId(v); setResult(null); }} nodes={nodes} exclude={toId} />
        <PersonSelect label="Người thứ hai"  value={toId}   onChange={v => { setToId(v);   setResult(null); }} nodes={nodes} exclude={fromId} />

        <button
          onClick={handleFind}
          disabled={!fromId || !toId || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors"
        >
          <Search size={15} />
          {loading ? 'Đang tìm...' : 'Tìm quan hệ'}
        </button>

        {/* Kết quả */}
        {result && (
          <div className={`rounded-2xl border p-4 ${
            result.term
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
          }`}>
            {result.term ? (
              <>
                {/* Term badge */}
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <strong>{result.fromName}</strong> gọi <strong>{result.toName}</strong> là:
                    </p>
                    <span className="inline-block px-4 py-1.5 bg-amber-500 text-white font-semibold rounded-full text-base">
                      {result.term}
                    </span>
                  </div>
                </div>

                {/* Path chain */}
                {result.path.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="flex items-center gap-1 min-w-max mx-auto w-fit">
                      {/* Điểm đầu */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0 ring-2 ring-amber-400">
                          {result.fromAvatar
                            ? <img src={mediaUrl(result.fromAvatar)} alt="" className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{result.fromName[0]}</span>
                          }
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium max-w-[60px] text-center truncate">{result.fromName}</span>
                      </div>

                      {/* Các bước trung gian */}
                      {result.path.map((step, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="flex flex-col items-center gap-0.5">
                            <ArrowRight size={14} className="text-amber-400 dark:text-amber-600 flex-shrink-0" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap px-1">{step.via}</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-700">
                              {step.avatar
                                ? <img src={mediaUrl(step.avatar)} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{step.name[0]}</span>
                              }
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[60px] text-center truncate">{step.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.path.length === 1 && (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">Quan hệ trực tiếp</p>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{result.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Hai người này chưa có đường quan hệ nào trong cây gia phả (tối đa 6 bậc).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
