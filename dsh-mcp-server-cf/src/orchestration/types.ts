import type { DBServerNote } from '../db/schema';

export interface LoadFields {
  gpu_util_pct: number | null;
  gpu_mem_free_gb: number | null;
  ram_free_gb: number | null;
  disk_free_gb: number | null;
  running_tasks: number | null;
  load_updated_at: string | null;
}

export interface ServerNoteEntry {
  topic: string;
  content: string;
  updated_by: string | null;
  updated_at: string;
}

export interface ServerWithLoad {
  load_age_sec: number | null;
  notes_entries: ServerNoteEntry[];
}

export interface ServerCapacity {
  server_id: string;
  name: string;
  gpu_count: number;        // available cards (exclusive: free whole cards; shared: physical cards)
  gpu_mem_gb: number;       // total available GPU memory (GB)
  ram_gb: number;           // available RAM (GB)
  disk_gb: number;          // available disk (GB)
  cpu_cores: number;        // total cores
  stale: boolean;           // true when capacity came from static spec, not live load
  gpu_sharing_mode: 'shared' | 'exclusive'; // shared: meter by VRAM, co-locate; exclusive: whole cards
  datasets?: { name: string; path: string; size_gb?: number }[]; // Available datasets
}

export interface TaskSpec {
  id: string;
  gpu_count?: number;           // cards required (default 1)
  min_gpu_memory_gb?: number;   // per-card min VRAM (GB)
  min_ram_gb?: number;
  min_disk_gb?: number;
  min_cpu_cores?: number;
  preferred_datasets?: string[]; // dataset names required by the task
}

export interface Allocation {
  task_id: string;
  server_id: string;
  server_name: string;
}

export interface Unassignable {
  task_id: string;
  reason: string;
}

export interface CandidateEntry {
  server_id: string;
  name: string;
  why_ranked: string;
}

export interface PackResult {
  recommended_allocation: Allocation[];
  unassignable: Unassignable[];
  candidates_per_task: Record<string, CandidateEntry[]>;
}
