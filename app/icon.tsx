import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="8" fill="#6366F1" />
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
            d="M22 23L26 25"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
