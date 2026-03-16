import Link from "next/link";
import { Github, Linkedin } from "lucide-react";

const GITHUB_URL = "https://github.com/techVasanthsmart/DocMind";
const LINKEDIN_URL = "https://www.linkedin.com/in/vasanthkumar-s-0995a5185/";
const WEBSITE_URL = "https://vasanthubs.co.in/";
const AUTHOR_NAME = "Vasanth Kumar";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-white dark:bg-zinc-900 dark:border-zinc-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-muted font-medium text-center sm:text-left">
          <span>&copy; {new Date().getFullYear()} DocMind.</span>
          <span className="hidden sm:inline text-border dark:text-zinc-700">
            |
          </span>
          <span>
            Built by{" "}
            <Link
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-600 transition-colors font-bold hover:underline"
            >
              {AUTHOR_NAME}
            </Link>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors duration-200 dark:hover:text-accent"
            aria-label="GitHub"
          >
            <Github size={18} />
          </Link>

          <Link
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors duration-200 dark:hover:text-accent"
            aria-label="LinkedIn"
          >
            <Linkedin size={18} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
