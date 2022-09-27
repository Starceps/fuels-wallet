import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Fuel Wallet',
  version: '1.0.0',
  action: {
    default_title: 'Fuel Wallet',
    default_popup: 'pages/crx/popup.html',
    default_icon: {
      '16': 'icons/fuel-logo-16.png',
      '19': 'icons/fuel-logo-19.png',
      '32': 'icons/fuel-logo-32.png',
      '38': 'icons/fuel-logo-38.png',
      '64': 'icons/fuel-logo-64.png',
      '128': 'icons/fuel-logo-128.png',
      '512': 'icons/fuel-logo-512.png',
    },
  },
  background: {
    service_worker: 'src/systems/CRX/background/index.ts',
    type: 'module',
  },
  permissions: [
    'activeTab',
    'clipboardWrite',
    'notifications',
    'scripting',
    'storage',
    'unlimitedStorage',
    'webRequest',
    'contextMenus',
  ],
});
