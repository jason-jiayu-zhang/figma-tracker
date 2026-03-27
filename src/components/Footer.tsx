import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <div className="w-full flex justify-center pb-12 mt-12">
      <footer className="bg-white flex h-[551px] items-start justify-between overflow-hidden px-[96px] py-[48px] relative rounded-[32px] shadow-[0px_2px_5px_0px_rgba(107,97,75,0.25)] w-[1020px] max-w-[calc(100vw-32px)]">
        {/* Background Layer with the SVG Wave */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <img
            alt=""
            className="block w-full h-full object-cover object-bottom"
            src="/assets/FooterSVG.svg"
          />
        </div>

        {/* Content Layer above the SVG */}
        <div className="relative z-10 w-full flex justify-between items-start gap-8 flex-wrap">
          <div className="flex flex-col font-sans font-normal gap-[12px] items-start">
            <p className="text-[#737373] text-[14px] tracking-[-0.14px] mb-1">
              NAVIGATION
            </p>
            <Link to="/" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Dashboard
            </Link>
            <Link to="/files" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Files
            </Link>
            <Link to="/settings" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Settings
            </Link>
            <Link to="/embed" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Embed
            </Link>
          </div>
          <div className="flex flex-col font-sans font-normal gap-[12px] items-start">
            <p className="text-[#737373] text-[14px] tracking-[-0.14px] mb-1">
              RESOURCES
            </p>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Email
            </Link>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Feedback
            </Link>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Report a Bug
            </Link>
          </div>
          <div className="flex flex-col font-sans font-normal gap-[12px] items-start">
            <p className="text-[#737373] text-[14px] tracking-[-0.14px] mb-1">
              ABOUT
            </p>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              About
            </Link>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Documentation
            </Link>
          </div>
          <div className="flex flex-col font-sans font-normal gap-[12px] items-start">
            <p className="text-[#737373] text-[14px] tracking-[-0.14px] mb-1">
              LEGAL
            </p>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Privacy Policy
            </Link>
            <Link to="#" className="text-[16px] text-black tracking-[-0.16px] hover:underline">
              Terms and Conditions
            </Link>
          </div>
        </div>

        {/* Logo at bottom right */}
        <div className="absolute bottom-[30px] right-[29.71px] h-[48px] w-[205.287px]">
          <img
            alt=""
            className="block max-w-none size-full transition-transform hover:scale-105 duration-300"
            src="/assets/FimanuLogoFull.svg"
          />
        </div>
      </footer>
    </div>
  );
};

export default Footer;
