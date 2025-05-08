import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
  },  
  srcDir: 'src',  
  runner: {
    disabled: true,
  },
  imports: {
    dirs: ['components', 'composables'] // Only include these directories
  }  
});