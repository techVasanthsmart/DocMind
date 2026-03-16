"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X, AlertCircle, CheckCircle, CloudUpload } from "lucide-react";

interface FilePreviewItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "error" | "success";
  error?: string;
  progress?: number;
}

const SUPPORTED_FORMATS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  "application/vnd.ms-excel", // XLS
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
  "text/plain",
  "text/markdown",
];

const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".xls",
  ".pptx",
  ".txt",
  ".md",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface FileUploadPanelProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadStart?: () => void;
  disabled?: boolean;
}

export function FileUploadPanel({
  onFilesSelected,
  onUploadStart,
  disabled = false,
}: FileUploadPanelProps) {
  const [files, setFiles] = useState<FilePreviewItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds 10 MB limit`,
      };
    }

    // Check extension
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported format: ${ext}. Supported: PDF, DOCX, XLSX, PPTX, TXT, Markdown`,
      };
    }

    return { valid: true };
  };

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    const newItems: FilePreviewItem[] = fileArray.map((file) => {
      const validation = validateFile(file);
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        status: validation.valid ? "pending" : "error",
        error: validation.error,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);

    // Call callback with valid files only
    const validFiles = fileArray.filter((file, idx) => !newItems[idx].error);
    if (validFiles.length > 0 && onFilesSelected) {
      onFilesSelected(validFiles);
      toast.success(`✓ ${validFiles.length} file(s) ready to upload`);
    }

    // Show error toast for invalid files
    const invalidFiles = newItems.filter((f) => f.error);
    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        if (file.error) {
          toast.error(`✗ ${file.name}: ${file.error}`);
        }
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validFiles = files.filter((f) => !f.error);

  return (
    <div className="w-full space-y-4">
      {/* Clean Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 transition-all text-center
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${
            isDragging && !disabled
              ? "border-accent bg-accent/5 dark:bg-accent/10"
              : "border-border bg-gray-50 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-2">
          <div className="flex justify-center">
            {isDragging ? (
              <CloudUpload className="w-10 h-10 text-accent animate-bounce" />
            ) : (
              <Upload className="w-10 h-10 text-muted" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground dark:text-white">
              {isDragging ? "Drop files here" : "Drag files or click to upload"}
            </p>
            <p className="text-sm text-muted mt-1">
              PDF, DOCX, XLSX, PPTX, TXT, Markdown • Max 10 MB each
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">
            Files ({validFiles.length}{" "}
            {validFiles.length === 1 ? "valid" : "valid"}
            {files.length > validFiles.length
              ? ` • ${files.length - validFiles.length} invalid`
              : ""}
            )
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {files.map((file, idx) => {
              const isValid = !file.error;

              return (
                <div
                  key={file.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${
                        isValid
                          ? "border-border bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900"
                          : "border-error/30 bg-error/5 dark:bg-error/10"
                      }
                    `}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate dark:text-white">
                        {file.name}
                      </p>
                      {isValid ? (
                        <p className="text-xs text-muted">
                          {formatFileSize(file.size)}
                        </p>
                      ) : (
                        <p className="text-xs text-error font-medium">
                          {file.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isValid ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error" />
                      )}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-muted transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
