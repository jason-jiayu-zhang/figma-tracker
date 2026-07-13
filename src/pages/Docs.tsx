import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";

const CONTACT = "jason.jiayu.zhang@gmail.com";

export default function Docs() {
  return (
    <LegalLayout title="Documentation" updated="July 13, 2026">
      <P>
        A quick guide to getting the most out of Fimanu. If you get stuck,
        email{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>

      <H>Getting started</H>
      <UL>
        <li>
          <strong>Connect Figma</strong> — sign in and authorize Fimanu through
          Figma's OAuth flow. You choose which files to track.
        </li>
        <li>
          <strong>Wait for the first sync</strong> — Fimanu pulls version
          history, comments, and dev resources for your selected files.
        </li>
        <li>
          <strong>Explore your dashboard</strong> — activity, insights, and file
          breakdowns update as your designs change.
        </li>
      </UL>

      <H>Tracking files</H>
      <P>
        Fimanu syncs the files you select on a recurring basis. Each sync records
        new versions, comments, and dev resource links so your activity history
        stays current. Manage which files are tracked from the Files tab.
      </P>

      <H>Public profiles and embeds</H>
      <P>
        You can optionally publish a public profile or embed a widget on another
        site to share selected stats. These are off by default — enable or
        disable them any time in Settings. Anything you make public becomes
        accessible to anyone with the link.
      </P>

      <H>Managing your account</H>
      <UL>
        <li>
          <strong>Revoke access</strong> — disconnect Fimanu from your Figma
          account settings at any time.
        </li>
        <li>
          <strong>Delete your data</strong> — remove your account and all tracked
          activity from Settings.
        </li>
      </UL>

      <H>Need help?</H>
      <P>
        Can't find what you're looking for? Reach out at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>{" "}
        and we'll help you out.
      </P>
    </LegalLayout>
  );
}
