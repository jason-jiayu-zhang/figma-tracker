export interface FigmaFile {
  id: number;
  file_key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
  updated_at: string;
  project_name: string;
  teamName: string | null;
  versionCount: number;
}

export interface FigmaVersion {
  version_id: string;
  label: string | null;
  description: string | null;
  created_at: string;
  created_by_handle: string;
  created_by_figma_user_id: string;
}

export interface ActivityRow {
  activity_date: string;
  version_count: number;
  figma_files: {
    id: number;
    file_key: string;
    name: string;
  };
}

export interface ActivityData {
  rows: ActivityRow[];
  dailyTotals: Record<string, number>;
  recent?: Record<string, number>;
  days: number;
  filterMine: boolean;
  myFigmaUserId: string | null;
}

export interface Stats {
  filesTracked: number;
  totalVersions: number;
  editsToday: number;
  lastSync: string | null;
  lastSyncStatus: string | null;
  filterMine: boolean;
  myFigmaUserId: string | null;
}

export interface SyncSession {
  id: number;
  synced_at: string;
  files_synced: number;
  new_versions_found: number;
  status: string;
  error_message: string | null;
}
