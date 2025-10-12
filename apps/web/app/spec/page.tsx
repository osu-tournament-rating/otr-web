import Script from 'next/script';

export const metadata = {
  title: 'o!TR API Reference',
  description: 'Interactive documentation for public o!TR API endpoints.',
};

export default function SpecPage() {
  return (
    <div className="bg-background text-foreground">
      <div
        id="scalar-api-reference"
        className="w-full"
        style={{
          minHeight: 'calc(100vh - var(--header-height-px))',
        }}
      />
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
              var PUBLIC_GROUP_LABEL = '🛰 Public';
              var PUBLIC_TAG_NAMES = [
                'Leaderboards',
                'Matches',
                'Players',
                'Filtering',
                'Tournaments',
                'Stats',
              ];
              var MODELS_ICON = '📦';
              var baseConfig = {
                hideDownload: false,
                withDefaultFonts: true,
                showToolbar: 'never',
                hideClientButton: true,
                hideTestRequestButton: true,
                hideDarkModeToggle: true,
                url: '/spec.json',
                tagGroups: [
                  {
                    name: PUBLIC_GROUP_LABEL,
                    tags: PUBLIC_TAG_NAMES,
                  },
                ],
              };
              var scalarInstance = null;
              var themeObserver = null;
              var sidebarObserver = null;
              var appliedTheme = null;
              var desiredTheme = null;
              var retryTimeout = null;

              function applyContainerSizing() {
                var container = document.querySelector(selector);
                if (!container) {
                  return;
                }
                container.style.height = 'auto';
                container.style.minHeight =
                  'calc(100vh - var(--header-height-px))';
              }

              function applySidebarIcons() {
                var container = document.querySelector(selector);
                if (!container) {
                  return;
                }

                var nav = container.querySelector('nav');
                if (!nav) {
                  return;
                }

                var navElements = nav.querySelectorAll('button, summary, span, div, a');
                for (var index = 0; index < navElements.length; index += 1) {
                  var element = navElements[index];
                  if (!element || typeof element.textContent !== 'string') {
                    continue;
                  }

                  var label = element.textContent.trim();
                  if (!label || element.children.length > 0) {
                    continue;
                  }

                  if (
                    label === 'Models' &&
                    element.getAttribute('data-otr-icon-applied') !== 'true' &&
                    !label.startsWith(MODELS_ICON)
                  ) {
                    element.setAttribute('data-otr-icon-applied', 'true');
                    element.textContent = MODELS_ICON + ' ' + label;
                  }
                }
              }

              function setupSidebarEnhancements() {
                applySidebarIcons();

                if (typeof MutationObserver === 'undefined') {
                  return;
                }

                var container = document.querySelector(selector);
                if (!container) {
                  return;
                }

                var nav = container.querySelector('nav');
                if (!nav) {
                  setTimeout(setupSidebarEnhancements, 50);
                  return;
                }

                if (sidebarObserver) {
                  sidebarObserver.disconnect();
                }

                sidebarObserver = new MutationObserver(applySidebarIcons);
                sidebarObserver.observe(nav, {
                  childList: true,
                  subtree: true,
                });
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
                requestAnimationFrame(function () {
                  applyContainerSizing();
                  setupSidebarEnhancements();
                });
              }

              function requestThemeSync() {
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
                if (sidebarObserver) {
                  sidebarObserver.disconnect();
                  sidebarObserver = null;
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
