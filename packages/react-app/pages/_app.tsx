import type { AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import '../styles/globals.css';

// Import Web3Provider with ssr: false to disable server-side rendering
const Web3ProviderNoSSR = dynamic(
  () => import('../contexts/Web3Provider').then((mod) => mod.default),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>BetM3 | Risk-Free Social Betting on Celo</title>
        <meta name="description" content="A decentralized betting platform where everyone wins. Create and join bets with friends while your stakes generate yield on Celo." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎲</text></svg>" />
      </Head>
      <Web3ProviderNoSSR>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Web3ProviderNoSSR>
    </>
  );
}
