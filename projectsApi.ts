import { supabase } from '@/lib/supabase';
import type { MediaAsset, Project, Timeline } from '@/types';

export interface ProjectSummary {
  id: string;
  name: string;
  folder: string;
  thumbnail: string | null;
  duration: number;
  updatedAt: string;
}

interface ProjectRow {
  id: string;
  name: string;
  folder: string;
  thumbnail: string | null;
  duration: number;
  updated_at: string;
  data?: unknown;
}

const SUMMARY_COLUMNS = 'id,name,folder,thumbnail,duration,updated_at';
const FULL_COLUMNS = `${SUMMARY_COLUMNS},data`;

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    folder: row.folder,
    thumbnail: row.thumbnail,
    duration: Number(row.duration) || 0,
    updatedAt: row.updated_at,
  };
}

function toProject(row: ProjectRow): Project {
  const data = row.data as { timeline?: Timeline; assets?: MediaAsset[] } | null;
  if (!data || !data.timeline || !Array.isArray(data.assets)) {
    throw new Error('This project could not be opened because its saved data is damaged');
  }
  return { ...toSummary(row), timeline: data.timeline, assets: data.assets, updatedAt: row.updated_at };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false });
  if (error || !Array.isArray(data)) throw new Error('Your projects could not be loaded');
  return (data as ProjectRow[]).map(toSummary);
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select(FULL_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error('This project could not be loaded');
  if (!data) throw new Error('This project no longer exists');
  return toProject(data as ProjectRow);
}

export async function saveProject(project: Project): Promise<void> {
  const { error } = await supabase.from('projects').upsert({
    id: project.id,
    name: project.name,
    folder: project.folder,
    thumbnail: project.thumbnail,
    duration: project.duration,
    data: { timeline: project.timeline, assets: project.assets },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('Your changes could not be saved to the cloud');
}

export async function deleteProjectRow(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error('The project could not be deleted');
}

export async function renameProjectRow(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error('The project could not be renamed');
}

export async function countCloudProjects(): Promise<number> {
  const { count, error } = await supabase.from('projects').select('id', { count: 'exact', head: true });
  if (error) throw new Error('Cloud storage could not be reached');
  return count ?? 0;
}
