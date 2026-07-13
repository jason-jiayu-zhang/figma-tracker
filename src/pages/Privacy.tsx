import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";

const CONTACT = "jason.jiayu.zhang@gmail.com";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 13, 2026">
      <P>
        This Privacy Policy explains how Fimanu (“Fimanu”, “we”, “us”) collects,
        uses, and protects your information when you use the Fimanu application
        and website (the “Service”). Fimanu is an independently operated product.
        If you have any questions, contact us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>
      <P>
        By connecting your Figma account and using the Service, you agree to the
        practices described in this policy.
      </P>

      <H>Information we collect</H>
      <P>
        Fimanu connects to Figma using OAuth. When you authorize the connection,
        we collect and store:
      </P>
      <UL>
        <li>
          <strong>Figma account details</strong> — your Figma user ID, display
          name, handle, email address, and avatar image, as provided by Figma.
        </li>
        <li>
          <strong>Figma authorization tokens</strong> — the OAuth access and
          refresh tokens that let Fimanu read your Figma data on your behalf, and
          the scopes you granted.
        </li>
        <li>
          <strong>Figma content data</strong> — for the files you choose to
          track, we store metadata and activity: file names, projects and teams,
          version history, comments (including the handles of collaborators who
          authored them), and dev resource links.
        </li>
        <li>
          <strong>Profile settings</strong> — including whether you have enabled
          a public profile and its public URL slug.
        </li>
        <li>
          <strong>Usage and diagnostic data</strong> — we plan to use PostHog for
          product analytics to understand how the Service is used and to improve
          it. This may include pages visited, actions taken, device and browser
          information, and approximate location derived from your IP address. If
          and when analytics are enabled, this section governs that collection.
        </li>
        <li>
          <strong>Cookies</strong> — we use a session cookie to keep you signed
          in. We do not use advertising cookies.
        </li>
      </UL>

      <H>Information about other people</H>
      <P>
        Because Fimanu tracks activity on Figma files, we may store limited
        information about your collaborators — such as the handle of a person who
        created a version or left a comment. We store this only as part of your
        files’ activity history and do not use it to build separate profiles of
        those individuals. If you are a collaborator and want your information
        removed, contact us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>

      <H>How we use your information</H>
      <UL>
        <li>To authenticate you and keep you signed in.</li>
        <li>
          To read your Figma files and display activity, insights, and
          visualizations back to you.
        </li>
        <li>To operate, maintain, secure, and improve the Service.</li>
        <li>
          To power public profiles and embeds that you explicitly choose to
          enable.
        </li>
        <li>To respond to your requests and communicate with you.</li>
      </UL>
      <P>
        We do not sell your personal information, and we do not use it for
        advertising.
      </P>

      <H>How your Figma tokens are handled</H>
      <P>
        Your OAuth access and refresh tokens are sensitive — they grant Fimanu
        permission to read your Figma data. We store them only to operate the
        Service, restrict access to them, and never share them with third parties
        except the infrastructure providers that host our systems. You can revoke
        Fimanu’s access at any time from your Figma account settings, or by
        deleting your Fimanu account.
      </P>

      <H>Service providers we share with</H>
      <P>
        We share information only with the vendors that help us run the Service,
        and only as needed for them to provide their services:
      </P>
      <UL>
        <li>
          <strong>Supabase</strong> — database and storage for your account and
          activity data.
        </li>
        <li>
          <strong>Our hosting provider</strong> — to run the application and
          serve the website.
        </li>
        <li>
          <strong>PostHog</strong> — product analytics (planned).
        </li>
        <li>
          <strong>Figma</strong> — the source of your account and file data, via
          its API.
        </li>
      </UL>
      <P>
        We may also disclose information if required by law, to protect our rights,
        or in connection with a merger, acquisition, or sale of assets.
      </P>

      <H>Public profiles and embeds</H>
      <P>
        Fimanu lets you optionally publish a public profile or embeddable widget.
        When you enable this, the activity and statistics you choose to share
        become publicly accessible to anyone with the link — they are no longer
        private. You can disable your public profile at any time in Settings,
        which removes public access going forward.
      </P>

      <H>Data retention and deletion</H>
      <P>
        We keep your data for as long as your account is active. You can delete
        your account and all associated data at any time from Settings, or by
        emailing us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        . When you delete your account, we delete your stored Figma tokens,
        profile, and tracked file activity. Some records may persist briefly in
        backups before being overwritten in the normal course of operations.
      </P>

      <H>Your rights</H>
      <P>
        Depending on where you live, you may have the right to access, correct,
        delete, or export your personal information, and to object to or restrict
        certain processing. California residents have rights under the CCPA/CPRA,
        and residents of the EU/UK have rights under the GDPR. We do not sell or
        “share” personal information as those terms are defined under California
        law. To exercise any of these rights, email us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        . We will not discriminate against you for exercising them.
      </P>

      <H>Security</H>
      <P>
        We take reasonable measures to protect your information, including access
        controls and encrypted connections. However, no method of transmission or
        storage is completely secure, and we cannot guarantee absolute security.
      </P>

      <H>Children</H>
      <P>
        Fimanu is not intended for anyone under 16, and we do not knowingly
        collect personal information from children.
      </P>

      <H>Changes to this policy</H>
      <P>
        We may update this Privacy Policy from time to time. When we do, we will
        revise the “Last updated” date above, and material changes may be
        communicated through the Service.
      </P>

      <H>Contact</H>
      <P>
        Questions or requests? Email us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>
    </LegalLayout>
  );
}
