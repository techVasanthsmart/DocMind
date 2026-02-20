import Link from "next/link";
import { Github, Linkedin } from "lucide-react";

const GITHUB_URL = "https://github.com/techVasanthsmart";
const LINKEDIN_URL = "https://www.linkedin.com/in/vasanthkumar-s-0995a5185/";
const AUTHOR_NAME = "Vasanth Kumar";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/20 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} DocuMind.
            </span>
            <span className="hidden sm:inline text-gray-600">|</span>
            <span className="text-gray-400 text-sm">
                Built by <Link href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors font-medium hover:underline">{AUTHOR_NAME}</Link>
            </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="GitHub"
          >
            <Github size={18} />
          </Link>

          <Link
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-400 transition-colors duration-200"
            aria-label="LinkedIn"
          >
            <Linkedin size={18} />
          </Link>
        </div>

      </div>
    </footer>
  );
}
