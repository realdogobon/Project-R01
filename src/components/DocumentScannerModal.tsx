import React, { useState, useEffect } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { motion, AnimatePresence } from "motion/react";
import { useResizable } from "../hooks/useResizable";
import { SmoothInput } from "./ui/SmoothInputs";
import {
  X,
  Settings,
  Minus,
  Square,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Share,
  Send,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  Crop as CropIcon,
  RotateCcw,
  FlipHorizontal,
  Scissors,
  FolderOpen,
  FileText,
  Sparkles,
  CheckCircle
} from "lucide-react";

const TopScannerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export interface DocumentScannerModalProps {
  isScannerOpen: boolean;
  onClose: () => void;
  scannerFile: File | null;
  scannerPreviewUrl: string;
  scannerPreviewUrl2?: string;
  scannerStitchedUrl?: string;
  setScannerPreviewUrl: (url: string) => void;
  scannerZoom: number;
  setScannerZoom: React.Dispatch<React.SetStateAction<number>>;
  scannerPage: number;
  setScannerPage: React.Dispatch<React.SetStateAction<number>>;
  scannerTotalPages: number;
  setScannerTotalPages: React.Dispatch<React.SetStateAction<number>>;
  scannerLogs: string[];
  setScannerLogs: React.Dispatch<React.SetStateAction<string[]>>;
  isOcrLoading: boolean;
  scannerPdfDoc: any;
  scannerCrop: Crop | undefined;
  setScannerCrop: (crop: Crop | undefined) => void;
  cropQueue: Array<any>;
  setCropQueue: React.Dispatch<React.SetStateAction<Array<any>>>;
  scannerImgRef: React.RefObject<HTMLImageElement>;

  scannerProMode: "standard" | "book" | "idcard" | "erasewritings";
  setScannerProMode: React.Dispatch<React.SetStateAction<"standard" | "book" | "idcard" | "erasewritings">>;

  idCardFront: string | null;
  setIdCardFront: (url: string | null) => void;
  idCardBack: string | null;
  setIdCardBack: (url: string | null) => void;
  idCardStep: "front" | "back" | "ready";
  setIdCardStep: React.Dispatch<React.SetStateAction<"front" | "back" | "ready">>;

  eraseTolerance: number;
  setEraseTolerance: (val: number) => void;
  detectedQrCodes: string[];

  applyHandwritingEraser: () => void;
  dewarpBookSpread: () => void;
  spliceIDCards: () => void;
  handleAddToQueue: () => void;
  handleAutoDetectCrops: () => void;
  handlePageChange: (newPage: number) => Promise<void>;
  executeExtraction: () => Promise<string>;

  isPrivacyMode: boolean;
  setIsPrivacyMode: (val: boolean) => void;

  ocrResult: string;
  setOcrResult: React.Dispatch<React.SetStateAction<string>>;
  ocrError: string;

  isTranslating: boolean;
  handleTranslate: (lang: string) => Promise<void>;
  scanQRCodesOnDocument: () => Promise<void>;

  loadOcrIntoEditor: (forcedText?: string) => void;
  saveOcrIntoRag: (forcedText?: string, customTitle?: string) => Promise<void>;
  loadOcrIntoPractice: (forcedText?: string) => void;
  isRagIndexing: boolean;
  themeAccentColor?: string;

  scannerRotation: number;
  setScannerRotation: React.Dispatch<React.SetStateAction<number>>;
  scannerScaleX: number;
  setScannerScaleX: React.Dispatch<React.SetStateAction<number>>;
  scannerScaleY: number;
  setScannerScaleY: React.Dispatch<React.SetStateAction<number>>;
  isCropEnabled: boolean;
  setIsCropEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isEnhancementOpen: boolean;
  setIsEnhancementOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onFileUpload?: (file: File) => Promise<void>;

  selectedScanner: string;
  setSelectedScanner: React.Dispatch<React.SetStateAction<string>>;
  selectedFileType: string;
  setSelectedFileType: React.Dispatch<React.SetStateAction<string>>;
  selectedColourMode: string;
  setSelectedColourMode: React.Dispatch<React.SetStateAction<string>>;
  selectedResolution: string;
  setSelectedResolution: React.Dispatch<React.SetStateAction<string>>;
  selectedDestinationFolder: string;
  setSelectedDestinationFolder: React.Dispatch<React.SetStateAction<string>>;
  onDiscardCurrentDocument?: () => void;
  scannerProgress?: { currentIndex: number, total: number, status: 'idle' | 'scanning' | 'success' | 'error' };
  userName?: string;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isScannerOpen,
  onClose,
  scannerPreviewUrl,
  scannerPreviewUrl2,
  scannerStitchedUrl,
  setScannerPreviewUrl,
  scannerZoom,
  setScannerZoom,
  scannerPage,
  scannerTotalPages,
  isOcrLoading,
  scannerCrop,
  setScannerCrop,
  scannerImgRef,
  handlePageChange,
  executeExtraction,
  scannerProgress,
  userName,
  loadOcrIntoPractice,
  loadOcrIntoEditor,
  saveOcrIntoRag,
  ocrResult,
  onDiscardCurrentDocument,
  scannerRotation,
  setScannerRotation,
  scannerScaleX,
  setScannerScaleX,
  scannerScaleY,
  setScannerScaleY,
  isCropEnabled,
  setIsCropEnabled,
  cropQueue,
  setCropQueue,
  handleAddToQueue,
  scannerTotalPages: totalPages,
  onFileUpload,
  themeAccentColor,

  selectedScanner,
  setSelectedScanner,
  selectedFileType,
  setSelectedFileType,
  selectedColourMode,
  setSelectedColourMode,
  selectedResolution,
  setSelectedResolution,
  selectedDestinationFolder,
  setSelectedDestinationFolder,
}) => {
  const { width, height, x, y, startResize } = useResizable({
    persistKey: 'scanner_v2',
    initialWidth: 860,
    initialHeight: 650
  });

  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const activeAccent = themeAccentColor || "#C28181";
  const hasDocumentLoaded = !!(scannerPreviewUrl || scannerPreviewUrl2 || scannerStitchedUrl);

  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [pendingTextToSend, setPendingTextToSend] = useState("");
  const [shakePath, setShakePath] = useState(false);
  const [showPathRequiredError, setShowPathRequiredError] = useState(false);

  const isTextReady = !!ocrResult?.trim();

  const handleSendToPath = async () => {
    if (!selectedDestinationFolder) {
      setShakePath(true);
      setShowPathRequiredError(true);
      setTimeout(() => setShakePath(false), 600);
      return;
    }

    const textToSend = ocrResult || "";
    if (!textToSend.trim()) return;

    if (selectedDestinationFolder === "typing_practice") {
      loadOcrIntoPractice(textToSend);
      onClose(); // Ensure modal closes
    } else if (selectedDestinationFolder === "doc_editor") {
      loadOcrIntoEditor(textToSend);
      onClose();
    } else if (selectedDestinationFolder === "memory_library") {
      setPendingTextToSend(textToSend);
      setSaveAsName(`Scan Note ${new Date().toLocaleDateString()}`);
      setShowSaveAsDialog(true);
    }
  };

  const handleSaveAsSubmit = async () => {
    if (!saveAsName.trim()) return;
    await saveOcrIntoRag(pendingTextToSend, saveAsName);
    setShowSaveAsDialog(false);
    onClose();
  };

  const getImageFilterStyle = () => {
    if (selectedColourMode === "Greyscale") {
      return "grayscale(100%) contrast(125%) brightness(105%)";
    }
    if (selectedColourMode === "Black and white") {
      return "grayscale(100%) contrast(300%) brightness(110%)";
    }
    return "none";
  };

  useEffect(() => {
    if (!isScannerOpen) {
      setIsSpacePressed(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeTag = document.activeElement?.tagName.toLowerCase();

        if (activeTag !== "input" && activeTag !== "textarea" && activeTag !== "select") {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isScannerOpen]);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ isDragging: false, startX: 0, startY: 0, scrollL: 0, scrollT: 0 });
  const scrollIntervalRef = React.useRef<any>(null);
  const pointerPosRef = React.useRef({ x: 0, y: 0 });

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const startAutoScrollLoop = () => {
    if (scrollIntervalRef.current) return;
    scrollIntervalRef.current = setInterval(() => {
      if (!viewportRef.current || !isCropEnabled) {
        stopAutoScroll();
        return;
      }

      const rect = viewportRef.current.getBoundingClientRect();
      const clientX = pointerPosRef.current.x;
      const clientY = pointerPosRef.current.y;

      if (clientX === 0 && clientY === 0) return;

      const threshold = 80;
      const maxScrollSpeed = 22;

      let scrollX = 0;
      let scrollY = 0;


      if (clientY < rect.top + threshold) {
         const distance = rect.top + threshold - clientY;
         const factor = Math.min(2.0, distance / threshold);
         scrollY = -maxScrollSpeed * factor;
      }

      else if (clientY > rect.bottom - threshold) {
         const distance = clientY - (rect.bottom - threshold);
         const factor = Math.min(2.0, distance / threshold);
         scrollY = maxScrollSpeed * factor;
      }


      if (clientX < rect.left + threshold) {
         const distance = rect.left + threshold - clientX;
         const factor = Math.min(2.0, distance / threshold);
         scrollX = -maxScrollSpeed * factor;
      }

      else if (clientX > rect.right - threshold) {
         const distance = clientX - (rect.right - threshold);
         const factor = Math.min(2.0, distance / threshold);
         scrollX = maxScrollSpeed * factor;
      }

      if (scrollX !== 0 || scrollY !== 0) {
         viewportRef.current.scrollLeft += scrollX;
         viewportRef.current.scrollTop += scrollY;


         const syntheticEvent = new PointerEvent("pointermove", {
            clientX: clientX,
            clientY: clientY,
            bubbles: true,
            cancelable: true,
            buttons: 1
         });
         window.dispatchEvent(syntheticEvent);
      }
    }, 16);
  };


  useEffect(() => {
    if (!isCropEnabled || !isScannerOpen) {
      stopAutoScroll();
      return;
    }

    const handleGlobalPointerMove = (e: PointerEvent) => {

      if (e.buttons === 1) {
         pointerPosRef.current = { x: e.clientX, y: e.clientY };
         startAutoScrollLoop();
      } else {
         stopAutoScroll();
      }
    };

    const handleGlobalPointerUp = () => {
      stopAutoScroll();
    };


    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
      stopAutoScroll();
    };
  }, [isCropEnabled, isScannerOpen]);

  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("label") || target.closest("a")) {
      return;
    }
    if (!hasDocumentLoaded) {
      return;
    }

    if (e.button === 1 || (e.button === 0 && (!isCropEnabled || isSpacePressed))) {
      e.preventDefault();
      dragRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollL: viewportRef.current?.scrollLeft || 0,
        scrollT: viewportRef.current?.scrollTop || 0,
      };
      if (viewportRef.current) viewportRef.current.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !viewportRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    viewportRef.current.scrollLeft = dragRef.current.scrollL - dx;
    viewportRef.current.scrollTop = dragRef.current.scrollT - dy;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.isDragging = false;
    if (viewportRef.current) viewportRef.current.releasePointerCapture(e.pointerId);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };


  useEffect(() => {
    setIsFlipping(true);
    const tmr = setTimeout(() => setIsFlipping(false), 500);
    return () => clearTimeout(tmr);
  }, [scannerPage]);

  const handleNextPage = () => {
    if (scannerPage < scannerTotalPages) {
      setFlipDirection("next");
      const currentSpreadBase = scannerPage === 1 ? 1 : (scannerPage % 2 === 0 ? scannerPage : scannerPage - 1);
      let nextBase = currentSpreadBase === 1 ? 2 : currentSpreadBase + 2;
      if (nextBase > scannerTotalPages) {
         nextBase = scannerTotalPages;
      }
      handlePageChange(nextBase);
    }
  };

  const handlePrevPage = () => {
    if (scannerPage > 1) {
      setFlipDirection("prev");
      const currentSpreadBase = scannerPage === 1 ? 1 : (scannerPage % 2 === 0 ? scannerPage : scannerPage - 1);
      let prevBase = currentSpreadBase === 2 ? 1 : currentSpreadBase - 2;
      if (prevBase < 1) prevBase = 1;
      handlePageChange(prevBase);
    }
  };

  const triggerScan = async () => {
    await executeExtraction();
  };

  return (
    <AnimatePresence>
      {isScannerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] cursor-default"
          onDoubleClick={onClose}
        >
          <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes smoothScan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes scanData {
          0% { background-position: 0 0; }
          100% { background-position: 0 24px; }
        }
        .matrix-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(10, 132, 255, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10, 132, 255, 0.12) 1px, transparent 1px);
          background-size: 24px 24px;
          z-index: 49;
          pointer-events: none;
          mix-blend-mode: normal;
          opacity: 0.15;
          animation: scanData 8s linear infinite;
        }
        .laser-scanner-container {
          position: absolute;
          left: 0;
          right: 0;
          top: -10%;
          height: 0px;
          animation: smoothScan 4.5s ease-in-out infinite;
          pointer-events: none;
          z-index: 50;
          width: 100%;
        }
        .laser-scanner-illuminator {
          position: absolute;
          top: -200px;
          bottom: -200px;
          left: 0;
          right: 0;
          background: radial-gradient(ellipse 150% 50% at center, rgba(10, 132, 255, 0.15) 0%, rgba(10, 132, 255, 0.05) 50%, transparent 100%);
          pointer-events: none;
          mix-blend-mode: normal;
        }
        .dark .laser-scanner-illuminator {
          background: radial-gradient(ellipse 150% 50% at center, rgba(191, 0, 255, 0.25) 0%, rgba(191, 0, 255, 0.08) 50%, transparent 100%);
          mix-blend-mode: screen;
        }
        .laser-scanner-beam {
          position: absolute;
          top: -1px;
          left: 0;
          right: 0;
          height: 1px;
          background: #0a84ff;
          box-shadow:
            0 0 8px 1px rgba(10, 132, 255, 0.6),
            0 0 2px 0.5px rgba(255, 255, 255, 0.8);
        }
        .dark .laser-scanner-beam {
          background: #bf00ff;
          box-shadow:
            0 0 10px 2px rgba(191, 0, 255, 0.75),
            0 0 3px 0.5px rgba(255, 255, 255, 0.9);
        }


        @keyframes pageTurnNext {
          0% { transform: perspective(2000px) rotateY(0deg); opacity: 1; transform-origin: left center; }
          40% { transform: perspective(2000px) rotateY(-30deg) scale(1.02); filter: brightness(1.05); transform-origin: left center; box-shadow: 20px 0 30px rgba(0,0,0,0.1); }
          100% { transform: perspective(2000px) rotateY(-180deg) scale(0.98); opacity: 0; transform-origin: left center; filter: brightness(0.8); }
        }
        @keyframes pageTurnPrev {
          0% { transform: perspective(2000px) rotateY(-180deg); opacity: 0; transform-origin: right center; filter: brightness(0.8); }
          60% { transform: perspective(2000px) rotateY(-30deg) scale(1.02); filter: brightness(1.05); transform-origin: right center; box-shadow: -20px 0 30px rgba(0,0,0,0.1); }
          100% { transform: perspective(2000px) rotateY(0deg) scale(1); opacity: 1; transform-origin: right center; }
        }
        .animate-page-flip-next { animation: pageTurnNext 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards; }
        .animate-page-flip-prev { animation: pageTurnPrev 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) forwards; }

        @keyframes leafTurnNext {
          0% { transform: perspective(2000px) rotateY(120deg); filter: brightness(0.6); }
          100% { transform: perspective(2000px) rotateY(0deg); filter: brightness(1); }
        }
        @keyframes leafTurnPrev {
          0% { transform: perspective(2000px) rotateY(-120deg); filter: brightness(0.6); }
          100% { transform: perspective(2000px) rotateY(0deg); filter: brightness(1); }
        }
        .book-flip-next-left {
          animation: leafTurnNext 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          transform-origin: right center;
          z-index: 20;
        }
        .book-flip-prev-right {
          animation: leafTurnPrev 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          transform-origin: left center;
          z-index: 20;
        }

        .crop-handle-custom {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: white;
          border: 1px solid #E5DCDA;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          z-index: 20;
        }
        .dark .crop-handle-custom {
          background-color: #24242E;
          border-color: rgba(255,255,255,0.4);
        }

        .book-binding {
           background: linear-gradient(to right, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 52%, rgba(0,0,0,0.02) 100%);
           width: 40px;
           height: 100%;
           position: absolute;
           left: 50%;
           transform: translateX(-50%);
           z-index: 5;
           pointer-events: none;
        }
        .dark .book-binding {
           background: linear-gradient(to right, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0.2) 48%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 52%, rgba(255,255,255,0.01) 100%);
        }
      `}</style>

      {/* Premium Windows 11 Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: window.innerWidth < 640 ? '100%' : width,
          height: window.innerWidth < 640 ? '100%' : height,
          left: window.innerWidth < 640 ? 0 : x,
          top: window.innerWidth < 640 ? 0 : y
        }}
        exit={{
          opacity: 0,
          scale: 0.5,
          x: -200,
          y: 400,
          filter: "blur(10px)",
          transition: { duration: 0.3, ease: "easeIn" }
        }}
        onDoubleClick={(e) => e.stopPropagation()}
        transition={{ duration: 0.25, type: 'spring', damping: 25, stiffness: 200 }}
        style={{ position: window.innerWidth < 640 ? 'fixed' : 'absolute' }}
        className="bg-[#FCF5F3] dark:bg-[#20202A] sm:rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden border-none sm:border border-black/5 dark:border-white/10 font-sans flex flex-col"
      >
        {/* Resize & Drag Handles (Only on Desktop) */}
        <div className="hidden sm:block">
          {/* Resize Edges */}
          <div className="absolute top-0 left-0 w-full h-1 cursor-n-resize z-[160]" onMouseDown={(e) => startResize('n', e)} />
          <div className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize z-[160]" onMouseDown={(e) => startResize('s', e)} />
          <div className="absolute top-0 left-0 h-full w-1 cursor-w-resize z-[160]" onMouseDown={(e) => startResize('w', e)} />
          <div className="absolute top-0 right-0 h-full w-1 cursor-e-resize z-[160]" onMouseDown={(e) => startResize('e', e)} />

          {/* Side Draggable Rails (Allows moving from any side) */}
          <div className="absolute top-[38px] left-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
          <div className="absolute top-[38px] right-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
          <div className="absolute bottom-0 left-[8px] w-[calc(100%-16px)] h-2 cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />

          {/* Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-[170]" onMouseDown={(e) => startResize('nw', e)} />
          <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-[170]" onMouseDown={(e) => startResize('ne', e)} />
          <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-[170]" onMouseDown={(e) => startResize('sw', e)} />
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[170]" onMouseDown={(e) => startResize('se', e)} />
        </div>

        {/* Title Bar Context */}
        <div
          className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 cursor-move"
          onMouseDown={(e) => startResize('move', e)}
        >
           <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
             <TopScannerIcon className="w-4 h-4" />
             <span className="text-[12px] font-medium tracking-wide">Scan</span>
           </div>
           <div className="flex items-center h-full">
             <button
               onClick={onClose}
               className="h-[38px] w-[46px] flex items-center justify-center hover:bg-[#E81123] hover:text-white transition-colors text-neutral-500"
             >
               <X size={16} />
             </button>
           </div>
        </div>

        {/* Dual Panel Body Layout */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* Left Navigation Sidebar Options */}
          <div className="w-full lg:w-[310px] flex flex-col px-7 pb-6 overflow-y-auto custom-scrollbar shrink-0 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5">
            <h1 className="text-[26px] font-semibold text-[#1E1E1E] dark:text-[#FFFFFF] mt-3 mb-6 tracking-tight">Scan</h1>

            {/* Scanner Device */}
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Scanner</label>
              <div className="relative">
                 <select
                   value={selectedScanner}
                   onChange={e => setSelectedScanner(e.target.value)}
                   className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA]"
                 >
                    <option>HP DeskJet 2300 series</option>
                    <option>Canon Pixma MX922</option>
                 </select>
                 <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* File Format */}
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">File type</label>
              <div className="relative">
                 <select
                   value={selectedFileType}
                   onChange={e => setSelectedFileType(e.target.value)}
                   className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA]"
                 >
                    <option>PDF</option>
                    <option>JPEG</option>
                    <option>PNG</option>
                 </select>
                 <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Color Profile Setting with unique bullet radios */}
            <div className="flex flex-col gap-3.5 mb-6">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Colour mode</label>
              <div className="flex flex-col gap-3.5 pl-0.5">
                 {["Colour", "Greyscale", "Black and white"].map(mode => {
                    const isChecked = selectedColourMode === mode;
                    return (
                      <label key={mode} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'border-[#C28181] dark:border-[#60C5EA]'
                            : 'border-gray-300 dark:border-gray-500 group-hover:border-gray-400 dark:group-hover:border-gray-400'
                        }`}>
                          {isChecked && <div className="w-[10px] h-[10px] rounded-full bg-[#C28181] dark:bg-[#60C5EA] animate-in zoom-in-75 duration-150" />}
                        </div>
                        <span className="text-[13px] text-[#1E1E1F] dark:text-[#EAEAEA]">{mode}</span>
                      </label>
                    );
                 })}
              </div>
            </div>

            {/* Quality (dpi) */}
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Resolution</label>
              <div className="relative">
                 <select
                   value={selectedResolution}
                   onChange={e => setSelectedResolution(e.target.value)}
                   className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA]"
                 >
                    <option>150 dpi</option>
                    <option>200 dpi</option>
                    <option>300 dpi</option>
                 </select>
                 <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Destination Path routing map */}
            <div className={`flex flex-col gap-1.5 pt-1 relative ${shakePath ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              <label className={`text-[13px] ${!isTextReady ? 'text-[#202020]/40 dark:text-[#EAEAEA]/40' : 'text-[#202020] dark:text-[#EAEAEA]'} pl-0.5 transition-colors duration-200`}>Path</label>
              <div className="relative">
                 <select
                   value={selectedDestinationFolder}
                   onChange={e => {
                     setSelectedDestinationFolder(e.target.value);
                     if (e.target.value) {
                       setShowPathRequiredError(false);
                     }
                   }}
                   disabled={!isTextReady}
                   style={shakePath ? {
                     boxShadow: `0 0 10px ${activeAccent}80`,
                     borderColor: activeAccent
                   } : {}}
                   className={`w-full appearance-none bg-white dark:bg-[#2A2A35] disabled:bg-gray-50 dark:disabled:bg-[#1C1C24] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] disabled:text-[#202020]/40 dark:disabled:text-[#EAEAEA]/40 outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200`}
                 >
                    <option value="" disabled>Select Destination...</option>
                    <option value="typing_practice">Practice & Training</option>
                    <option value="doc_editor">Document Workspace</option>
                    <option value="memory_library">Personal Library</option>
                 </select>
                  <ChevronRight className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${!isTextReady ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'} pointer-events-none transition-colors duration-200`} />
              </div>

              {(shakePath || (showPathRequiredError && !selectedDestinationFolder)) && (
                <div className="text-[11px] text-red-500 dark:text-red-400 font-semibold pl-0.5 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  * Path selection required
                </div>
              )}
            </div>

            {cropQueue.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-4 mt-auto">
                <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5 flex justify-between items-center pr-1">
                  <span>Queued Clips ({cropQueue.length})</span>
                  <button onClick={() => setCropQueue([])} className="text-[#E81123] hover:underline text-[11px]">Clear all</button>
                </label>
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    {cropQueue.map((clip, idx) => (
                       <div key={clip.id} className="flex flex-col group relative bg-white dark:bg-[#1A1A23] border border-[#E5DCDA] dark:border-white/10 rounded-md p-1.5 shadow-sm overflow-hidden min-h-[40px]">
                          <div className="flex items-center gap-2 relative z-10 w-full mb-0.5">
                            <img src={clip.imgUrl || undefined} className="w-8 h-8 object-cover rounded opacity-70 group-hover:opacity-100 transition-opacity bg-neutral-100 dark:bg-neutral-800" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
                                {clip.isFullPage ? `Full Page (P. ${clip.page || 1})` : `Clip ${idx + 1} (P. ${clip.page || 1})`}
                              </span>
                             <div className="flex items-center gap-1.5">
                               <button
                                 onClick={() => {
                                   if (idx > 0) {
                                      const newQueue = [...cropQueue];
                                      [newQueue[idx - 1], newQueue[idx]] = [newQueue[idx], newQueue[idx - 1]];
                                      setCropQueue(newQueue);
                                   }
                                 }}
                                 disabled={idx === 0}
                                 className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white disabled:opacity-20 disabled:pointer-events-none text-[13px] leading-none"
                               >↑</button>
                               <button
                                 onClick={() => {
                                   if (idx < cropQueue.length - 1) {
                                      const newQueue = [...cropQueue];
                                      [newQueue[idx + 1], newQueue[idx]] = [newQueue[idx], newQueue[idx + 1]];
                                      setCropQueue(newQueue);
                                   }
                                 }}
                                 disabled={idx === cropQueue.length - 1}
                                 className="text-neutral-400 hover:text-neutral-800 dark:hover:text-white disabled:opacity-20 disabled:pointer-events-none text-[13px] leading-none"
                               >↓</button>
                               <button onClick={() => setCropQueue(q => q.filter(c => c.id !== clip.id))} className="text-red-400 hover:text-red-500 ml-1">
                                 <Trash2 className="w-3.5 h-3.5"/>
                               </button>
                             </div>
                           </div>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Main Showcase Canvas Area */}
          <div className="flex-1 bg-[#F9F9F9] dark:bg-[#1A1A22] rounded-tl-[10px] border-t border-l border-black/5 dark:border-white/5 relative flex flex-col items-center justify-between shadow-[-4px_-4px_16px_rgba(0,0,0,0.02)] overflow-hidden">

            {/* The Document Presentation Viewport with Scrolling */}
            <div
               id="scanner-viewport"
               ref={viewportRef}
               onPointerDown={onPointerDown}
               onPointerMove={onPointerMove}
               onPointerUp={onPointerUp}
               onPointerCancel={onPointerUp}
               onPointerLeave={onPointerUp}
               className={`flex-1 w-full overflow-auto custom-scrollbar relative bg-[#F9F9F9] dark:bg-[#1A1A22] ${isSpacePressed ? (dragRef.current?.isDragging ? "cursor-grabbing" : "cursor-grab") : isCropEnabled ? "cursor-crosshair" : dragRef.current?.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
               onWheel={(e) => {
                  if (e.ctrlKey || e.metaKey || e.altKey) {
                     e.preventDefault();
                     setScannerZoom(z => Math.min(Math.max(0.2, z - (e.deltaY > 0 ? 0.05 : -0.05)), 4.0));
                  }
               }}
            >
               <div className="min-w-full min-h-full flex p-4 sm:p-8 transition-all duration-200">
                  <div className="m-auto">
                  {scannerProgress && scannerProgress.status !== 'idle' && cropQueue.length > 0 ? (
                      <div className="relative flex flex-col items-center justify-center w-[280px] sm:w-[360px] h-[380px] sm:h-[480px]">
                         {/* Swiping Cards Deck */}
                         {cropQueue.map((item, idx) => {
                            const isSuccess = scannerProgress.status === 'success';
                            const isCurrent = isSuccess
                              ? idx === cropQueue.length - 1
                              : idx === scannerProgress.currentIndex;
                            const isPast = isSuccess
                              ? idx < cropQueue.length - 1
                              : idx < scannerProgress.currentIndex;
                            const isFuture = idx > (isSuccess ? cropQueue.length - 1 : scannerProgress.currentIndex);

                            if (isPast) return null;

                            const offset = isSuccess ? 0 : (idx - scannerProgress.currentIndex);

                            return (
                               <div key={item.id} className="absolute inset-0 bg-white dark:bg-[#1A1A22] rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out border border-black/10 dark:border-white/10"
                                    style={{
                                       transform: isCurrent ? 'scale(1) translateY(0) rotate(0deg)' : `scale(${1 - offset*0.05}) translateY(${offset*20}px)`,
                                       zIndex: cropQueue.length - idx,
                                       opacity: isCurrent ? 1 : (isFuture ? 1 - offset*0.2 : 0)
                                    }}>
                                   <img src={item.imgUrl || item.base64Data} className="w-full h-full object-contain pointer-events-none" />

                                   {isCurrent && scannerProgress.status === 'scanning' && (
                                     <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-xl">
                                       <div className="matrix-grid-overlay"></div>
                                       <div className="laser-scanner-container">
                                         <div className="laser-scanner-illuminator"></div>
                                         <div className="laser-scanner-beam"></div>
                                       </div>
                                     </div>
                                   )}
                               </div>
                            )
                         })}

                         {/* Typography Status */}
                         <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                            {scannerProgress.status === 'success' ? (
                               <div className="text-neutral-700 dark:text-neutral-300 font-medium text-[13px] flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" strokeWidth={2.5} />
                                  <span>Scan completed</span>
                               </div>
                            ) : (
                               <div className="text-gray-800 dark:text-gray-200 font-medium text-[13px] flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                                  <span>Scanning clip {scannerProgress.currentIndex + 1} of {scannerProgress.total}...</span>
                               </div>
                            )}
                         </div>
                      </div>
                   ) : !hasDocumentLoaded ? (
                     // Drag & Drop / File Upload fallback zone when no document has been uploaded yet
                     <div
                       className={`w-full max-w-2xl border-2 border-dashed bg-white dark:bg-[#1A1A22] flex flex-col items-center justify-center rounded-xl transition-all duration-300 group mx-auto my-auto p-8 ${
                         isDragActive
                           ? "scale-[1.01]"
                           : "border-gray-300 dark:border-gray-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                       }`}
                       style={{
                         minHeight: '420px',
                         borderColor: isDragActive ? activeAccent : undefined,
                         boxShadow: isDragActive ? `0 10px 30px -10px ${activeAccent}55, 0 0 0 1px ${activeAccent}` : undefined,
                         background: isDragActive ? `${activeAccent}08` : undefined
                       }}
                       onDragOver={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setIsDragActive(true);
                       }}
                       onDragEnter={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setIsDragActive(true);
                       }}
                       onDragLeave={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setIsDragActive(false);
                       }}
                       onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                             onFileUpload?.(e.dataTransfer.files[0]);
                          }
                       }}
                     >
                        <div className="w-20 h-24 bg-gray-50 dark:bg-zinc-800/40 rounded-xl flex items-center justify-center mb-6 relative transition-all duration-300 border border-black/5 dark:border-white/5"
                           style={{
                             transform: isDragActive ? "scale(1.1) translateY(-4px)" : undefined,
                             borderColor: isDragActive ? activeAccent : undefined
                           }}>
                           <FileText
                             className="w-10 h-10 transition-colors duration-300"
                             style={{ color: isDragActive ? activeAccent : '#9ca3af' }}
                             strokeWidth={1.5}
                           />
                           <div className="absolute top-1.5 right-1.5">
                             <Sparkles
                               className="w-4 h-4 fill-current transition-all duration-300"
                               style={{
                                 color: isDragActive ? activeAccent : '#d1d5db',
                                 transform: isDragActive ? "rotate(15deg) scale(1.1)" : undefined
                               }}
                               strokeWidth={1}
                             />
                           </div>
                        </div>

                        <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1 tracking-tight">
                          PDF / Markdown / HTML / JPEG / WEBP
                        </h3>
                        <p className="text-gray-400 dark:text-gray-500 text-[12px] mb-8 font-medium">
                          Max file size: 20 MB each
                        </p>

                        <div className="text-gray-600 dark:text-gray-300 text-[15px] font-medium mb-3">
                          Drag & drop document to upload
                        </div>
                        <div className="text-gray-400 dark:text-gray-500 text-[13px] font-medium mb-4">
                          or
                        </div>

                        <label
                          className="text-white px-8 py-2.5 rounded-lg font-medium cursor-pointer transition-all shadow-md text-[13px] hover:brightness-105 hover:shadow-lg active:scale-95 duration-150 inline-flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: activeAccent }}
                        >
                          Browse
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.md,.html,.txt,.jpeg,.jpg,.png,.webp"
                            onChange={(e) => {
                               if (e.target.files && e.target.files[0]) {
                                 onFileUpload?.(e.target.files[0]);
                               }
                            }}
                          />
                        </label>

                        <div className="mt-12 flex flex-col gap-2 font-medium items-center">
                          <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline decoration-gray-300 dark:decoration-gray-700 hover:decoration-gray-400 transition-colors text-[12px]">
                            Upload document from URL
                          </button>
                          <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline decoration-gray-300 dark:decoration-gray-700 hover:decoration-gray-400 transition-colors text-[12px]">
                            Extract text from image sequences
                          </button>
                        </div>
                     </div>
                  ) : scannerTotalPages > 1 ? (
                    // Book Spread Layout & Single Cover System
                    <div className="relative flex items-stretch drop-shadow-2xl bg-transparent transition-transform duration-300 ease-in-out"
                         style={{
                            transform: `rotate(${scannerRotation}deg) scaleX(${scannerScaleX}) scaleY(${scannerScaleY})`,
                            transformOrigin: 'center center',
                            height: `calc(max(320px, 80vh - 220px) * ${scannerZoom})`,
                            width: (scannerPage === 1 || (scannerPage === scannerTotalPages && scannerPage % 2 === 0)) ? 'auto' : `calc(max(320px, 80vh - 220px) * 1.414 * ${scannerZoom})`,
                            aspectRatio: (scannerPage === 1 || (scannerPage === scannerTotalPages && scannerPage % 2 === 0)) ? '1 / 1.414' : 'auto'
                         }}
                         onContextMenu={handleContextMenu}
                    >
                      {/* Hidden Image for HandleAddToQueue computation using Unified Stitched Canvas */}
                      <img ref={scannerImgRef} src={scannerStitchedUrl || scannerPreviewUrl || undefined} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" style={{ objectFit: 'fill' }} alt="" />

                      {(() => {
                        const content = (
                          <>
                            {isOcrLoading && (
                              <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-sm">
                                <div className="matrix-grid-overlay"></div>
                                <div className="laser-scanner-container">
                                  <div className="laser-scanner-illuminator"></div>
                                  <div className="laser-scanner-beam"></div>
                                </div>
                              </div>
                            )}
                            {/* Left Page */}
                            {scannerPage > 1 && (
                               <>
                                 <div className="book-binding" />
                                 <div className={`flex-1 relative overflow-hidden flex flex-col bg-white dark:bg-[#eaeaea] rounded-l-sm border-r border-black/5 z-0 ${isFlipping && flipDirection === 'next' ? 'book-flip-next-left' : ''}`}>
                                    {scannerPage % 2 === 0 ? (
                                       <div className="w-full h-full relative">
                                          {scannerPreviewUrl && <img src={scannerPreviewUrl || undefined} className="w-full h-full object-contain pointer-events-none block" style={{ filter: getImageFilterStyle() }} />}
                                       </div>
                                    ) : (
                                       <div className="w-full h-full relative">
                                          {scannerPreviewUrl2 && <img src={scannerPreviewUrl2 || undefined} className="w-full h-full object-contain pointer-events-none block" style={{ filter: getImageFilterStyle() }} />}
                                       </div>
                                    )}
                                 </div>
                               </>
                            )}

                            {/* Right Page */}
                            {(scannerPage < scannerTotalPages || scannerPage % 2 !== 0) && (
                               <div className={`flex-1 relative overflow-hidden flex flex-col bg-white dark:bg-[#f2f2f2] rounded-r-sm z-0 ${isFlipping && flipDirection === 'prev' ? 'book-flip-prev-right' : ''}`}>
                                  {scannerPage % 2 !== 0 ? (
                                     <div className="w-full h-full relative">
                                        {scannerPreviewUrl && <img src={scannerPreviewUrl || undefined} className="w-full h-full object-contain pointer-events-none block" style={{ filter: getImageFilterStyle() }} />}
                                     </div>
                                  ) : (
                                     <div className="w-full h-full relative">
                                        {scannerPreviewUrl2 && <img src={scannerPreviewUrl2 || undefined} className="w-full h-full object-contain pointer-events-none block" style={{ filter: getImageFilterStyle() }} />}
                                     </div>
                                  )}
                               </div>
                            )}
                          </>
                        );

                        return (
                          <>
                            <div className="w-full h-full flex flex-row relative z-10 select-none pointer-events-none">
                              {content}
                            </div>

                            {isCropEnabled ? (
                              <div className={`absolute inset-0 z-20 ${isSpacePressed ? "pointer-events-none" : ""}`}>
                                <ReactCrop crop={scannerCrop} onChange={(c) => setScannerCrop(c)} className="w-full h-full" style={{ height: '100%', width: '100%' }}>
                                  <img src={scannerStitchedUrl || scannerPreviewUrl || undefined} className="w-full h-full opacity-0 pointer-events-none block" style={{ objectFit: 'fill' }} alt="Crop overlay" />
                                </ReactCrop>
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    // Single Page Layout (Seamlessly fit without scroll when 100%)
                    <div className="relative shadow-2xl bg-white dark:bg-[#f6f6f6] rounded-sm transition-transform duration-300"
                         style={{
                            transform: `rotate(${scannerRotation}deg) scaleX(${scannerScaleX}) scaleY(${scannerScaleY})`,
                            transformOrigin: 'center center'
                         }}>
                       {isOcrLoading && (
                         <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-sm">
                           <div className="matrix-grid-overlay"></div>
                           <div className="laser-scanner-container">
                             <div className="laser-scanner-illuminator"></div>
                             <div className="laser-scanner-beam"></div>
                           </div>
                         </div>
                       )}

                       {scannerPreviewUrl ? (
                          <div
                            className="relative flex justify-center items-center"
                            onContextMenu={handleContextMenu}
                          >
                             {isCropEnabled ? (
                               <ReactCrop
                                 crop={scannerCrop}
                                 onChange={(c) => setScannerCrop(c)}
                                 className={isSpacePressed ? "pointer-events-none" : ""}
                               >
                                 <img
                                    ref={scannerImgRef}
                                    src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                                    alt="Scanned Document Paper Element"
                                    className="block select-none rounded-sm"
                                    style={{ height: `calc(max(320px, 80vh - 220px) * ${scannerZoom})`, width: 'auto', filter: getImageFilterStyle() }}
                                 />
                               </ReactCrop>
                             ) : (
                               <img
                                  ref={scannerImgRef}
                                  src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                                  alt="Scanned Document Paper Element"
                                  className="block pointer-events-none rounded-sm"
                                  style={{ height: `calc(max(320px, 80vh - 220px) * ${scannerZoom})`, width: 'auto', filter: getImageFilterStyle() }}
                               />
                             )}
                          </div>
                       ) : (
                          <div
                            className={`w-full max-w-2xl border-2 border-dashed bg-white dark:bg-[#1A1A22] flex flex-col items-center justify-center rounded-xl transition-all duration-300 group mx-auto my-auto p-8 ${
                              isDragActive
                                ? "scale-[1.01]"
                                : "border-gray-300 dark:border-gray-700 hover:border-neutral-400 dark:hover:border-neutral-500"
                            }`}
                            style={{
                              height: `calc(max(320px, 80vh - 220px) * ${scannerZoom})`,
                              minHeight: '420px',
                              borderColor: isDragActive ? activeAccent : undefined,
                              boxShadow: isDragActive ? `0 10px 30px -10px ${activeAccent}55, 0 0 0 1px ${activeAccent}` : undefined,
                              background: isDragActive ? `${activeAccent}08` : undefined
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragActive(true);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragActive(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragActive(false);
                            }}
                            onDrop={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setIsDragActive(false);
                               if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  onFileUpload?.(e.dataTransfer.files[0]);
                               }
                            }}
                          >
                             <div className="w-20 h-24 bg-gray-50 dark:bg-zinc-800/40 rounded-xl flex items-center justify-center mb-6 relative transition-all duration-300 border border-black/5 dark:border-white/5"
                                style={{
                                  transform: isDragActive ? "scale(1.1) translateY(-4px)" : undefined,
                                  borderColor: isDragActive ? activeAccent : undefined
                                }}>
                                <FileText
                                  className="w-10 h-10 transition-colors duration-300"
                                  style={{ color: isDragActive ? activeAccent : '#9ca3af' }}
                                  strokeWidth={1.5}
                                />
                                <div className="absolute top-1.5 right-1.5">
                                  <Sparkles
                                    className="w-4 h-4 fill-current transition-all duration-300"
                                    style={{
                                      color: isDragActive ? activeAccent : '#d1d5db',
                                      transform: isDragActive ? "rotate(15deg) scale(1.1)" : undefined
                                    }}
                                    strokeWidth={1}
                                  />
                                </div>
                             </div>

                             <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1 tracking-tight">
                               PDF / Markdown / HTML / JPEG / WEBP
                             </h3>
                             <p className="text-gray-400 dark:text-gray-500 text-[12px] mb-8 font-medium">
                               Max file size: 20 MB each
                             </p>

                             <div className="text-gray-600 dark:text-gray-300 text-[15px] font-medium mb-3">
                               Drag & drop document to upload
                             </div>
                             <div className="text-gray-400 dark:text-gray-500 text-[13px] font-medium mb-4">
                               or
                             </div>

                             <label
                               className="text-white px-8 py-2.5 rounded-lg font-medium cursor-pointer transition-all shadow-md text-[13px] hover:brightness-105 hover:shadow-lg active:scale-95 duration-150 inline-flex items-center justify-center"
                               style={{ backgroundColor: activeAccent }}
                             >
                               Browse
                               <input
                                 type="file"
                                 className="hidden"
                                 accept=".pdf,.md,.html,.txt,.jpeg,.jpg,.png,.webp"
                                 onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      onFileUpload?.(e.target.files[0]);
                                    }
                                 }}
                               />
                             </label>

                             <div className="mt-12 flex flex-col gap-2 font-medium items-center">
                               <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline decoration-gray-300 dark:decoration-gray-700 hover:decoration-gray-400 transition-colors text-[12px]">
                                 Upload document from URL
                               </button>
                               <button className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline decoration-gray-300 dark:decoration-gray-700 hover:decoration-gray-400 transition-colors text-[12px]">
                                 Extract text from image sequences
                               </button>
                             </div>
                          </div>
                       )}
                    </div>
                  )}
                  </div>

               </div>
            </div>

            {/* Bottom Final Action Bar */}
            <div className="w-full p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 shrink-0 bg-[#FFFFFF] dark:bg-[#20202A] relative z-40 border-t border-black/5 dark:border-white/5 overflow-x-auto custom-scrollbar">

               {/* Left Context Icons */}
               <div className="flex items-center gap-1.5 text-[#202020] dark:text-[#EAEAEA] min-w-max">
                 <button
                   onClick={() => {
                     if (onDiscardCurrentDocument) {
                       onDiscardCurrentDocument();
                     } else {
                       setScannerPreviewUrl("");
                     }
                   }}
                   className="p-2 hover:bg-[#E81123]/10 hover:text-[#E81123] rounded-full transition-colors"
                   title="Discard Active Document (Keep Clips)"
                 >
                   <Trash2 className="w-[18px] h-[18px]" strokeWidth={1.5} />
                 </button>
               </div>

               {/* Center Tools (Zoom, Rotate, Move) merged here */}
               <div className="flex max-w-full overflow-x-auto custom-scrollbar items-center justify-center gap-1.5 bg-[#F9F9F9] dark:bg-[#2A2A35] px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm shrink-0 min-w-max">
                 <div className="flex gap-1">
                   <button onClick={() => setScannerZoom(z => Math.max(0.2, z - 0.1))} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors"><ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
                   <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded h-7">
                     <span className="text-[12px] font-mono text-gray-600 dark:text-gray-300 w-10 text-center select-none">{Math.round(scannerZoom * 100)}%</span>
                     <div className="flex flex-col justify-center items-center h-full -space-y-1">
                       <button
                         onClick={() => setScannerZoom(z => Math.min(4.0, z + 0.05))}
                         className="hover:bg-black/10 dark:hover:bg-white/10 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                         title="Increase Zoom (+5%)"
                       >
                         <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                       </button>
                       <button
                         onClick={() => setScannerZoom(z => Math.max(0.2, z - 0.05))}
                         className="hover:bg-black/10 dark:hover:bg-white/10 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                         title="Decrease Zoom (-5%)"
                       >
                         <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                       </button>
                     </div>
                   </div>
                   <button onClick={() => setScannerZoom(z => Math.min(4.0, z + 0.1))} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors"><ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
                 </div>

                 <div className="w-[1px] h-4 bg-gray-300 dark:bg-white/10 mx-1"></div>

                 <div className="flex gap-1">
                   <button onClick={() => setScannerScaleX(s => s * -1)} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors" title="Flip Horizontal"><FlipHorizontal className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
                   <button onClick={() => setScannerRotation(r => r - 90)} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors" title="Rotate Anti-clockwise"><RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
                   <button onClick={() => setIsCropEnabled(!isCropEnabled)} className={`p-1.5 rounded-md transition-colors ${isCropEnabled ? "bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 shadow-sm" : "hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"}`} title="Crop Tool"><CropIcon className="w-4 h-4"/></button>
                 </div>

                 {(hasDocumentLoaded && scannerTotalPages > 1) && (
                   <>
                     <div className="w-[1px] h-4 bg-gray-300 dark:bg-white/10 mx-1"></div>
                     <div className="flex items-center gap-1 text-[13px] font-mono text-gray-700 dark:text-gray-300 select-none">
                        <button disabled={scannerPage <= 1} onClick={handlePrevPage} className="disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md"><ChevronLeft className="w-4 h-4"/></button>
                        <span className="w-10 text-center text-[12px]">{scannerPage}/{scannerTotalPages}</span>
                        <button disabled={scannerPage >= scannerTotalPages || (scannerPage > 1 && scannerPage % 2 === 0 && scannerPage + 1 >= scannerTotalPages)} onClick={handleNextPage} className="disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                   </>
                 )}
               </div>

               {/* Right primary operations */}
               <div className="flex items-center justify-end gap-3 min-w-max">
                 <button
                    onClick={handleAddToQueue}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors active:scale-95 duration-150 flex items-center justify-center"
                    title="Add Clip"
                  >
                    <Scissors className="w-5 h-5 stroke-[2.2] rotate-180" />
                  </button>

                 <button
                    onClick={() => {
                      if (isTextReady) {
                        handleSendToPath();
                      } else {
                        triggerScan();
                      }
                    }}
                    disabled={isOcrLoading}
                    className={`relative px-[24px] py-1.5 rounded-md text-[13px] font-medium transition-all duration-500 ease-out disabled:opacity-50 flex items-center justify-center min-w-[80px] shadow-sm ${
                      isOcrLoading
                        ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950"
                        : isTextReady
                          ? selectedDestinationFolder
                            ? "bg-[#0a84ff] hover:bg-[#0070e0] dark:bg-[#bf00ff] dark:hover:bg-[#a000d6] text-white shadow-md scale-105"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                          : "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-[0.97]"
                    }`}
                 >
                   {!isTextReady && cropQueue.length > 0 && (
                     <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-md font-bold z-50 transition-opacity">
                       {cropQueue.length}
                     </span>
                   )}
                   {isOcrLoading ? (
                     <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                   ) : isTextReady ? (
                     <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                        <Send className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Send</span>
                     </div>
                   ) : (
                     "Scan"
                   )}
                 </button>
               </div>
            </div>

            {/* Context Menu Overlay */}
            {contextMenu && (
               <>
                 <div className="fixed inset-0 z-[100]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}></div>
                 <div
                    className="fixed z-[110] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-lg p-1 min-w-[130px] select-none animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                  >
                    <button
                       onClick={(e) => { e.stopPropagation(); handleAddToQueue(); setContextMenu(null); }}
                       className="flex items-center justify-between w-full px-3 py-1.5 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors font-medium text-[13px] text-left outline-none"
                       title="Clip Page"
                     >
                       <span>Clip Page</span>
                       <Scissors className="w-4 h-4 text-red-500 dark:text-red-400 stroke-[2.2] rotate-180" />
                     </button>
                  </div>
               </>
             )}

          </div>

            {/* Save As Dialog */}
            {showSaveAsDialog && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200">
                 <div className="bg-white dark:bg-[#1E1E28] rounded-xl shadow-2xl max-w-sm w-full p-6 border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-200">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Save to Library</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Give this scanned note a memorable title.</p>

                    <SmoothInput
                      type="text"
                      value={saveAsName}
                      onChange={(e) => setSaveAsName(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === "Enter") handleSaveAsSubmit();
                      }}
                      autoFocus
                      className="w-full bg-[#F3F4F6] dark:bg-[#2A2A35] border border-transparent dark:border-[#3A3A45] focus:border-[#0a84ff] dark:focus:border-[#bf00ff] focus:ring-1 focus:ring-[#0a84ff] dark:focus:ring-[#bf00ff] rounded-lg px-3 py-2 text-[14px] text-gray-900 dark:text-white outline-none transition-all mb-5"
                      placeholder="e.g., Biology Chapter 4"
                    />

                    <div className="flex items-center justify-end gap-3">
                       <button
                         onClick={() => setShowSaveAsDialog(false)}
                         className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                       >
                         Cancel
                       </button>
                       <button
                         disabled={!saveAsName.trim()}
                         onClick={handleSaveAsSubmit}
                         className="px-4 py-2 text-sm font-medium bg-[#0a84ff] hover:bg-[#0070e0] dark:bg-[#bf00ff] dark:hover:bg-[#a000d6] text-white rounded-lg transition-colors disabled:opacity-50"
                       >
                         Save
                       </button>
                    </div>
                 </div>
              </div>
            )}

        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
