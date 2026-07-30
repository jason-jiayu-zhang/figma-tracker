import React from "react";
import { Link } from "react-router";
import imgFooterSVG from "../assets/footer.svg";
import imgFimanuLogoFull from "../assets/fimanu-logo-full.svg";
import { CONTACT_EMAIL } from "../config";

const Footer: React.FC = () => {
  return (
    <div className="w-full flex justify-center pb-12 mt-12">
      <footer className="bg-surface flex h-[551px] items-start justify-between overflow-hidden px-24 py-12 relative rounded-4xl shadow-card w-[1080px] max-w-[calc(100vw-32px)]">
        {/* Background Layer with the SVG Wave */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <img
            alt=""
            className="block w-full h-full object-cover object-bottom"
            src={imgFooterSVG}
          />
        </div>

        {/* Content Layer above the SVG */}
        <div className="relative z-10 w-full flex justify-between items-start gap-8 flex-wrap">
          <div className="flex flex-col font-sans font-normal gap-3 items-start">
            <p className="text-body text-[14px] tracking-[-0.14px] mb-1">
              NAVIGATION
            </p>
            <Link to="/files" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Files
            </Link>
            <Link to="/studio" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Studio
            </Link>
            <Link to="/settings" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Settings
            </Link>
          </div>
          <div className="flex flex-col font-sans font-normal gap-3 items-start">
            <p className="text-body text-[14px] tracking-[-0.14px] mb-1">
              RESOURCES
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[16px] text-ink tracking-[-0.16px] hover:underline"
            >
              Email
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Fimanu%20Feedback`}
              className="text-[16px] text-ink tracking-[-0.16px] hover:underline"
            >
              Feedback
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Fimanu%20Bug%20Report`}
              className="text-[16px] text-ink tracking-[-0.16px] hover:underline"
            >
              Report a Bug
            </a>
          </div>
          <div className="flex flex-col font-sans font-normal gap-3 items-start">
            <p className="text-body text-[14px] tracking-[-0.14px] mb-1">
              ABOUT
            </p>
            <Link to="/about" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              About
            </Link>
            <Link to="/docs" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Documentation
            </Link>
          </div>
          <div className="flex flex-col font-sans font-normal gap-3 items-start">
            <p className="text-body text-[14px] tracking-[-0.14px] mb-1">
              LEGAL
            </p>
            <Link to="/privacy" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-[16px] text-ink tracking-[-0.16px] hover:underline">
              Terms and Conditions
            </Link>
          </div>
        </div>

        {/* Logo at bottom right */}
        <div className="absolute bottom-[30px] right-[29.71px] h-12 w-[205.287px]">
          <img
            alt=""
            className="block max-w-none size-full transition-transform hover:scale-105 duration-300"
            src={imgFimanuLogoFull}
          />
        </div>
      </footer>
    </div>
  );
};

export default Footer;
