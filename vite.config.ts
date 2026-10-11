import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Update HTML markup in place instead of Vite's default full-page reload.
function liveHtml(): Plugin {
  return {
    name: 'live-html',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      if (file.endsWith('/index.html') || file.endsWith('\\index.html')) {
        server.ws.send({ type: 'custom', event: 'html:update' });
        return [];
      }
    },
    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: { type: 'module' },
        children: `
          import { createHotContext } from '/@vite/client';
          const hot = createHotContext('/live-html');
          hot.on('html:update', async () => {
            const response = await fetch(location.pathname, { cache: 'no-store' });
            if (!response.ok) return;
            const next = new DOMParser().parseFromString(await response.text(), 'text/html');
            document.title = next.title;
            document.documentElement.lang = next.documentElement.lang;
            for (const attr of [...document.body.attributes]) document.body.removeAttribute(attr.name);
            for (const attr of next.body.attributes) document.body.setAttribute(attr.name, attr.value);
            for (const node of [...document.body.childNodes]) {
              if (node.nodeName !== 'SCRIPT') node.remove();
            }
            for (const node of [...next.body.childNodes]) {
              if (node.nodeName !== 'SCRIPT') document.body.appendChild(document.importNode(node, true));
            }
            document.querySelectorAll('head link:not([data-vite-dev-id]), head meta').forEach(node => node.remove());
            next.querySelectorAll('head link:not([data-vite-dev-id]), head meta').forEach(node => {
              document.head.appendChild(document.importNode(node, true));
            });
            window.dispatchEvent(new CustomEvent('app:html-updated'));
          });
        `,
        injectTo: 'head',
      }];
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), liveHtml()],
  server: {
    port: 5173,
    strictPort: true,
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
  },
});
