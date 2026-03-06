import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>
      <body className="m-0 p-0 min-h-screen font-sans bg-black">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
