import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { SWRConfig } from "swr";
import { defaults } from "chart.js";

defaults.font = {
  ...defaults.font,
  family: "Satoshi",
  size: 16,
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1,900,700,500,300,400&display=swap"
          rel="stylesheet"
        />
      </Head>
      <SWRConfig
        value={{
          fetcher: (resource, init) =>
            fetch(resource, init).then((res) => res.json()),
        }}
      >
        <Component {...pageProps} />
      </SWRConfig>
    </>
  );
}

export default MyApp;
