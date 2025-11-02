import type { MediaFile } from '@/store/reducers/media-slice';

const capturedMedia = new Map<string, MediaFile>();

/**
 * Check if content type is an audio file
 */
function isAudioFile(contentType: string): boolean {
  const audioTypes = [
    'audio/mpeg',      // MP3
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/flac',
    'audio/x-m4a',
  ];
  
  return audioTypes.some(type => 
    contentType.toLowerCase().includes(type)
  );
}

/**
 * Extract filename from URL
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = pathname.split('/').pop() || 'audio';
    
    // Remove query parameters from filename
    filename = filename.split('?')[0];
    
    // If no extension or not an audio extension, add .mp3
    const hasAudioExt = /\.(mp3|wav|ogg|webm|aac|flac|m4a)$/i.test(filename);
    if (!hasAudioExt) {
      filename = `${filename}.mp3`;
    }
    
    return filename;
  } catch {
    return `audio_${Date.now()}.mp3`;
  }
}

/**
 * Get content length from response headers
 */
function getContentLength(headers?: chrome.webRequest.HttpHeader[]): number | undefined {
  if (!headers) return undefined;
  
  const contentLength = headers.find(
    header => header.name.toLowerCase() === 'content-length'
  );
  
  return contentLength?.value ? parseInt(contentLength.value, 10) : undefined;
}

/**
 * Start capturing media files via webRequest
 */
export function startMediaCapture() {
  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      const contentType = details.responseHeaders?.find(
        header => header.name.toLowerCase() === 'content-type'
      )?.value || '';

      // Check if it's an audio file
      if (isAudioFile(contentType)) {
        const fileSize = getContentLength(details.responseHeaders);
        
        const media: MediaFile = {
          id: `${details.requestId}_${Date.now()}`,
          url: details.url,
          filename: extractFilename(details.url),
          contentType: contentType,
          timestamp: Date.now(),
          tabId: details.tabId >= 0 ? details.tabId : undefined,
          tabTitle: 'Unknown',
          fileSize,
          source: 'webRequest'
        };

        capturedMedia.set(media.id, media);
        
        // Get tab info asynchronously (don't block the request)
        if (details.tabId >= 0) {
          chrome.tabs.get(details.tabId).then(tab => {
            media.tabTitle = tab.title || 'Unknown';
          }).catch(() => {
            // Ignore errors
          });
        }
        
        // Notify all contexts (popup, content scripts)
        chrome.runtime.sendMessage({
          type: 'MEDIA_CAPTURED',
          media: media
        }).catch(() => {
          // Ignore errors if no receivers
        });
      }

      return { responseHeaders: details.responseHeaders };
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
  );
}

/**
 * Download a single media file
 */
export async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false
    });
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Get all captured media
 */
export function getCapturedMedia(): MediaFile[] {
  return Array.from(capturedMedia.values());
}

/**
 * Clear captured media
 */
export function clearCapturedMedia(): void {
  capturedMedia.clear();
}

/**
 * Remove specific media file
 */
export function removeMedia(id: string): void {
  capturedMedia.delete(id);
}
