import React from "react";

export const Logo = ({
  className = "w-8 h-8",
  textSize = "text-xl",
}: {
  className?: string;
  textSize?: string;
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`${className} flex items-center justify-center`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <rect width="32" height="32" rx="8" fill="url(#logo_gradient)" />
          <path
            d="M10 9H22C23.1 9 24 9.9 24 11V21C24 22.1 23.1 23 22 23H10C8.9 23 8 22.1 8 21V11C8 9.9 8.9 9 10 9Z"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 14H20"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 18H16"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="22"
            cy="23"
            r="3"
            fill="#A78BFA"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M22 23L26 27"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient
              id="logo_gradient"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#9333EA" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className={`font-bold text-foreground dark:text-white ${textSize}`}>
        DocMind
      </span>
    </div>
  );
};
