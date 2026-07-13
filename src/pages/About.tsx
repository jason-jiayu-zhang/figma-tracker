import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";

const CONTACT = "jason.jiayu.zhang@gmail.com";

export default function About() {
  return (
    <LegalLayout title="About Fimanu" updated="July 13, 2026">
      <P>
        Fimanu turns your Figma activity into insights. Connect your Figma
        account and Fimanu tracks the files you care about — surfacing version
        history, comments, dev resources, and the story of how your designs
        evolve over time.
      </P>

      <H>What Fimanu does</H>
      <UL>
        <li>
          <strong>Tracks the files you choose</strong> — metadata, version
          history, comments, and dev resource links, kept in sync
          automatically.
        </li>
        <li>
          <strong>Visualizes your work</strong> — dashboards and insights that
          make design activity easy to understand at a glance.
        </li>
        <li>
          <strong>Shares on your terms</strong> — optional public profiles and
          embeddable widgets you control from Settings.
        </li>
      </UL>

      <H>Independently built</H>
      <P>
        Fimanu is an independently operated product, not affiliated with or
        endorsed by Figma. It connects to Figma through the official OAuth API
        and only reads the data needed to power your dashboards.
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
