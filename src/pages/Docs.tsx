import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";
import { CONTACT_EMAIL as CONTACT } from "../config";

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
          <strong>Design your embeds</strong> — open Studio to style an activity
          heatmap, streak badge, or file breakdown, then copy the embed code into
          a README, Notion page, or portfolio.
        </li>
      </UL>

      <H>Tracking files</H>
      <P>
        Fimanu syncs the files you select on a recurring basis. Each sync records
        new versions, comments, and dev resource links so your activity history
        stays current. Manage which files are tracked from the Files tab.
      </P>

      <H>Embeds</H>
      <P>
        Embeds are addressed by the public handle you set in Settings, and they
        only render while publishing is enabled. Publishing is off by default —
        turn it on or off any time in Settings. Anything you publish becomes
        accessible to anyone with the link, without signing in.
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
