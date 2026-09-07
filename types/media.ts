export interface FileItem { id: number | string; file_id: string; original_name: string; mime_type: string; size_bytes: number; url: string; thumbnail_url: string | null; created_at: string; category?: string; relative_path?: string; }

export interface UploadTask { id: string; file: File; status: 'pending' | 'uploading' | 'completed' | 'error' | 'canceled'; progress: number; speedBytesPerSec: number; loaded: number; total: number; etaSec: number; errorMessage?: string; xhr?: XMLHttpRequest; lastTime?: number; lastLoaded?: number; smoothedSpeed?: number; chunkInfo?: string; }

export type NavTab = 'all' | 'images' | 'videos' | 'documents' | 'others' | 'upload';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'newest' | 'oldest' | 'size_desc' | 'name_asc';
