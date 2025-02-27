import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Web3Provider } from '../contexts/useWeb3';
import dynamic from 'next/dynamic';
import React from 'react';

// Import Web3Provider with ssr: false to disable server-side rendering
const Web3ProviderNoSSR = dynamic(
  () => import('../contexts/useWeb3').then((mod) => mod.Web3Provider),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3ProviderNoSSR>
      <Component {...pageProps} />
    </Web3ProviderNoSSR>
  );
}

export default MyApp; 