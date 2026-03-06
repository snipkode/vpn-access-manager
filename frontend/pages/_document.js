import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>
      <body className="m-0 p-0 min-h-screen font-sans bg-black">
        <Main />
        <NextScript />
        {isDev && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/eruda';
                  script.onload = function() {
                    if (window.eruda) {
                      window.eruda.init({
                        defaults: {
                          displaySize: 50,
                          transparency: 0.9,
                          theme: 'dark'
                        }
                      });
                      window.eruda.show();
                      console.log('🔧 Eruda dev tools initialized');
                    }
                  };
                  document.head.appendChild(script);
                })();
              `,
            }}
          />
        )}
      </body>
    </Html>
  );
}
