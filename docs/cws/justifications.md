# Chrome Web Store - Justifications

## Single Purpose Description

The extension's single purpose is to help users find and download audio files from the web pages they visit. It detects audio sources embedded in the page or linked directly and provides a simple, user-friendly interface to save them for offline use.

---

## Permission Justifications

### 1. `activeTab`

- **Justification**: This permission is used to gain access to the currently active tab when the user interacts with the extension's popup. It allows the popup to request the content script to scan the page for audio content, ensuring the extension only acts on the page the user is currently viewing.

### 2. `downloads`

- **Justification**: This is a core permission for our extension. It is used to initiate the download of the audio files that the user selects. The extension uses the `chrome.downloads.download()` API to save the captured audio file to the user's local machine.

### 3. `host_permissions` (`<all_urls>`)

- **Justification**: To fulfill its primary purpose, the extension must be able to detect audio on any website the user visits. The `<all_urls>` permission allows the content script to run on all pages, scan the DOM for `<audio>` elements and links to audio files, and detect network requests for audio media. This broad permission is essential for the extension to be universally useful.

### 4. Remote Code Use

- **Justification**: Our extension **does not** execute remote code. All of the extension's JavaScript code (background scripts, content scripts, and UI components) is bundled and included within the extension package itself. The extension only analyzes the structure (DOM) and network traffic of web pages to find audio sources; it does not fetch or execute any external scripts.

### 5. `storage`

- **Justification**: The `storage` permission is used to store the user's download history and preferences. This allows the user to see a list of previously downloaded files and maintains their settings across browser sessions, providing a consistent and personalized experience.

### 6. `tabs`

- **Justification**: This permission is used to access the properties of the tab where an audio file is found, specifically its title and URL. This information is used to provide context for the user, such as naming the downloaded file based on the page title, which helps in organizing downloaded content.

### 7. `webRequest`

- **Justification**: The `webRequest` permission is crucial for detecting audio on modern websites that use dynamic streaming and complex media players. It allows the extension to observe network requests and identify audio/video media streams that are not visible in the page's HTML. This enables the extension to capture a wider range of audio content, providing a more reliable user experience.
