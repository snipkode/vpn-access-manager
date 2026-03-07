import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <Html lang="en">
      <Head>
        {/* Google Material Icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Sharp"
        />
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
