"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { Download, FileStack, FileText, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { canPreviewInline, getFileExtension, getFileNameFromPath } from "@/lib/files/preview";
import { getStorageSignedUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type FileViewerRequest = {
  filePath: string;
  title?: string;
  documentId?: string;
};

type FileViewerContextValue = {
  openFile: (filePath: string, title?: string, documentId?: string) => Promise<void>;
  closeFile: () => void;
};

const FileViewerContext = createContext<FileViewerContextValue | null>(null);

export function useFileViewer() {
  const context = useContext(FileViewerContext);

  if (!context) {
    throw new Error("useFileViewer doit etre utilise dans FileViewerProvider.");
  }

  return context;
}

export function FileViewerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<FileViewerRequest | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cover" | "file">("cover");

  const closeFile = useCallback(() => {
    setRequest(null);
    setSignedUrl(null);
    setError(null);
    setLoading(false);
    setActiveTab("cover");
  }, []);

  const openFile = useCallback(async (filePath: string, title?: string, documentId?: string) => {
    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      toast.error("Aucun fichier n'est joint a cette fiche.");
      return;
    }

    setRequest({ filePath: trimmedPath, title, documentId });
    setActiveTab("cover");
    setLoading(true);
    setError(null);
    setSignedUrl(null);

    try {
      const url = await getStorageSignedUrl(trimmedPath, 600);
      setSignedUrl(url);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Impossible de preparer l'apercu du fichier.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!request) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeFile();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [request, closeFile]);

  const value = useMemo(() => ({ openFile, closeFile }), [openFile, closeFile]);

  const fileName = request ? getFileNameFromPath(request.filePath) : "";
  const displayTitle = request?.title ?? fileName;
  const inlinePreview = request ? canPreviewInline(request.filePath) : false;
  const hasCover = Boolean(request?.documentId);
  const coverUrl = request?.documentId ? `/api/documents/${request.documentId}/report` : null;

  return (
    <FileViewerContext.Provider value={value}>
      {children}
      {request ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17306b]/55 p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={displayTitle}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fermer l'apercu"
            onClick={closeFile}
          />
          <div
            className={cn(
              "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded border border-[#b9def4] bg-white shadow-2xl",
              "max-w-6xl"
            )}
          >
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-2 border-b border-[#d5edf8] bg-[linear-gradient(90deg,#2749a0,#00a9da)] px-4 py-3 text-white shadow-[inset_0_-2px_0_#ffcd12] md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] font-semibold uppercase text-[#fff4b8]">
                  Visualisation document
                </div>
                <h2 className="truncate text-base font-semibold">{displayTitle}</h2>
                <p className="truncate text-xs text-white/85">{request.filePath}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {signedUrl ? (
                  <a
                    href={signedUrl}
                    download={fileName}
                    className="inline-flex min-h-9 items-center gap-2 rounded border border-white/40 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                    Telecharger
                  </a>
                ) : null}
                {coverUrl ? (
                  <a
                    href={coverUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-2 rounded border border-white/40 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <FileStack className="h-4 w-4" />
                    Imprimer fiche
                  </a>
                ) : null}
                <button
                  type="button"
                  title="Fermer"
                  aria-label="Fermer"
                  onClick={closeFile}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded border border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs — only when we have a documentId */}
            {hasCover ? (
              <div className="flex shrink-0 border-b border-[#d5edf8] bg-white">
                <button
                  type="button"
                  onClick={() => setActiveTab("cover")}
                  className={cn(
                    "flex items-center gap-2 border-r border-[#d5edf8] px-4 py-2 text-xs font-semibold transition",
                    activeTab === "cover"
                      ? "bg-[#fff4b8] text-[#2749a0] shadow-[inset_0_-2px_0_#ffcd12]"
                      : "text-slate-500 hover:bg-[#f0f8ff] hover:text-[#2749a0]"
                  )}
                >
                  <FileStack className="h-3.5 w-3.5" />
                  Fiche &amp; signatures
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("file")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-semibold transition",
                    activeTab === "file"
                      ? "bg-[#fff4b8] text-[#2749a0] shadow-[inset_0_-2px_0_#ffcd12]"
                      : "text-slate-500 hover:bg-[#f0f8ff] hover:text-[#2749a0]"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Document original
                </button>
              </div>
            ) : null}

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-auto bg-[#eef9fd]">

              {/* COMBINED VIEW: cover on top, file below — bhal qualios */}
              {hasCover && activeTab === "cover" && coverUrl ? (
                <div className="flex flex-col gap-0">
                  {/* Fiche de couverture avec signatures */}
                  <div className="border-b-4 border-[#ffcd12]">
                    <iframe
                      title={`Fiche de couverture — ${displayTitle}`}
                      src={coverUrl}
                      className="w-full border-0 bg-white"
                      style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
                    />
                  </div>

                  {/* Document original en dessous */}
                  {signedUrl && inlinePreview ? (
                    <div>
                      <div className="flex items-center gap-2 bg-[#2749a0] px-4 py-2 text-xs font-semibold text-white">
                        <FileText className="h-3.5 w-3.5" />
                        Document original
                      </div>
                      {getFileExtension(request.filePath) === "pdf" ? (
                        <iframe
                          title={`Document — ${displayTitle}`}
                          src={signedUrl}
                          className="w-full border-0 bg-white"
                          style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={signedUrl}
                          alt={displayTitle}
                          className="mx-auto max-w-full bg-white object-contain p-4"
                        />
                      )}
                    </div>
                  ) : signedUrl ? (
                    <div className="flex flex-col items-center gap-4 bg-white px-4 py-8 text-center text-sm text-slate-600">
                      <FileText className="h-8 w-8 text-[#2749a0]" />
                      <p>Fichier joint disponible au téléchargement</p>
                      <a
                        href={signedUrl}
                        download={fileName}
                        className="inline-flex min-h-10 items-center gap-2 rounded border border-[#2749a0] bg-[#2749a0] px-4 text-sm font-semibold text-white hover:bg-[#1f3f91]"
                      >
                        <Download className="h-4 w-4" />
                        Telecharger le fichier
                      </a>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center bg-white py-8 text-sm text-slate-500">
                      Chargement du document...
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* File-only tab or no cover */}
              {(!hasCover || activeTab === "file") ? (
                <div className="p-3">
                  {loading ? (
                    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-600">
                      Chargement du document...
                    </div>
                  ) : error ? (
                    <div className="border border-[#f1c4c4] bg-[#fff7f7] px-4 py-6 text-sm text-danger">
                      {error}
                    </div>
                  ) : signedUrl && inlinePreview ? (
                    getFileExtension(request.filePath) === "pdf" ? (
                      <iframe
                        title={displayTitle}
                        src={signedUrl}
                        className="h-[min(78vh,900px)] w-full border border-[#b9def4] bg-white"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signedUrl}
                        alt={displayTitle}
                        className="mx-auto max-h-[78vh] w-auto max-w-full border border-[#b9def4] bg-white object-contain"
                      />
                    )
                  ) : signedUrl ? (
                    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center text-sm text-slate-600">
                      <p>
                        Ce format ne peut pas etre affiche directement. Telechargez-le pour le consulter.
                      </p>
                      <a
                        href={signedUrl}
                        download={fileName}
                        className="inline-flex min-h-10 items-center gap-2 rounded border border-[#2749a0] bg-[#2749a0] px-4 text-sm font-semibold text-white hover:bg-[#1f3f91]"
                      >
                        <Download className="h-4 w-4" />
                        Telecharger le fichier
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </FileViewerContext.Provider>
  );
}
