import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";
import Seo from "../components/Seo";
import { CONTACT_EMAIL as CONTACT } from "../config";

export default function About() {
  return (
    <LegalLayout title="About Fimanu" updated="July 13, 2026">
      <Seo
        title="About — Fimanu"
        description="Fimanu turns your Figma activity into embeddable widgets: activity heatmaps, streak badges, and file breakdowns for your README, Notion, or portfolio."
        path="/about"
      />
      <P>
        Fimanu turns your Figma activity into embeddable widgets. Connect your
        Figma account and Fimanu tracks the files you care about — version
        history, comments, and dev resources — then hands you an activity
        heatmap, streak badge, or file breakdown you can drop into a README,
        Notion page, or portfolio.
      </P>

      <H>What Fimanu does</H>
      <UL>
        <li>
          <strong>Tracks the files you choose</strong> — metadata, version
          history, comments, and dev resource links, kept in sync
          automatically.
        </li>
        <li>
          <strong>Visualizes your work</strong> — a Studio editor for styling
          heatmaps, streak badges, and file breakdowns until they match wherever
          they're going.
        </li>
        <li>
          <strong>Shares on your terms</strong> — embeds publish only when you
          turn publishing on, and you can turn it back off from Settings.
        </li>
      </UL>

      <H>Independently built</H>
      <P>
        Fimanu is an independently operated product, not affiliated with or
        endorsed by Figma. It connects to Figma through the official OAuth API
        and only reads the data needed to power your embeds.
      </P>

      <H>Get in touch</H>
      <P>
        Questions, ideas, or feedback? Email{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>
    </LegalLayout>
  );
}
