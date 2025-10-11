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

              function applyContainerSizing() {
                var container = document.querySelector(selector);
                if (!container) {
                  return;
                }
                container.style.height = 'auto';
                container.style.minHeight =
                  'calc(100vh - var(--header-height-px))';
              }

              if (!window || !window.Scalar) {
                setTimeout(initScalar, 50);
                return;
              }

              applyContainerSizing();

              window.Scalar.createApiReference(selector, {
                theme: 'auto',
                hideDownload: false,
                withDefaultFonts: true,
                showToolbar: "never",
                hideClientButton: true,
                hideTestRequestButton: true,
                url: '/spec.json',
              });

              requestAnimationFrame(applyContainerSizing);
            })();
          `,
        }}
      />
    </div>
  );
}
