import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, Image, ChevronLeft } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Modal } from '../components/ui/Modal';
import { AlbumCard } from '../components/photos/AlbumCard';
import { PhotoGrid } from '../components/photos/PhotoGrid';
import { PhotoLightbox } from '../components/photos/PhotoLightbox';
import { api } from '../lib/api';
import type { Album, Photo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

export function Albums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'family' | 'personal'>('family');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    api.get<Album[]>('/albums').then(setAlbums).finally(() => setLoading(false));
  }, []);

  const loadPhotos = async (album: Album) => {
    setSelectedAlbum(album);
    const ps = await api.get<Photo[]>(`/albums/${album.id}/photos`);
    setPhotos(ps);
  };

  const createAlbum = async () => {
    if (!newTitle.trim()) return;
    try {
      const album = await api.post<Album>('/albums', { title: newTitle, description: newDesc, type: newType });
      setAlbums(prev => [album, ...prev]);
      setShowCreate(false);
      setNewTitle(''); setNewDesc('');
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const uploadPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    try {
      const newPhotos = await api.upload<Photo[]>(`/albums/${selectedAlbum.id}/photos`, fd);
      setPhotos(prev => [...newPhotos, ...prev]);
      setAlbums(prev => prev.map(a =>
        a.id === selectedAlbum.id
          ? { ...a, photo_count: a.photo_count + newPhotos.length, cover_url: a.cover_url || newPhotos[0]?.url }
          : a
      ));
      showToast(`Đã tải lên ${newPhotos.length} ảnh`, 'success');
    } catch (err: any) { showToast(err.message, 'error'); }
    setUploading(false);
    e.target.value = '';
  };

  const deletePhoto = async (photo: Photo) => {
    try {
      await api.delete(`/albums/${selectedAlbum!.id}/photos/${photo.id}`);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      if (lightboxIdx !== null && photos[lightboxIdx]?.id === photo.id) setLightboxIdx(null);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const navigate = (dir: 1 | -1) => {
    if (lightboxIdx === null) return;
    const next = lightboxIdx + dir;
    if (next >= 0 && next < photos.length) setLightboxIdx(next);
  };

  if (selectedAlbum) {
    return (
      <AppLayout title={selectedAlbum.title}>
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setSelectedAlbum(null)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <ChevronLeft size={16} /> Tất cả album
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={14} />
              {uploading ? 'Đang tải...' : 'Thêm ảnh'}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={uploadPhotos} />
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-16">
              <Image size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">Album trống. Thêm ảnh đầu tiên!</p>
            </div>
          ) : (
            <PhotoGrid
              photos={photos}
              currentUserId={user?.id}
              onPhotoClick={(_, idx) => setLightboxIdx(idx)}
              onPhotoDelete={deletePhoto}
            />
          )}
        </div>
        <PhotoLightbox
          photo={lightboxIdx !== null ? photos[lightboxIdx] : null}
          photos={photos}
          currentIndex={lightboxIdx ?? 0}
          onClose={() => setLightboxIdx(null)}
          onNavigate={navigate}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Kho ảnh">
      <div className="px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Tạo album
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-16">
            <Image size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">Chưa có album nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {albums.map(album => (
              <AlbumCard key={album.id} album={album} onClick={() => loadPhotos(album)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Tạo album mới" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên album</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Ví dụ: Tết 2025"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mô tả</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Ghi chú về album..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex gap-2">
            {(['family','personal'] as const).map(t => (
              <button key={t} onClick={() => setNewType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  newType === t ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                {t === 'family' ? 'Gia đình' : 'Cá nhân'}
              </button>
            ))}
          </div>
          <button onClick={createAlbum} disabled={!newTitle.trim()}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors">
            Tạo album
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
