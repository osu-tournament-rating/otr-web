import Script from 'next/script';

export const metadata = {
  title: 'o!TR API Reference',
  description: 'Interactive documentation for public o!TR API endpoints.',
};

export default function SpecPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div id="scalar-api-reference" className="h-screen" />
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
              if (!window || !window.Scalar) {
                setTimeout(initScalar, 50);
                return;
              }

              window.Scalar.createApiReference('#scalar-api-reference', {
                theme: 'auto',
                hideDownload: false,
                withDefaultFonts: true,
                showToolbar: "never",
                hideClientButton: true,
                hideTestRequestButton: true,
                url: '/spec.json',
              });
            })();
          `,
        }}
      />
    </div>
  );
}
