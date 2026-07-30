import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://figma-tracker.onrender.com";
const DEFAULT_TITLE = "Fimanu — Embeddable Figma Activity Widgets";

// OG/Twitter tags stay static in index.html and aren't overridden per-route:
// link-preview bots (Discord/Slack/Twitter) fetch raw HTML without running
// JS, so a Helmet-injected og:title would never reach them and would just
// sit duplicated alongside the static tag once the SPA hydrates.
//
// <title> is set via document.title directly rather than <Helmet><title>:
// on React 19, react-helmet-async hoists <title> as its own DOM node instead
// of reusing the static one already in index.html, leaving two <title>
// elements in the head. document.title mutates the existing node in place.
export default function Seo({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const url = `${SITE_URL}${path}`;

  useEffect(() => {
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);

  return (
    <Helmet>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
