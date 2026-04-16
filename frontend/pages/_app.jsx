/**
 * TeamForge — Next.js App Root (_app.jsx)
 *
 * Wraps all pages with the Layout component and global CSS.
 */

import "../styles/globals.css";
import Layout from "../components/Layout";

export default function App({ Component, pageProps }) {
  return (
    <Layout title={Component.title}>
      <Component {...pageProps} />
    </Layout>
  );
}
