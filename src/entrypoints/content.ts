import { defineContentScript } from '#imports'; 
import type { MediaFile } from '@/store/reducers/media-slice';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Audio downloader content script loaded');
    
    // Scan page for audio elements
    scanPageForAudio();
    
    // Listen for dynamic content changes
    observePageChanges();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SCAN_PAGE') {
        const audioFiles = scanPageForAudio();
        sendResponse({ success: true, data: audioFiles });
      }
      return true;
    });
  },
});

/**
 * Extract filename from URL
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = pathname.split('/').pop() || 'audio';
    filename = filename.split('?')[0];
    
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
 * Scan page for audio elements and links
 */
function scanPageForAudio(): MediaFile[] {
  const audioFiles: MediaFile[] = [];
  const seenUrls = new Set<string>();
  
  // Find <audio> elements
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach((audio) => {
    const src = audio.src || audio.currentSrc;
    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      audioFiles.push({
        id: `dom_audio_${Date.now()}_${Math.random()}`,
        url: src,
        filename: extractFilename(src),
        contentType: 'audio/mpeg',
        timestamp: Date.now(),
        tabTitle: document.title,
        source: 'dom'
      });
    }
    
    // Check source elements within audio tags
    const sources = audio.querySelectorAll('source');
    sources.forEach((source) => {
      const src = source.src;
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        audioFiles.push({
          id: `dom_source_${Date.now()}_${Math.random()}`,
          url: src,
          filename: extractFilename(src),
          contentType: source.type || 'audio/mpeg',
          timestamp: Date.now(),
          tabTitle: document.title,
          source: 'dom'
        });
      }
    });
  });
  
  // Find direct links to audio files
  const links = document.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    if (href && /\.(mp3|wav|ogg|webm|aac|flac|m4a)(\?.*)?$/i.test(href)) {
      if (!seenUrls.has(href)) {
        seenUrls.add(href);
        audioFiles.push({
          id: `dom_link_${Date.now()}_${Math.random()}`,
          url: href,
          filename: extractFilename(href),
          contentType: 'audio/mpeg',
          timestamp: Date.now(),
          tabTitle: document.title,
          source: 'dom'
        });
      }
    }
  });
  
  // Notify background script of found audio files
  if (audioFiles.length > 0) {
    chrome.runtime.sendMessage({
      type: 'DOM_AUDIO_FOUND',
      files: audioFiles
    }).catch(() => {
      // Ignore errors if no receivers
    });
  }
  
  return audioFiles;
}

/**
 * Observe page changes for dynamically loaded audio
 */
function observePageChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'AUDIO' || 
                element.querySelector('audio') ||
                (element.tagName === 'A' && 
                 /\.(mp3|wav|ogg|webm|aac|flac|m4a)(\?.*)?$/i.test((element as HTMLAnchorElement).href))) {
              shouldScan = true;
              break;
            }
          }
        }
      }
      if (shouldScan) break;
    }
    
    if (shouldScan) {
      // Debounce scanning
      setTimeout(() => scanPageForAudio(), 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
