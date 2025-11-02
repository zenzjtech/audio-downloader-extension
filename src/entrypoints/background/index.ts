import { 
  startMediaCapture, 
  downloadMedia, 
  getCapturedMedia, 
  clearCapturedMedia,
  removeMedia 
} from './media-capture';

export default defineBackground(() => {
  console.log('Background script initialized');
  
  // Start capturing media files
  startMediaCapture();
  
  // Handle messages from popup/content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'GET_CAPTURED_MEDIA':
            sendResponse({ success: true, data: getCapturedMedia() });
            break;
            
          case 'DOWNLOAD_MEDIA':
            await downloadMedia(message.url, message.filename);
            sendResponse({ success: true });
            break;
            
          case 'CLEAR_MEDIA':
            clearCapturedMedia();
            sendResponse({ success: true });
            break;
            
          case 'REMOVE_MEDIA':
            removeMedia(message.id);
            sendResponse({ success: true });
            break;
            
          case 'DOM_AUDIO_FOUND':
            // Content script found audio in DOM, just relay to popup
            // No need to store in background, popup handles it
            sendResponse({ success: true });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        sendResponse({ success: false, error: String(error) });
      }
    })();
    
    // Return true to indicate async response
    return true;
  });
});
  