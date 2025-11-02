import { useEffect, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  IconButton,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Download,
  Delete,
  DeleteSweep,
  Refresh,
  Archive,
  MusicNote,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store/hook';
import {
  addMediaFiles,
  clearMediaFiles,
  removeMediaFile,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  setSearchQuery,
  type MediaFile,
} from '@/store/reducers/media-slice';
import {
  downloadFilesAsZip,
  downloadSingleFile,
  formatFileSize,
  formatTimestamp,
} from '@/utils/download-helper';

function App() {
  const dispatch = useAppDispatch();
  const { files, selectedFiles, searchQuery } = useAppSelector((state) => state.media);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load captured media on mount
  useEffect(() => {
    loadCapturedMedia();
    
    // Listen for new media captures
    const messageListener = (message: any) => {
      if (message.type === 'MEDIA_CAPTURED') {
        dispatch(addMediaFiles([message.media]));
      } else if (message.type === 'DOM_AUDIO_FOUND') {
        dispatch(addMediaFiles(message.files));
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [dispatch]);

  const loadCapturedMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get from background script
      const response = await chrome.runtime.sendMessage({ type: 'GET_CAPTURED_MEDIA' });
      if (response.success && response.data) {
        dispatch(addMediaFiles(response.data));
      }
      
      // Trigger content script scan
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }).catch(() => {
          // Ignore if content script not loaded
        });
      }
    } catch (err) {
      setError('Failed to load media files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_MEDIA' });
      dispatch(clearMediaFiles());
    } catch (err) {
      setError('Failed to clear files');
    }
  };

  const handleRemoveFile = async (id: string) => {
    try {
      await chrome.runtime.sendMessage({ type: 'REMOVE_MEDIA', id });
      dispatch(removeMediaFile(id));
    } catch (err) {
      setError('Failed to remove file');
    }
  };

  const handleDownloadSingle = async (file: MediaFile) => {
    setDownloading(true);
    setError(null);
    try {
      await downloadSingleFile(file.url, file.filename);
    } catch (err) {
      setError(`Failed to download ${file.filename}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedFilesList = files.filter(f => selectedFiles.includes(f.id));
    if (selectedFilesList.length === 0) return;
    
    setDownloading(true);
    setError(null);
    
    try {
      if (selectedFilesList.length === 1) {
        await downloadSingleFile(selectedFilesList[0].url, selectedFilesList[0].filename);
      } else {
        await downloadFilesAsZip(selectedFilesList);
      }
    } catch (err) {
      setError('Failed to download files');
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleSelection = (id: string) => {
    dispatch(toggleFileSelection(id));
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      dispatch(deselectAllFiles());
    } else {
      dispatch(selectAllFiles());
    }
  };

  const handlePlayPause = (file: MediaFile) => {
    // If clicking the same file that's playing, pause it
    if (playingFileId === file.id && audioElement) {
      audioElement.pause();
      setPlayingFileId(null);
      return;
    }

    // Stop current audio if playing
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Create and play new audio
    const audio = new Audio(file.url);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setError(`Failed to play ${file.filename}`);
    });

    // Handle audio end
    audio.onended = () => {
      setPlayingFileId(null);
    };

    // Handle errors
    audio.onerror = () => {
      setError(`Failed to load audio: ${file.filename}`);
      setPlayingFileId(null);
    };

    setAudioElement(audio);
    setPlayingFileId(file.id);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

  // Filter files based on search query
  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.filename.toLowerCase().includes(query) ||
      file.url.toLowerCase().includes(query) ||
      file.tabTitle?.toLowerCase().includes(query)
    );
  });

  return (
    <Box sx={{ width: 600, height: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar variant="dense">
          <MusicNote sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Audio Downloader
          </Typography>
          <Chip 
            label={`${files.length} files`} 
            size="small" 
            color="secondary"
          />
        </Toolbar>
      </AppBar>

      {/* Search and Actions */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by filename, URL, or page title..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          />
          
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={loadCapturedMedia}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              size="small"
              startIcon={<Archive />}
              onClick={handleDownloadSelected}
              disabled={selectedFiles.length === 0 || downloading}
            >
              Download {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              size="small"
              onClick={handleSelectAll}
              color="primary"
              title={selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
            >
              <Checkbox
                checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                indeterminate={selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length}
              />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleClearAll}
              color="error"
              title="Clear All"
            >
              <DeleteSweep />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* File List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filteredFiles.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
            <MusicNote sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography variant="body2">
              {files.length === 0 ? 'No audio files captured yet' : 'No files match your search'}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1 }}>
              Navigate to a page with audio files
            </Typography>
          </Box>
        ) : (
          <List dense>
            {filteredFiles.map((file, index) => (
              <Box key={file.id}>
                {index > 0 && <Divider />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayPause(file);
                        }}
                        color={playingFileId === file.id ? 'primary' : 'default'}
                        title={playingFileId === file.id ? 'Pause' : 'Play'}
                      >
                        {playingFileId === file.id ? (
                          <Pause fontSize="small" />
                        ) : (
                          <PlayArrow fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(file);
                        }}
                        disabled={downloading}
                        title="Download"
                      >
                        <Download fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id);
                        }}
                        title="Remove"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemButton onClick={() => handleToggleSelection(file.id)}>
                    <Checkbox
                      edge="start"
                      checked={selectedFiles.includes(file.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                    <ListItemText
                      primary={file.filename}
                      secondary={
                        <>
                          <Typography component="span" variant="caption" display="block">
                            {file.tabTitle}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Chip label={formatFileSize(file.fileSize)} size="small" variant="outlined" />
                            <Chip label={file.source} size="small" color={file.source === 'webRequest' ? 'primary' : 'default'} />
                          </Stack>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      {downloading && (
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="caption">Downloading...</Typography>
        </Box>
      )}
    </Box>
  );
}

export default App;
