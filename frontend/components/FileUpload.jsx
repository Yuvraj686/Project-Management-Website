/**
 * TeamForge — File Upload Component
 *
 * Drag-and-drop file uploader backed by AWS S3 (via backend).
 * Features:
 * - Drag area with visual feedback
 * - Upload progress indicator
 * - Preview for images
 * - Uploaded file URL display
 * - Max 50 MB, supports images/PDFs/code files
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, Loader } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function FilePreview({ file, url, onRemove }) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-xl border border-white/5 group">
      {isImage && url ? (
        <img src={url} alt={file.name} className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-surface-4 flex items-center justify-center">
          <FileText size={18} className="text-white/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{file.name}</p>
        <p className="text-xs text-white/40">
          {(file.size / 1024).toFixed(1)} KB
          {url && (
            <span className="ml-2 text-accent-green">
              <CheckCircle size={11} className="inline mr-1" />
              Uploaded
            </span>
          )}
        </p>
        {url && (
          <p className="text-xs text-brand-400 truncate mt-0.5">
            <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
              {url}
            </a>
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(file.name)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function FileUpload({ onUploadComplete }) {
  const [uploads, setUploads] = useState([]); // [{ file, url, uploading }]

  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error("Some files were rejected (too large or unsupported type)");
    }

    for (const file of accepted) {
      setUploads((prev) => [...prev, { file, url: null, uploading: true }]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await api.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.file.name === file.name ? { ...u, url: data.url, uploading: false } : u
          )
        );

        toast.success(`${file.name} uploaded successfully`);
        onUploadComplete?.(data);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
        setUploads((prev) =>
          prev.map((u) =>
            u.file.name === file.name ? { ...u, uploading: false, error: true } : u
          )
        );
      }
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: {
      "image/*": [],
      "application/pdf": [],
      "text/*": [],
      "application/json": [],
      "application/zip": [],
    },
  });

  const removeUpload = (name) => {
    setUploads((prev) => prev.filter((u) => u.file.name !== name));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
            : "border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
            isDragActive ? "bg-brand-500/20" : "bg-surface-3"
          )}>
            <Upload size={24} className={isDragActive ? "text-brand-400" : "text-white/40"} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {isDragActive ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-white/40 mt-1">
              or <span className="text-brand-400 font-medium">browse files</span>
            </p>
          </div>
          <p className="text-xs text-white/30">
            Images, PDFs, code files · Max 50 MB
          </p>
        </div>
      </div>

      {/* File list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(({ file, url, uploading }) => (
            <div key={file.name} className="relative">
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-end pr-3 z-10">
                  <Loader size={16} className="text-brand-400 animate-spin" />
                </div>
              )}
              <FilePreview file={file} url={url} onRemove={removeUpload} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
