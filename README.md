# DocMind - RAG Chat Application

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-blue)
![LangChain](https://img.shields.io/badge/LangChain-Integration-green)
![OpenAI](https://img.shields.io/badge/OpenAI-Powered-purple)
![Open Source](https://img.shields.io/badge/Open_Source-Yes-orange)
![No Login](https://img.shields.io/badge/No_Login_Required-Yes-teal)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Now-success)](https://docmind.vercel.app)

**DocMind** is a cutting-edge Retrieval-Augmented Generation (RAG) agent capable of ingesting websites and enabling users to chat with their content in real-time. Built with a focus on accuracy, performance, and a premium user experience.

## 🚀 Features

- **Website Ingestion**: Seamlessly crawl and extract content from any URL using Puppeteer.
- **Smart Chunking**: Intelligent text splitting using LangChain's RecursiveCharacterTextSplitter.
- **Vector Search**: High-performance similarity search using in-memory vector stores (scalable to ChromaDB/Pinecone).
- **Context-Aware Responses**: Uses OpenAI's advanced models to generate accurate answers based *only* on the ingested content.
- **Anti-Hallucination**: Engineered prompts to strictly adhere to the provided context.
- **Modern UI**: A beautiful, responsive interface built with Tailwind CSS v4 and glassmorphism design principles.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI Orchestration**: [LangChain.js](https://js.langchain.com/)
- **LLM**: [OpenAI GPT-4o/GPT-3.5-turbo](https://openai.com/)
- **Web Scraping**: [Puppeteer](https://pptr.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏗️ Architecture

The application follows a streamlined RAG pipeline:

1.  **Ingest**: User provides a URL.
2.  **Load**: Puppeteer visits the page and extracts text content.
3.  **Split**: Content is divided into manageable chunks with overlap to preserve context.
4.  **Embed**: Chunks are converted into vector embeddings using OpenAI Embeddings.
5.  **Store**: Vectors are stored in a memory vector store for fast retrieval.
6.  **Retrieve**: User queries are embedded and compared against the store to find relevant chunks.
7.  **Generate**: The LLM synthesizes an answer using the retrieved chunks as context.

## ⚡ Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- OpenAI API Key

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/techVasanthsmart/DocMind.git
    cd DocMind
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables**

    Create a `.env.local` file in the root directory:

    ```env
    OPENAI_API_KEY=sk-your-openai-api-key
    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

5.  **Open the app**

    Visit [http://localhost:3000](http://localhost:3000) to start chatting with your websites!

## 💡 Project Name Ideas

We are constantly evolving! Here are some names we define this project by:

1.  **DocMind** (Current)
2.  **ChatStream RAG**
3.  **IntellectFlow**
4.  **Synapse AI**
5.  **Contextify**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 👤 Author

**Vasanth Kumar**

- Website: [Portfolio](https://techvasanthsmart.github.io)
- GitHub: [@techVasanthsmart](https://github.com/techVasanthsmart)
- LinkedIn: [Vasanth Kumar](https://www.linkedin.com/in/vasanthkumar-s-0995a5185/)

---

Made with ❤️ by Vasanth Kumar. Open Source for the Community.
