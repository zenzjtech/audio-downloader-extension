import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({  
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: [
      'storage',
      'webRequest',
      'downloads',
      'activeTab',
      'tabs'
    ],
    host_permissions: ['<all_urls>'],
  },  
  srcDir: 'src',  
  runner: {
    disabled: true,
  },
  imports: {
    dirs: ['components', 'composables'] // Only include these directories
  },
  modulesDir: 'src/modules',   
});