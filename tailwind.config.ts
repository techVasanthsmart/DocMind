import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3730A3",
          800: "#312E81",
          900: "#1E1B4B",
        },
        foreground: "#09090B",
        muted: {
          DEFAULT: "#E4E4E7",
          foreground: "#71717A",
        },
        border: "#E4E4E7",
        success: "#16A34A",
        warning: "#D97706",
        error: "#DC2626",
      },
      spacing: {
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        12: "48px",
      },
      borderRadius: {
        xs: "8px",
        sm: "10px",
        base: "12px",
        lg: "14px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0,0,0,0.05)",
        sm: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        card: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)",
        md: "0 10px 15px -3px rgba(0,0,0,0.1)",
        lg: "0 20px 25px -5px rgba(0,0,0,0.1)",
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        "float-1": "float 4s ease-in-out infinite 0.2s",
        "float-2": "float 4s ease-in-out infinite 0.4s",
        "float-3": "float 4s ease-in-out infinite 0.6s",
        "float-4": "float 4s ease-in-out infinite 0.8s",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
      transitionDuration: {
        150: "150ms",
        250: "250ms",
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#09090B",
            a: {
              color: "#4F46E5",
              textDecoration: "none",
              "&:hover": {
                color: "#4338CA",
              },
            },
            code: {
              backgroundColor: "#F4F4F5",
              color: "#09090B",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
              fontSize: "0.875em",
              fontWeight: "500",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            pre: {
              backgroundColor: "#F4F4F5",
              color: "#09090B",
              border: "1px solid #E4E4E7",
              borderRadius: "0.5rem",
            },
            "pre code": {
              backgroundColor: "transparent",
              color: "inherit",
              padding: "0",
            },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
