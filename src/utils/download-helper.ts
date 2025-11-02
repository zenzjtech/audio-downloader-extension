import JSZip from 'jszip';
import type { MediaFile } from '@/store/reducers/media-slice';

/**
 * Download multiple files as a ZIP archive
 */
export async function downloadFilesAsZip(
  files: MediaFile[], 
  zipName: string = `audio_files_${Date.now()}.zip`
): Promise<void> {
  const zip = new JSZip();
  
  // Track filenames to avoid duplicates
  const filenameCount = new Map<string, number>();
  
  try {
    // Fetch all files and add to ZIP
    const fetchPromises = files.map(async (file) => {
      try {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${file.filename}`);
        }
        
        const blob = await response.blob();
        
        // Handle duplicate filenames
        let filename = file.filename;
        if (filenameCount.has(filename)) {
          const count = filenameCount.get(filename)! + 1;
          filenameCount.set(filename, count);
          const ext = filename.split('.').pop();
          const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
          filename = `${nameWithoutExt}_${count}.${ext}`;
        } else {
          filenameCount.set(filename, 1);
        }
        
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Error adding ${file.filename} to ZIP:`, error);
        // Continue with other files
      }
    });
    
    await Promise.all(fetchPromises);
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Create download link
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error creating ZIP:', error);
    throw error;
  }
}

/**
 * Download a single file
 */
export async function downloadSingleFile(url: string, filename: string): Promise<void> {
  try {
    // Use chrome.downloads API via background script
    const response = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_MEDIA',
      url,
      filename
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Download failed');
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
