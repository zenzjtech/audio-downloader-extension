import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MediaFile {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  timestamp: number;
  tabId?: number;
  tabTitle?: string;
  fileSize?: number;
  source: 'webRequest' | 'dom';
}

interface MediaState {
  files: MediaFile[];
  selectedFiles: string[];
  isCapturing: boolean;
  searchQuery: string;
}

const initialState: MediaState = {
  files: [],
  selectedFiles: [],
  isCapturing: true,
  searchQuery: '',
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    addMediaFile: (state, action: PayloadAction<MediaFile>) => {
      // Avoid duplicates
      const exists = state.files.some(file => file.url === action.payload.url);
      if (!exists) {
        state.files.push(action.payload);
      }
    },
    addMediaFiles: (state, action: PayloadAction<MediaFile[]>) => {
      action.payload.forEach(newFile => {
        const exists = state.files.some(file => file.url === newFile.url);
        if (!exists) {
          state.files.push(newFile);
        }
      });
    },
    removeMediaFile: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter(file => file.id !== action.payload);
      state.selectedFiles = state.selectedFiles.filter(id => id !== action.payload);
    },
    clearMediaFiles: (state) => {
      state.files = [];
      state.selectedFiles = [];
    },
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      const fileId = action.payload;
      const index = state.selectedFiles.indexOf(fileId);
      if (index > -1) {
        state.selectedFiles.splice(index, 1);
      } else {
        state.selectedFiles.push(fileId);
      }
    },
    selectAllFiles: (state) => {
      state.selectedFiles = state.files.map(file => file.id);
    },
    deselectAllFiles: (state) => {
      state.selectedFiles = [];
    },
    setCapturing: (state, action: PayloadAction<boolean>) => {
      state.isCapturing = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
  },
});

export const {
  addMediaFile,
  addMediaFiles,
  removeMediaFile,
  clearMediaFiles,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  setCapturing,
  setSearchQuery,
} = mediaSlice.actions;

export default mediaSlice.reducer;
