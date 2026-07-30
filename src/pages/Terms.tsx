import React from "react";
import LegalLayout, { H, P, UL } from "../components/LegalLayout";
import Seo from "../components/Seo";
import { CONTACT_EMAIL as CONTACT } from "../config";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="July 13, 2026">
      <Seo
        title="Terms of Service — Fimanu"
        description="The terms that govern your access to and use of Fimanu, an independently operated Figma activity tracking product."
        path="/terms"
      />
      <P>
        These Terms of Service (“Terms”) govern your access to and use of Fimanu
        (the “Service”), an independently operated product. By connecting your
        Figma account or otherwise using the Service, you agree to these Terms. If
        you do not agree, do not use the Service.
      </P>

      <H>The Service</H>
      <P>
        Fimanu connects to your Figma account to track file activity and present
        insights, visualizations, public profiles, and embeds. Features may change
        over time as the Service evolves.
      </P>

      <H>Your Figma account</H>
      <P>
        To use Fimanu you must connect a valid Figma account and have the right to
        access the files you track. Your use of Figma remains subject to Figma’s
        own terms and policies, and you agree not to use Fimanu in any way that
        violates them. You are responsible for maintaining the security of your
        account and for all activity that occurs under it.
      </P>

      <H>Acceptable use</H>
      <P>You agree not to:</P>
      <UL>
        <li>Use the Service to access data you are not authorized to access.</li>
        <li>
          Attempt to disrupt, overload, reverse engineer, or gain unauthorized
          access to the Service or its infrastructure.
        </li>
        <li>Use the Service to violate any law or the rights of others.</li>
        <li>
          Resell, sublicense, or misrepresent the Service as your own without
          permission.
        </li>
      </UL>

      <H>Your content and data</H>
      <P>
        Your Figma files and the data within them remain yours. By using the
        Service, you grant Fimanu the permission needed to access, process, and
        display that data for the purpose of providing the Service to you, as
        described in our{" "}
        <a href="/privacy" className="text-blue hover:underline">
          Privacy Policy
        </a>
        . You are responsible for the content you choose to track and, if you
        enable a public profile or embed, for making that content publicly
        available.
      </P>

      <H>Public profiles</H>
      <P>
        If you enable a public profile or embed, you understand and agree that the
        activity and statistics you choose to share will be publicly accessible to
        anyone with the link. You can disable public sharing at any time in
        Settings.
      </P>

      <H>Disclaimer of warranties</H>
      <P>
        The Service is provided “as is” and “as available,” without warranties of
        any kind, whether express or implied, including warranties of
        merchantability, fitness for a particular purpose, and non-infringement.
        We do not warrant that the Service will be uninterrupted, error-free, or
        secure, or that any data will be accurate or preserved. Fimanu is not
        affiliated with or endorsed by Figma.
      </P>

      <H>Limitation of liability</H>
      <P>
        To the maximum extent permitted by law, Fimanu and its operator will not
        be liable for any indirect, incidental, special, consequential, or
        punitive damages, or for any loss of data, profits, or goodwill, arising
        out of or related to your use of the Service. Our total liability for any
        claim relating to the Service will not exceed one hundred U.S. dollars
        (US$100) or the amount you paid us in the twelve months before the claim,
        whichever is greater.
      </P>

      <H>Termination</H>
      <P>
        You may stop using the Service and delete your account at any time from
        Settings. We may suspend or terminate your access if you violate these
        Terms or if we discontinue the Service. You can also revoke Fimanu’s
        access from your Figma account settings at any time.
      </P>

      <H>Changes to these Terms</H>
      <P>
        We may update these Terms from time to time. When we do, we will revise the
        “Last updated” date above. Your continued use of the Service after changes
        take effect constitutes acceptance of the updated Terms.
      </P>

      <H>Governing law</H>
      <P>
        These Terms are governed by the laws of the State of California and the
        United States, without regard to conflict-of-laws principles. You agree
        that any dispute arising out of or relating to these Terms or the Service
        will be subject to the exclusive jurisdiction of the state and federal
        courts located in California.
      </P>

      <H>Contact</H>
      <P>
        Questions about these Terms? Email us at{" "}
        <a href={`mailto:${CONTACT}`} className="text-blue hover:underline">
          {CONTACT}
        </a>
        .
      </P>
    </LegalLayout>
  );
}
