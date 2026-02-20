import Link from "next/link";
import { Github, Linkedin } from "lucide-react";

const GITHUB_URL = "https://github.com/techVasanthsmart/DocMind";
const LINKEDIN_URL = "https://www.linkedin.com/in/vasanthkumar-s-0995a5185/";
const AUTHOR_NAME = "Vasanth Kumar";

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white/50 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <span>
                &copy; {new Date().getFullYear()} DocMind.
            </span>
            <span className="hidden sm:inline text-gray-400">|</span>
            <span>
                Built by <Link href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-indigo-600 transition-colors font-bold hover:underline">{AUTHOR_NAME}</Link>
            </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900 transition-colors duration-200"
            aria-label="GitHub"
          >
            <Github size={18} />
          </Link>

          <Link
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-600 transition-colors duration-200"
            aria-label="LinkedIn"
          >
            <Linkedin size={18} />
          </Link>
        </div>

      </div>
    </footer>
  );
}
