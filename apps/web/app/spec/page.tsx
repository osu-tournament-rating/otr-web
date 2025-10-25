import Script from 'next/script';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata = {
  title: 'o!TR API Reference',
  description: 'Interactive documentation for public o!TR API endpoints.',
};

export default function SpecPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="space-y-4">
        <Alert className="border-warning/50 bg-warning/10 text-warning-foreground dark:border-warning/40 dark:bg-warning/10 dark:text-yellow-100">
          <AlertTriangle className="text-warning-foreground h-4 w-4 dark:text-yellow-300" />
          <AlertTitle className="text-warning-foreground font-semibold dark:text-yellow-300">
            API Stability Notice
          </AlertTitle>
          <AlertDescription className="text-warning-foreground/90 dark:text-yellow-100/90">
            The o!TR public API is still evolving and is not considered fully
            stable. Breaking changes may be introduced at any time without
            advance notice.
          </AlertDescription>
        </Alert>
        <div
          id="scalar-api-reference"
          className="w-full"
          style={{
            minHeight: 'calc(100vh - var(--header-height-px))',
          }}
        />
      </div>
      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
        strategy="afterInteractive"
      />
      <Script
        id="scalar-api-reference-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function initScalar() {
              var selector = '#scalar-api-reference';
              var themeRoot = document.documentElement;
              var baseConfig = {
                hideDownload: false,
                withDefaultFonts: true,
                showToolbar: 'never',
                hideClientButton: true,
                hideTestRequestButton: true,
                hideDarkModeToggle: true,
                url: '/spec.json',
              };
              var scalarInstance = null;
              var themeObserver = null;
              var appliedTheme = null;
              var desiredTheme = null;
              var retryTimeout = null;

              function isOnSpecRoute() {
                if (typeof window === 'undefined' || !window.location) {
                  return false;
                }
                return window.location.pathname.startsWith('/spec');
              }

              function applyContainerSizing() {
                var container = document.querySelector(selector);
                if (!container) {
                  return;
                }
                container.style.height = 'auto';
                container.style.minHeight =
                  'calc(100vh - var(--header-height-px))';
              }

              function getCurrentTheme() {
                if (!themeRoot) {
                  return 'light';
                }
                if (themeRoot.classList.contains('dark')) {
                  return 'dark';
                }
                if (themeRoot.dataset && typeof themeRoot.dataset.theme === 'string') {
                  return themeRoot.dataset.theme === 'dark' ? 'dark' : 'light';
                }
                return 'light';
              }

              function mountScalar() {
                if (!isOnSpecRoute()) {
                  cleanup();
                  return;
                }

                if (!desiredTheme) {
                  desiredTheme = getCurrentTheme();
                }

                if (!window || !window.Scalar) {
                  retryTimeout = setTimeout(mountScalar, 50);
                  return;
                }

                var container = document.querySelector(selector);
                if (!container) {
                  retryTimeout = setTimeout(mountScalar, 50);
                  return;
                }

                if (scalarInstance && typeof scalarInstance.destroy === 'function') {
                  scalarInstance.destroy();
                  scalarInstance = null;
                }

                scalarInstance = window.Scalar.createApiReference(
                  selector,
                  Object.assign({}, baseConfig, {
                    forceDarkModeState: desiredTheme,
                  })
                );
                appliedTheme = desiredTheme;
                requestAnimationFrame(applyContainerSizing);
              }

              function requestThemeSync() {
                if (!isOnSpecRoute()) {
                  cleanup();
                  return;
                }
                desiredTheme = getCurrentTheme();
                if (desiredTheme !== appliedTheme) {
                  mountScalar();
                }
              }

              function cleanup() {
                if (retryTimeout) {
                  clearTimeout(retryTimeout);
                  retryTimeout = null;
                }
                if (themeObserver) {
                  themeObserver.disconnect();
                  themeObserver = null;
                }
                if (scalarInstance && typeof scalarInstance.destroy === 'function') {
                  scalarInstance.destroy();
                  scalarInstance = null;
                }
                window.removeEventListener('storage', requestThemeSync);
                window.removeEventListener('pagehide', cleanup);
                window.removeEventListener('beforeunload', cleanup);
              }

              requestThemeSync();

              if (typeof MutationObserver !== 'undefined' && themeRoot) {
                themeObserver = new MutationObserver(requestThemeSync);
                themeObserver.observe(themeRoot, {
                  attributes: true,
                  attributeFilter: ['class', 'data-theme'],
                });
              }

              window.addEventListener('storage', requestThemeSync);
              window.addEventListener('pagehide', cleanup);
              window.addEventListener('beforeunload', cleanup);

              applyContainerSizing();
            })();
          `,
        }}
      />
    </div>
  );
}
