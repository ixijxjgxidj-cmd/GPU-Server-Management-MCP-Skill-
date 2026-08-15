import type { TaskSpec, ServerCapacity, PackResult, Allocation, Unassignable, CandidateEntry } from './types';

// Remaining mutable capacity for a server during packing.
interface Rem extends ServerCapacity {}

function taskGpuCount(t: TaskSpec): number {
  return t.gpu_count ?? 1;
}

// Total VRAM a task needs (per-card min * card count).
function taskTotalVram(t: TaskSpec): number {
  return (t.min_gpu_memory_gb ?? 0) * taskGpuCount(t);
}

function canFit(rem: Rem, t: TaskSpec): boolean {
  const cards = taskGpuCount(t);
  if (rem.gpu_count < cards) return false;
  if (taskTotalVram(t) > rem.gpu_mem_gb) return false;
  if ((t.min_ram_gb ?? 0) > rem.ram_gb) return false;
  if ((t.min_disk_gb ?? 0) > rem.disk_gb) return false;
  if ((t.min_cpu_cores ?? 0) > rem.cpu_cores) return false;
  return true;
}

function reasonFor(rem: Rem, t: TaskSpec): string {
  const cards = taskGpuCount(t);
  if (rem.gpu_count < cards) return `no server with ${cards} free GPU cards`;
  if (taskTotalVram(t) > rem.gpu_mem_gb) return `no server with ${taskTotalVram(t)} GB free VRAM`;
  if ((t.min_ram_gb ?? 0) > rem.ram_gb) return `no server with ${t.min_ram_gb} GB RAM`;
  if ((t.min_disk_gb ?? 0) > rem.disk_gb) return `no server with ${t.min_disk_gb} GB disk`;
  if ((t.min_cpu_cores ?? 0) > rem.cpu_cores) return `no server with ${t.min_cpu_cores} CPU cores`;
  return 'no fit';
}

function deduct(rem: Rem, t: TaskSpec): void {
  // In shared mode, cards stay schedulable for co-located tasks; only VRAM (and the
  // other dimensions) shrink. In exclusive mode a task claims whole cards.
  if (rem.gpu_sharing_mode === 'exclusive') {
    rem.gpu_count -= taskGpuCount(t);
  }
  rem.gpu_mem_gb -= taskTotalVram(t);
  rem.ram_gb -= (t.min_ram_gb ?? 0);
  rem.disk_gb -= (t.min_disk_gb ?? 0);
  rem.cpu_cores -= (t.min_cpu_cores ?? 0);
}

function capacityScore(c: ServerCapacity, t: TaskSpec): number {
  let score = c.gpu_count * 1000 + c.gpu_mem_gb + c.ram_gb * 0.01;
  
  // Dataset Affinity Boost
  if (t.preferred_datasets && t.preferred_datasets.length > 0 && c.datasets) {
    let matched = 0;
    const serverDatasetNames = c.datasets.map(d => d.name);
    for (const pd of t.preferred_datasets) {
      if (serverDatasetNames.includes(pd)) matched++;
    }
    if (matched > 0) {
      score += matched * 100000; // Massive boost for each matched dataset
    }
  }
  
  return score;
}

export function allocateTasks(tasks: TaskSpec[], servers: ServerCapacity[]): PackResult {
  // First-Fit-Decreasing: sort tasks by demand (cards, then VRAM) descending.
  const ordered = [...tasks].sort((a, b) => {
    const da = taskGpuCount(a) * 100000 + taskTotalVram(a);
    const db = taskGpuCount(b) * 100000 + taskTotalVram(b);
    return db - da;
  });

  // Remaining capacity per server (clone).
  const rem: Record<string, Rem> = {};
  for (const s of servers) rem[s.server_id] = { ...s };

  const recommended_allocation: Allocation[] = [];
  const unassignable: Unassignable[] = [];
  const candidates_per_task: Record<string, CandidateEntry[]> = {};

  for (const t of ordered) {
    // Ranked candidates: servers that can currently fit, sorted by free capacity.
    const ranked = servers
      .map(s => ({ s, r: rem[s.server_id] }))
      .filter(({ r }) => canFit(r, t))
      .sort((a, b) => capacityScore(b.r, t) - capacityScore(a.r, t));
    
    // Check if the first ranked candidate had a dataset match and mention it in why_ranked
    let affinity_msg = '';
    candidates_per_task[t.id] = ranked.map(({ s, r }) => {
      let matched_datasets = 0;
      if (t.preferred_datasets && r.datasets) {
        matched_datasets = r.datasets.filter(d => t.preferred_datasets!.includes(d.name)).length;
      }
      const dataset_msg = matched_datasets > 0 ? `, matches ${matched_datasets} datasets` : '';
      return {
        server_id: s.server_id,
        name: s.name,
        why_ranked: `free ${r.gpu_count} GPU, ${Math.floor(r.gpu_mem_gb)} GB VRAM, ${r.ram_gb} GB RAM${s.stale ? ' (static spec, load stale)' : ''}${dataset_msg}`,
      };
    });

    const first = ranked[0];
    if (!first) {
      const probe = servers[0];
      unassignable.push({ task_id: t.id, reason: probe ? reasonFor(rem[probe.server_id], t) : 'no servers' });
      continue;
    }
    deduct(first.r, t);
    recommended_allocation.push({ task_id: t.id, server_id: first.s.server_id, server_name: first.s.name });
  }

  return { recommended_allocation, unassignable, candidates_per_task };
}
