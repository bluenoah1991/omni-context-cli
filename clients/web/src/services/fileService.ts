import type { ApiResult } from '../types/api';
import type { FilePreview } from '../types/uiMessage';
import { apiUrl } from '../utils/webSession';
import { apiFetch } from './apiFetch';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

interface ListFilesResponse {
  entries: FileEntry[];
  truncated: boolean;
}

export async function fetchFiles(dirPath: string): Promise<ApiResult<ListFilesResponse>> {
  try {
    const res = await apiFetch(apiUrl('files') + `?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) {
      const err = await res.json();
      return {data: null, error: err.error || 'Failed to list files'};
    }
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to list files'};
  }
}

export async function fetchFileContent(filePath: string): Promise<ApiResult<FilePreview>> {
  try {
    const res = await apiFetch(apiUrl('files/read') + `?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) {
      const err = await res.json();
      return {data: null, error: err.error || 'Failed to read file'};
    }
    const data = await res.json();
    return {data: {...data, filePath}, error: null};
  } catch {
    return {data: null, error: 'Failed to read file'};
  }
}
