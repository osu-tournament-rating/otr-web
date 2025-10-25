'use client';

import { useEffect } from 'react';

type ScalarInstance = {
  destroy?: () => void;
};

type ScalarGlobal = {
  createApiReference: (
    selector: string,
    config: Record<string, unknown>
  ) => ScalarInstance;
};

declare global {
  interface Window {
    Scalar?: ScalarGlobal;
  }
}

const SCALAR_SELECTOR = '#scalar-api-reference';

const baseConfig = {
  hideDownload: false,
  withDefaultFonts: true,
  showToolbar: 'never',
  hideClientButton: true,
  hideTestRequestButton: true,
  hideDarkModeToggle: true,
  url: '/spec.json',
};

export function ScalarApiReference() {
  useEffect(() => {
    const themeRoot = document.documentElement;
    let scalarInstance: ScalarInstance | null = null;
    let themeObserver: MutationObserver | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let appliedTheme: 'light' | 'dark' | null = null;

    const applyContainerSizing = () => {
      const container = document.querySelector<HTMLElement>(SCALAR_SELECTOR);
      if (!container) {
        return;
      }
      container.style.height = 'auto';
      container.style.minHeight = 'calc(100vh - var(--header-height-px))';
    };

    const getCurrentTheme = (): 'light' | 'dark' => {
      if (themeRoot.classList.contains('dark')) {
        return 'dark';
      }
      if (themeRoot.dataset?.theme === 'dark') {
        return 'dark';
      }
      return 'light';
    };

    const mountScalar = () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }

      if (!window.Scalar) {
        retryTimeout = setTimeout(mountScalar, 50);
        return;
      }

      const container = document.querySelector(SCALAR_SELECTOR);
      if (!container) {
        retryTimeout = setTimeout(mountScalar, 50);
        return;
      }

      if (scalarInstance?.destroy) {
        scalarInstance.destroy();
      }

      const desiredTheme = getCurrentTheme();

      scalarInstance = window.Scalar.createApiReference(SCALAR_SELECTOR, {
        ...baseConfig,
        forceDarkModeState: desiredTheme,
      });
      appliedTheme = desiredTheme;
      requestAnimationFrame(applyContainerSizing);
    };

    const handleThemeChange = () => {
      const desiredTheme = getCurrentTheme();
      if (desiredTheme !== appliedTheme) {
        mountScalar();
      }
    };

    mountScalar();

    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(handleThemeChange);
      themeObserver.observe(themeRoot, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }

    window.addEventListener('storage', handleThemeChange);

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (themeObserver) {
        themeObserver.disconnect();
        themeObserver = null;
      }
      window.removeEventListener('storage', handleThemeChange);
      if (scalarInstance?.destroy) {
        scalarInstance.destroy();
        scalarInstance = null;
      }
    };
  }, []);

  return null;
}
