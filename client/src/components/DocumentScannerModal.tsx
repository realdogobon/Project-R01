import React, { useState, useEffect, useLayoutEffect } from "react";
import type { Crop } from "react-image-crop";
import { motion, AnimatePresence } from "motion/react";
import { useResizable } from "../hooks/useResizable";
import {
  getProviderOf,
  loadProviderKeys,
  saveProviderKeys,
  type ProviderKeys,
} from "../lib/AiVisionEngine";
import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
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
  Link,
  Images,
  CheckCircle,
  Hand,
  Printer,
} from "lucide-react";

const formatUploadFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

interface ScannerCropSurfaceProps {
  crop?: Crop;
  onCommit: (crop: Crop) => void;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  src?: string;
  sourceWidth: number;
  sourceHeight: number;
  visualWidth: number;
  visualHeight: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  className?: string;
  style?: React.CSSProperties;
  imageClassName: string;
  imageStyle?: React.CSSProperties;
  alt: string;
}

const normalizeQuarterTurn = (rotation: number) => {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 0 ? 0 : normalized === 90 ? 90 : normalized === 180 ? 180 : 270;
};

const sourcePointToVisual = (x: number, y: number, sourceWidth: number, sourceHeight: number, visualWidth: number, visualHeight: number, rotation: number, scaleX: number, scaleY: number) => {
  let u = sourceWidth ? x / sourceWidth : 0;
  let v = sourceHeight ? y / sourceHeight : 0;
  if (scaleX < 0) u = 1 - u;
  if (scaleY < 0) v = 1 - v;

  let visualU = u;
  let visualV = v;
  switch (normalizeQuarterTurn(rotation)) {
    case 90:
      visualU = 1 - v;
      visualV = u;
      break;
    case 180:
      visualU = 1 - u;
      visualV = 1 - v;
      break;
    case 270:
      visualU = v;
      visualV = 1 - u;
      break;
  }

  return { x: visualU * visualWidth, y: visualV * visualHeight };
};

const visualPointToSource = (x: number, y: number, sourceWidth: number, sourceHeight: number, visualWidth: number, visualHeight: number, rotation: number, scaleX: number, scaleY: number) => {
  const visualU = visualWidth ? x / visualWidth : 0;
  const visualV = visualHeight ? y / visualHeight : 0;
  let u = visualU;
  let v = visualV;
  switch (normalizeQuarterTurn(rotation)) {
    case 90:
      u = visualV;
      v = 1 - visualU;
      break;
    case 180:
      u = 1 - visualU;
      v = 1 - visualV;
      break;
    case 270:
      u = 1 - visualV;
      v = visualU;
      break;
  }
  if (scaleX < 0) u = 1 - u;
  if (scaleY < 0) v = 1 - v;
  return { x: u * sourceWidth, y: v * sourceHeight };
};

const sourceCropToVisual = (crop: Crop | undefined, props: ScannerCropSurfaceProps): Crop | undefined => {
  if (!crop || !crop.width || !crop.height) return crop;
  const sourceCrop = crop.unit === "%"
    ? {
        x: (crop.x / 100) * props.sourceWidth,
        y: (crop.y / 100) * props.sourceHeight,
        width: (crop.width / 100) * props.sourceWidth,
        height: (crop.height / 100) * props.sourceHeight,
      }
    : crop;
  const corners = [
    sourcePointToVisual(sourceCrop.x, sourceCrop.y, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    sourcePointToVisual(sourceCrop.x + sourceCrop.width, sourceCrop.y, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    sourcePointToVisual(sourceCrop.x, sourceCrop.y + sourceCrop.height, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    sourcePointToVisual(sourceCrop.x + sourceCrop.width, sourceCrop.y + sourceCrop.height, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
  ];
  const left = Math.min(...corners.map((point) => point.x));
  const top = Math.min(...corners.map((point) => point.y));
  const right = Math.max(...corners.map((point) => point.x));
  const bottom = Math.max(...corners.map((point) => point.y));
  return { unit: "px", x: left, y: top, width: right - left, height: bottom - top };
};

const visualCropToSource = (crop: Crop, props: ScannerCropSurfaceProps): Crop => {
  const points = [
    visualPointToSource(crop.x, crop.y, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    visualPointToSource(crop.x + crop.width, crop.y, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    visualPointToSource(crop.x, crop.y + crop.height, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
    visualPointToSource(crop.x + crop.width, crop.y + crop.height, props.sourceWidth, props.sourceHeight, props.visualWidth, props.visualHeight, props.rotation, props.scaleX, props.scaleY),
  ];
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return {
    unit: "px",
    x: Math.max(0, Math.min(props.sourceWidth, left)),
    y: Math.max(0, Math.min(props.sourceHeight, top)),
    width: Math.max(0, Math.min(props.sourceWidth - left, right - left)),
    height: Math.max(0, Math.min(props.sourceHeight - top, bottom - top)),
  };
};

type CropDragMode = "create" | "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface CropPointerState {
  pointerId: number;
  mode: CropDragMode;
  startX: number;
  startY: number;
  origin: Crop;
}

const cropClamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ScannerCropSurface = React.memo(({
  crop: committedCrop,
  onCommit,
  viewportRef,
  src,
  sourceWidth,
  sourceHeight,
  visualWidth,
  visualHeight,
  rotation,
  scaleX,
  scaleY,
  className,
  style,
  imageClassName,
  imageStyle,
  alt,
}: ScannerCropSurfaceProps) => {
  const transformProps = { sourceWidth, sourceHeight, visualWidth, visualHeight, rotation, scaleX, scaleY } as ScannerCropSurfaceProps;
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const pointerRef = React.useRef<CropPointerState | null>(null);
  const autoPanRef = React.useRef<{ clientX: number; clientY: number; frame: number | null; lastTime: number }>({
    clientX: 0,
    clientY: 0,
    frame: null,
    lastTime: 0,
  });
  const [crop, setCrop] = useState<Crop | undefined>(() => sourceCropToVisual(committedCrop, transformProps));

  useEffect(() => {
    if (!pointerRef.current) setCrop(sourceCropToVisual(committedCrop, transformProps));
  }, [committedCrop, sourceWidth, sourceHeight, visualWidth, visualHeight, rotation, scaleX, scaleY]);

  const getPoint = (event: { clientX: number; clientY: number }) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: cropClamp(event.clientX - rect.left, 0, visualWidth),
      y: cropClamp(event.clientY - rect.top, 0, visualHeight),
    };
  };

  const updateCrop = (point: { x: number; y: number }) => {
    const active = pointerRef.current;
    if (!active) return crop;
    const dx = point.x - active.startX;
    const dy = point.y - active.startY;
    const origin = active.origin;
    let next: Crop = { ...origin, unit: "px" };

    if (active.mode === "create") {
      next = {
        unit: "px",
        x: Math.min(active.startX, point.x),
        y: Math.min(active.startY, point.y),
        width: Math.abs(point.x - active.startX),
        height: Math.abs(point.y - active.startY),
      };
    } else if (active.mode === "move") {
      next.x = cropClamp(origin.x + dx, 0, visualWidth - origin.width);
      next.y = cropClamp(origin.y + dy, 0, visualHeight - origin.height);
    } else {
      const right = origin.x + origin.width;
      const bottom = origin.y + origin.height;
      let left = origin.x;
      let top = origin.y;
      let nextRight = right;
      let nextBottom = bottom;
      if (active.mode.includes("w")) left = cropClamp(origin.x + dx, 0, right - 2);
      if (active.mode.includes("e")) nextRight = cropClamp(right + dx, left + 2, visualWidth);
      if (active.mode.includes("n")) top = cropClamp(origin.y + dy, 0, bottom - 2);
      if (active.mode.includes("s")) nextBottom = cropClamp(bottom + dy, top + 2, visualHeight);
      next = { unit: "px", x: left, y: top, width: nextRight - left, height: nextBottom - top };
    }

    setCrop(next);
    return next;
  };

  const stopAutoPan = () => {
    if (autoPanRef.current.frame !== null) {
      cancelAnimationFrame(autoPanRef.current.frame);
      autoPanRef.current.frame = null;
    }
    autoPanRef.current.lastTime = 0;
  };

  const getAutoPanVelocity = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    const edgeSize = 80;
    const maxSpeed = 12;
    const speedFor = (distanceToNearEdge: number, distanceToFarEdge: number) => {
      if (distanceToNearEdge < edgeSize) {
        const intensity = 1 - Math.max(0, distanceToNearEdge) / edgeSize;
        return -maxSpeed * Math.pow(intensity, 1.6);
      }
      if (distanceToFarEdge < edgeSize) {
        const intensity = 1 - Math.max(0, distanceToFarEdge) / edgeSize;
        return maxSpeed * Math.pow(intensity, 1.6);
      }
      return 0;
    };
    let x = speedFor(clientX - rect.left, rect.right - clientX);
    let y = speedFor(clientY - rect.top, rect.bottom - clientY);
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
    if ((x < 0 && viewport.scrollLeft <= 0) || (x > 0 && viewport.scrollLeft >= maxScrollLeft)) x = 0;
    if ((y < 0 && viewport.scrollTop <= 0) || (y > 0 && viewport.scrollTop >= maxScrollTop)) y = 0;
    return { x, y };
  };

  const runAutoPan = (time: number) => {
    const active = pointerRef.current;
    const viewport = viewportRef.current;
    if (!active || !viewport) {
      stopAutoPan();
      return;
    }

    const state = autoPanRef.current;
    const elapsed = state.lastTime ? Math.min(32, Math.max(8, time - state.lastTime)) : 16.67;
    state.lastTime = time;
    const velocity = getAutoPanVelocity(state.clientX, state.clientY);
    const distanceScale = elapsed / 16.67;
    const nextLeft = cropClamp(viewport.scrollLeft + velocity.x * distanceScale, 0, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
    const nextTop = cropClamp(viewport.scrollTop + velocity.y * distanceScale, 0, Math.max(0, viewport.scrollHeight - viewport.clientHeight));
    const didScroll = nextLeft !== viewport.scrollLeft || nextTop !== viewport.scrollTop;
    if (didScroll) {
      viewport.scrollLeft = nextLeft;
      viewport.scrollTop = nextTop;
      updateCrop(getPoint({ clientX: state.clientX, clientY: state.clientY }));
    }

    if (velocity.x !== 0 || velocity.y !== 0) {
      state.frame = requestAnimationFrame(runAutoPan);
    } else {
      state.frame = null;
      state.lastTime = 0;
    }
  };

  const updateAutoPan = (clientX: number, clientY: number) => {
    autoPanRef.current.clientX = clientX;
    autoPanRef.current.clientY = clientY;
    const velocity = getAutoPanVelocity(clientX, clientY);
    if ((velocity.x === 0 && velocity.y === 0) || autoPanRef.current.frame !== null) return;
    autoPanRef.current.frame = requestAnimationFrame(runAutoPan);
  };

  useEffect(() => () => {
    if (autoPanRef.current.frame !== null) cancelAnimationFrame(autoPanRef.current.frame);
    autoPanRef.current.frame = null;
  }, []);

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = pointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    stopAutoPan();
    const finalCrop = updateCrop(getPoint(event));
    pointerRef.current = null;
    if (surfaceRef.current?.hasPointerCapture(event.pointerId)) surfaceRef.current.releasePointerCapture(event.pointerId);
    if (finalCrop && finalCrop.width > 2 && finalCrop.height > 2) {
      onCommit(visualCropToSource(finalCrop, transformProps));
    }
  };

  const startPointer = (event: React.PointerEvent<HTMLElement>, mode: CropDragMode) => {
    if (event.button !== 0 || !surfaceRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const point = getPoint(event);
    const origin = mode === "create"
      ? { unit: "px" as const, x: point.x, y: point.y, width: 0, height: 0 }
      : (crop || { unit: "px" as const, x: point.x, y: point.y, width: 0, height: 0 });
    pointerRef.current = { pointerId: event.pointerId, mode, startX: point.x, startY: point.y, origin };
    surfaceRef.current.setPointerCapture(event.pointerId);
    if (mode === "create") setCrop(origin);
    autoPanRef.current.clientX = event.clientX;
    autoPanRef.current.clientY = event.clientY;
    updateAutoPan(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerRef.current || pointerRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateCrop(getPoint(event));
    updateAutoPan(event.clientX, event.clientY);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-crop-selection]")) return;
    startPointer(event, "create");
  };

  const handleStyle = (mode: Exclude<CropDragMode, "create" | "move">): React.CSSProperties => {
    const common: React.CSSProperties = {
      position: "absolute",
      width: 12,
      height: 12,
      background: "#fff",
      border: "1px solid rgba(32, 32, 32, 0.65)",
      borderRadius: 2,
      zIndex: 3,
    };
    const positions: Record<typeof mode, React.CSSProperties> = {
      nw: { left: 0, top: 0, cursor: "nwse-resize", transform: "translate(-50%, -50%)" },
      n: { left: "50%", top: 0, cursor: "ns-resize", transform: "translate(-50%, -50%)" },
      ne: { right: 0, top: 0, cursor: "nesw-resize", transform: "translate(50%, -50%)" },
      e: { right: 0, top: "50%", cursor: "ew-resize", transform: "translate(50%, -50%)" },
      se: { right: 0, bottom: 0, cursor: "nwse-resize", transform: "translate(50%, 50%)" },
      s: { left: "50%", bottom: 0, cursor: "ns-resize", transform: "translate(-50%, 50%)" },
      sw: { left: 0, bottom: 0, cursor: "nesw-resize", transform: "translate(-50%, 50%)" },
      w: { left: 0, top: "50%", cursor: "ew-resize", transform: "translate(-50%, -50%)" },
    };
    return { ...common, ...positions[mode] };
  };

  const handles: Array<Exclude<CropDragMode, "create" | "move">> = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div
      ref={surfaceRef}
      className={className}
      style={{ ...style, position: "relative", width: `${visualWidth}px`, height: `${visualHeight}px`, touchAction: "none", userSelect: "none", cursor: crop ? "default" : "crosshair" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
    >
      <img src={src} className={imageClassName} style={{ ...imageStyle, width: `${visualWidth}px`, height: `${visualHeight}px`, objectFit: "fill" }} alt={alt} draggable={false} />
      {crop && crop.width > 0 && crop.height > 0 && (
        <div
          data-crop-selection
          className="absolute border border-white/90 bg-[#0a84ff]/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]"
          style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height, cursor: "move", touchAction: "none" }}
          onPointerDown={(event) => startPointer(event, "move")}
        >
          {handles.map((mode) => (
            <span
              key={mode}
              data-crop-handle={mode}
              style={handleStyle(mode)}
              onPointerDown={(event) => startPointer(event, mode)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

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
  isDocumentLoading: boolean;
  scannerPdfDoc: any;
  scannerCrop: Crop | undefined;
  setScannerCrop: (crop: Crop | undefined) => void;
  cropQueue: Array<any>;
  setCropQueue: React.Dispatch<React.SetStateAction<Array<any>>>;
  scannerImgRef: React.RefObject<HTMLImageElement>;

  handleAddToQueue: () => void;
  handlePageChange: (newPage: number) => Promise<void>;
  executeExtraction: () => Promise<string>;
  onStopScan?: () => void;
  scannerRunState?: 'idle' | 'preflight' | 'scanning' | 'stopping';

  ocrResult: string;
  setOcrResult: React.Dispatch<React.SetStateAction<string>>;

  loadOcrIntoEditor: (forcedText?: string) => void;
  saveOcrIntoRag: (forcedText?: string, customTitle?: string) => Promise<void>;
  loadOcrIntoPractice: (forcedText?: string) => void;
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
  onImportFromUrl?: (rawUrl: string) => Promise<void>;
  onImageSequenceUpload?: (files: File[]) => Promise<void>;

  selectedScanner: string;
  setSelectedScanner: React.Dispatch<React.SetStateAction<string>>;
  selectedColourMode: string;
  setSelectedColourMode: React.Dispatch<React.SetStateAction<string>>;
  selectedResolution: string;
  setSelectedResolution: React.Dispatch<React.SetStateAction<string>>;
  selectedDestinationFolder: string;
  setSelectedDestinationFolder: React.Dispatch<React.SetStateAction<string>>;
  onDiscardCurrentDocument?: () => void;
  scannerProgress?: { currentIndex: number, total: number, status: 'idle' | 'preflight' | 'scanning' | 'stopping' | 'success' | 'error' };
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isScannerOpen,
  scannerFile,
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
  isDocumentLoading,
  scannerCrop,
  setScannerCrop,
  scannerImgRef,
  handlePageChange,
  executeExtraction,
  onStopScan,
  scannerRunState = 'idle',
  scannerProgress,
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
  onImportFromUrl,
  onImageSequenceUpload,
  themeAccentColor,

  selectedScanner,
  setSelectedScanner,
  selectedColourMode,
  setSelectedColourMode,
  selectedResolution,
  setSelectedResolution,
  selectedDestinationFolder,
  setSelectedDestinationFolder,
}) => {
  const { width, height, x, y, startResize, fitToSize } = useResizable({
    persistKey: 'scanner_v2',
    initialWidth: 860,
    initialHeight: 650
  });

  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadPresentation, setUploadPresentation] = useState<{ phase: "idle" | "selected" | "pending" | "success"; file?: File; fileName?: string; thumbnailUrl?: string }>({ phase: "idle" });
  const [isUploadPendingEntered, setIsUploadPendingEntered] = useState(false);
  const uploadPresentationTimerRef = React.useRef<number | null>(null);
  const selectedUploadThumbnailUrlRef = React.useRef<string | null>(null);
  const uploadPresentationStartedAtRef = React.useRef(0);
  const uploadPresentationVisibleAtRef = React.useRef(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const imageSequenceInputRef = React.useRef<HTMLInputElement>(null);
  const localUploadInputRef = React.useRef<HTMLInputElement>(null);
  const activeAccent = themeAccentColor || "#C28181";
  const uploadSurfaceAccent = "#7868F4";
  const hasDocumentLoaded = !!(scannerPreviewUrl || scannerPreviewUrl2 || scannerStitchedUrl);
  const [windowSize, setWindowSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [pageAspectRatio, setPageAspectRatio] = useState(1 / 1.414);

  const resetUploadPresentationTimer = () => {
    if (uploadPresentationTimerRef.current !== null) {
      window.clearTimeout(uploadPresentationTimerRef.current);
      uploadPresentationTimerRef.current = null;
    }
  };

  const resetSelectedUploadThumbnail = () => {
    if (selectedUploadThumbnailUrlRef.current) {
      URL.revokeObjectURL(selectedUploadThumbnailUrlRef.current);
      selectedUploadThumbnailUrlRef.current = null;
    }
  };

  const startLocalUploadPresentation = (file: File) => {
    resetUploadPresentationTimer();
    resetSelectedUploadThumbnail();
    uploadPresentationStartedAtRef.current = performance.now();
    uploadPresentationVisibleAtRef.current = 0;
    setIsUploadPendingEntered(false);
    setUploadPresentation({ phase: "pending", fileName: file.name });
    void onFileUpload?.(file);
  };

  const selectLocalUploadFile = (file: File) => {
    resetUploadPresentationTimer();
    resetSelectedUploadThumbnail();
    const thumbnailUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    selectedUploadThumbnailUrlRef.current = thumbnailUrl || null;
    setUploadPresentation({ phase: "selected", file, fileName: file.name, thumbnailUrl });
  };

  const removeSelectedUploadFile = () => {
    resetUploadPresentationTimer();
    resetSelectedUploadThumbnail();
    if (localUploadInputRef.current) localUploadInputRef.current.value = "";
    setUploadPresentation({ phase: "idle" });
  };

  useEffect(() => {
    if (uploadPresentation.phase !== "pending") return;

    if (hasDocumentLoaded && !isDocumentLoading && isUploadPendingEntered) {
      resetUploadPresentationTimer();
      const showSuccess = () => {
        setUploadPresentation((current) => ({ ...current, phase: "success" }));
        uploadPresentationTimerRef.current = window.setTimeout(() => {
          setUploadPresentation({ phase: "idle" });
          uploadPresentationTimerRef.current = null;
        }, 620);
      };
      const pendingDuration = performance.now() - (uploadPresentationVisibleAtRef.current || uploadPresentationStartedAtRef.current);
      uploadPresentationTimerRef.current = window.setTimeout(showSuccess, Math.max(0, 420 - pendingDuration));
      return;
    }

    if (!isDocumentLoading && !hasDocumentLoaded) {
      resetUploadPresentationTimer();
      const silentResetDelay = Math.max(0, 900 - (performance.now() - uploadPresentationStartedAtRef.current));
      uploadPresentationTimerRef.current = window.setTimeout(() => {
        setUploadPresentation({ phase: "idle" });
        uploadPresentationTimerRef.current = null;
      }, silentResetDelay);
    }
  }, [hasDocumentLoaded, isDocumentLoading, isUploadPendingEntered, uploadPresentation.phase]);

  useEffect(() => () => {
    resetUploadPresentationTimer();
    resetSelectedUploadThumbnail();
  }, []);

  useEffect(() => {
    const onResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const sourceUrl = scannerPreviewUrl || scannerPreviewUrl2;
    if (!sourceUrl) {
      setPageAspectRatio(1 / 1.414);
      return;
    }

    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setPageAspectRatio(image.naturalWidth / image.naturalHeight);
      }
    };
    image.src = sourceUrl;
  }, [scannerPreviewUrl, scannerPreviewUrl2]);

  const isSingleBookPage = scannerTotalPages <= 1 || scannerPage === 1 || (scannerPage === scannerTotalPages && scannerPage % 2 === 0);
  const isScannerProgressActive = Boolean(scannerProgress && scannerProgress.status !== 'idle' && cropQueue.length > 0);
  const activeProgressIndex = scannerProgress?.status === 'success'
    ? cropQueue.length - 1
    : Math.min(Math.max(scannerProgress?.currentIndex ?? 0, 0), Math.max(cropQueue.length - 1, 0));
  const activeProgressCrop = isScannerProgressActive ? cropQueue[activeProgressIndex]?.crop : undefined;
  const progressContentAspectRatio = activeProgressCrop && activeProgressCrop.width > 0 && activeProgressCrop.height > 0
    ? activeProgressCrop.width / activeProgressCrop.height
    : pageAspectRatio;
  const basePageHeight = Math.round(Math.max(280, Math.min(760, windowSize.height - (windowSize.width < 1024 ? 150 : 220))));
  const isNarrowPreview = windowSize.width < 768;
  const previewWidth = viewportSize.width || Math.max(280, windowSize.width - (windowSize.width >= 768 ? 350 : 24));
  const previewHeight = viewportSize.height || Math.max(240, windowSize.height - (windowSize.width < 768 ? 430 : 220));
  const spreadGap = isSingleBookPage ? 0 : 10;
  const spreadColumns = isSingleBookPage ? 1 : 2;
  const widthLimitedPageHeight = (Math.max(180, previewWidth - (isNarrowPreview ? 24 : 64) - spreadGap) / spreadColumns) / Math.max(pageAspectRatio, 0.1);
  const fittedPageHeight = Math.round(Math.max(180, Math.min(basePageHeight, previewHeight - (isNarrowPreview ? 28 : 64), widthLimitedPageHeight)));
  const pageHeight = Math.round(fittedPageHeight * scannerZoom);
  const pageWidth = Math.max(180, Math.round(pageHeight * pageAspectRatio));
  const documentWidth = isSingleBookPage ? pageWidth : pageWidth * 2 + 10;
  const cropSourceWidth = isSingleBookPage ? pageWidth : documentWidth;
  const cropSourceHeight = pageHeight;
  const cropIsQuarterTurned = normalizeQuarterTurn(scannerRotation) === 90 || normalizeQuarterTurn(scannerRotation) === 270;
  const cropVisualWidth = cropIsQuarterTurned ? cropSourceHeight : cropSourceWidth;
  const cropVisualHeight = cropIsQuarterTurned ? cropSourceWidth : cropSourceHeight;
  // Keep one screen-space document box for both the visible transformed page and the crop surface.
  // The previous layout sized the outer box in source orientation, then rotated only its child;
  // that made scroll ranges and pointer coordinates disagree at quarter-turns and high zoom.
  const renderedDocumentWidth = cropIsQuarterTurned ? cropVisualWidth : documentWidth;
  const renderedDocumentHeight = cropIsQuarterTurned ? cropVisualHeight : pageHeight;
  const stagePadding = isNarrowPreview ? 24 : 64;
  const progressDeckMaxWidth = isNarrowPreview
    ? Math.max(240, Math.min(320, previewWidth - stagePadding * 2))
    : Math.max(360, Math.min(680, previewWidth - stagePadding * 2));
  const progressDeckMaxHeight = isNarrowPreview
    ? Math.max(280, Math.min(420, previewHeight - stagePadding * 2))
    : Math.max(360, Math.min(560, previewHeight - stagePadding * 2));
  const progressDeckMinWidth = isNarrowPreview ? 220 : 320;
  const defaultProgressPresentationRatio = 860 / 650;
  // The attached 1200×1696 reference image established the visual floor for
  // non-empty desktop scanner states: a 1078×826 shell, which corresponds to
  // a 720px content floor after the 310px sidebar and 48px shell allowance.
  // Smaller screens remain governed by the existing responsive clamps.
  const referenceFloorShellWidth = 1078;
  const referenceFloorShellHeight = 826;
  const scannerSidebarWidth = windowSize.width >= 768 ? 310 : 0;
  const minimumNonEmptyContentWidth = isNarrowPreview
    ? 280
    : Math.max(320, referenceFloorShellWidth - scannerSidebarWidth - 48);
  const minimumNonEmptyShellHeight = isNarrowPreview ? 420 : referenceFloorShellHeight;
  const isTinyProgressCrop = Boolean(
    activeProgressCrop && (
      Math.min(activeProgressCrop.width, activeProgressCrop.height) < 120
      || progressContentAspectRatio >= 3.4
    ),
  );
  // Very small crops keep a calm default presentation frame. The image itself
  // remains object-contain inside that frame, so no crop pixels are stretched.
  const progressPresentationAspectRatio = isTinyProgressCrop
    ? defaultProgressPresentationRatio
    : Math.max(progressContentAspectRatio, 0.1);
  const progressDeckWidth = Math.round(Math.max(
    progressDeckMinWidth,
    Math.min(progressDeckMaxWidth, progressDeckMaxHeight * progressPresentationAspectRatio),
  ));
  const progressDeckHeight = Math.round(progressDeckWidth / progressPresentationAspectRatio);
  const documentStageWidth = isScannerProgressActive
    ? progressDeckWidth + stagePadding
    : hasDocumentLoaded
      ? Math.max(viewportSize.width || previewWidth, renderedDocumentWidth + stagePadding)
      : undefined;
  const documentStageHeight = isScannerProgressActive
    ? progressDeckHeight + stagePadding
    : hasDocumentLoaded
      ? Math.max(viewportSize.height || previewHeight, renderedDocumentHeight + stagePadding)
      : undefined;

  useEffect(() => {
    if (!isScannerOpen) {
      setViewportSize({ width: 0, height: 0 });
      return;
    }

    const measureViewport = () => {
      const element = viewportRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const nextSize = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setViewportSize(previous => (
        previous.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize
      ));
    };

    measureViewport();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureViewport) : null;
    if (observer && viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener("resize", measureViewport);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureViewport);
    };
  }, [hasDocumentLoaded, isScannerOpen, scannerTotalPages]);

  useEffect(() => {
    if (!isScannerOpen || windowSize.width < 640) return;

    const sidebarWidth = scannerSidebarWidth;
    if (!hasDocumentLoaded && !isScannerProgressActive) {
      fitToSize(
        Math.min(900, windowSize.width - 24, 860),
        Math.min(700, windowSize.height - 24, 650),
      );
      return;
    }

    const basePageWidth = Math.max(180, Math.round(basePageHeight * pageAspectRatio));
    // Single pages get their own comfortable shell; spreads still reserve room for
    // both pages. Every non-empty state also honors the measured reference floor.
    const spreadComfortWidth = basePageWidth * 2 + 10;
    const fitWidth = isScannerProgressActive
      ? Math.max(progressDeckWidth, minimumNonEmptyContentWidth)
      : isSingleBookPage
        ? Math.max(documentWidth, minimumNonEmptyContentWidth)
        : Math.max(documentWidth, spreadComfortWidth, minimumNonEmptyContentWidth);
    const fitHeight = Math.max(
      isScannerProgressActive
      ? progressDeckHeight + stagePadding + 104
      : basePageHeight + 86,
      minimumNonEmptyShellHeight,
    );
    fitToSize(
      Math.min(1240, windowSize.width - 24, fitWidth + sidebarWidth + 48),
      Math.min(900, windowSize.height - 24, fitHeight),
    );
  }, [basePageHeight, documentWidth, fitToSize, hasDocumentLoaded, isNarrowPreview, isScannerOpen, isScannerProgressActive, isSingleBookPage, pageAspectRatio, progressDeckHeight, progressDeckWidth, stagePadding, windowSize.height, windowSize.width]);

  // Auto-detected file type from the uploaded file's extension (read-only indicator)
  const detectedFileType = React.useMemo(() => {
    if (!scannerFile) return "—";
    const ext = scannerFile.name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      pdf: "PDF", png: "PNG", jpg: "JPEG", jpeg: "JPEG",
      webp: "WEBP", md: "Markdown", html: "HTML", txt: "Text"
    };
    return map[ext] ?? "Unknown";
  }, [scannerFile]);

  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [pendingTextToSend, setPendingTextToSend] = useState("");
  const [shakePath, setShakePath] = useState(false);
  const [showPathRequiredError, setShowPathRequiredError] = useState(false);

  // AI provider key handling — keys live in localStorage (never leave the browser)
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyRefresh, setKeyRefresh] = useState(0);
  const [apiKeyDraft, setApiKeyDraft] = useState("");

  // Scanner selector policy: a provider appears usable only when its existing
  // browser-local key is configured. This deliberately leaves the key contract
  // unchanged: one scalar key per provider under `royscript_ai_keys`.
  const configuredProviders = React.useMemo(() => {
    const keys = loadProviderKeys();
    return {
      gemini: Boolean(keys.gemini?.trim()),
      groq: Boolean(keys.groq?.trim()),
      openai: Boolean(keys.openai?.trim()),
    };
  }, [keyRefresh]);
  const hasAnyConfiguredProvider = Object.values(configuredProviders).some(Boolean);

  // If a provider key is removed outside this panel while another provider is
  // still usable, retain a valid selected route instead of leaving a disabled
  // option as the active scanner model. With no configured providers, retain
  // the current choice so the existing Add key flow remains targeted.
  useEffect(() => {
    if (!hasAnyConfiguredProvider || configuredProviders[getProviderOf(selectedScanner)]) return;
    const nextModel = configuredProviders.gemini
      ? "gemini-3.7-flash"
      : configuredProviders.groq
        ? "groq-llama-3.3-70b"
        : "openai-gpt-4o";
    setSelectedScanner((current) => current === nextModel ? current : nextModel);
  }, [configuredProviders.gemini, configuredProviders.groq, configuredProviders.openai, hasAnyConfiguredProvider, selectedScanner, setSelectedScanner]);

  const providerLabel = (() => {
    const p = getProviderOf(selectedScanner);
    return p === "gemini" ? "Gemini" : p === "groq" ? "Groq" : "OpenAI";
  })();

  const apiKeyConfigured = configuredProviders[getProviderOf(selectedScanner)];

  const saveApiKey = () => {
    const provider = getProviderOf(selectedScanner);
    const keys: ProviderKeys = { ...loadProviderKeys() };
    if (apiKeyDraft.trim()) {
      keys[provider] = apiKeyDraft.trim();
    } else {
      delete keys[provider];
    }
    saveProviderKeys(keys);
    setShowKeyInput(false);
    setApiKeyDraft("");
    setKeyRefresh((v) => v + 1);
  };

  // Sync draft when the selected model changes (fresh key per provider)
  useEffect(() => {
    if (showKeyInput) {
      const provider = getProviderOf(selectedScanner);
      setApiKeyDraft(loadProviderKeys()[provider] || "");
    }
  }, [selectedScanner, showKeyInput]);

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
  const zoomAnchorRef = React.useRef<{ clientX: number; clientY: number; u: number; v: number } | null>(null);

  const getZoomAnchorPoint = (point?: { clientX: number; clientY: number }) => {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();
    if (!rect) return point || null;
    return point || { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
  };

  const changeScannerZoom = (
    updater: React.SetStateAction<number>,
    point?: { clientX: number; clientY: number },
  ) => {
    const viewport = viewportRef.current;
    const surface = viewport?.querySelector<HTMLElement>('[data-scanner-document-surface]');
    const anchorPoint = getZoomAnchorPoint(point);
    if (viewport && surface && anchorPoint) {
      const rect = surface.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        zoomAnchorRef.current = {
          clientX: anchorPoint.clientX,
          clientY: anchorPoint.clientY,
          u: cropClamp((anchorPoint.clientX - rect.left) / rect.width, 0, 1),
          v: cropClamp((anchorPoint.clientY - rect.top) / rect.height, 0, 1),
        };
      }
    }
    setScannerZoom(updater);
  };

  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    if (!anchor) return;
    const viewport = viewportRef.current;
    const surface = viewport?.querySelector<HTMLElement>('[data-scanner-document-surface]');
    if (!viewport || !surface) return;
    const rect = surface.getBoundingClientRect();
    const nextLeft = rect.left + anchor.u * rect.width - anchor.clientX;
    const nextTop = rect.top + anchor.v * rect.height - anchor.clientY;
    viewport.scrollLeft = cropClamp(viewport.scrollLeft + nextLeft, 0, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
    viewport.scrollTop = cropClamp(viewport.scrollTop + nextTop, 0, Math.max(0, viewport.scrollHeight - viewport.clientHeight));
    zoomAnchorRef.current = null;
  }, [scannerZoom, renderedDocumentWidth, renderedDocumentHeight, viewportSize.width, viewportSize.height]);

  useLayoutEffect(() => {
    if (!isScannerProgressActive) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [isScannerProgressActive, cropQueue.length, scannerProgress?.status]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheelZoom = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
      event.preventDefault();
      changeScannerZoom(
        z => Math.min(Math.max(0.2, z - (event.deltaY > 0 ? 0.05 : -0.05)), 4.0),
        { clientX: event.clientX, clientY: event.clientY },
      );
    };
    viewport.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheelZoom);
  }, [scannerZoom]);

  const beginViewportPan = (e: React.PointerEvent) => {
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

  const onPointerDown = (e: React.PointerEvent) => {
    beginViewportPan(e);
  };

  const onCropPointerDownCapture = (e: React.PointerEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    beginViewportPan(e);
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
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) {
      viewportRef.current.releasePointerCapture(e.pointerId);
    }
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

  const canScan = Boolean(cropQueue.length > 0 || scannerStitchedUrl || scannerPreviewUrl || ocrResult.trim());

  const triggerScan = async () => {
    if (isOcrLoading) {
      onStopScan?.();
      return;
    }
    if (!canScan) return;
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
        data-scanner-modal-shell
        className="bg-[#FCF5F3] dark:bg-[#20202A] sm:rounded-xl shadow-[0_24px_54px_rgba(0,0,0,0.25)] overflow-hidden border-none sm:border border-black/5 dark:border-white/10 font-sans flex flex-col min-h-0"
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
              <Printer className="w-4 h-4" strokeWidth={1.75} />
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
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar Options */}
          <div className="w-full md:w-[310px] flex flex-col min-h-0 max-h-[46vh] md:max-h-none px-7 pb-6 overflow-y-auto custom-scrollbar shrink-0 border-b md:border-b-0 md:border-r border-black/5 dark:border-white/5">
            <h1 className="text-[26px] font-semibold text-[#1E1E1E] dark:text-[#FFFFFF] mt-3 mb-6 tracking-tight">Scan</h1>

            {/* AI Model — pipeline routing for the scan */}
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Scanner</label>
              <div className="relative">
                 <select
                   value={selectedScanner}
                   onChange={e => setSelectedScanner(e.target.value)}
                   disabled={!hasAnyConfiguredProvider}
                   data-scanner-model-selector
                   className="w-full appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                     <optgroup label="Google Gemini" disabled={!configuredProviders.gemini}>
                      <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </optgroup>
                    <optgroup label="Groq" disabled={!configuredProviders.groq}>
                      <option value="groq-llama-3.3-70b">Llama 3.3 70B (Groq)</option>
                      <option value="groq-llama-3.1-8b">Llama 3.1 8B (Groq)</option>
                      <option value="groq-mixtral-8x7b">Mixtral 8x7B (Groq)</option>
                      <option value="groq-gemma2-9b">Gemma 2 9B (Groq)</option>
                    </optgroup>
                    <optgroup label="OpenAI" disabled={!configuredProviders.openai}>
                      <option value="openai-gpt-4o">GPT-4o</option>
                      <option value="openai-gpt-4o-mini">GPT-4o mini</option>
                      <option value="openai-gpt-4.1">GPT-4.1</option>
                      <option value="openai-gpt-4.1-mini">GPT-4.1 mini</option>
                      <option value="openai-gpt-4.1-nano">GPT-4.1 nano</option>
                    </optgroup>
                 </select>
                 <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
              {showKeyInput && (
                <div key={`key-${keyRefresh}`} className="mt-2 flex items-center gap-1.5">
                  <input
                    type="password"
                    placeholder={`${providerLabel} API key`}
                    defaultValue={loadProviderKeys()[getProviderOf(selectedScanner)] || ""}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                    className="flex-1 min-w-0 appearance-none bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-2.5 py-1 text-[12px] text-[#202020] dark:text-[#EAEAEA] outline-none focus:border-[#C28181] dark:focus:border-[#60C5EA]"
                  />
                  <button
                    onClick={() => saveApiKey()}
                    className="px-2.5 py-1 text-[12px] font-medium rounded-md bg-[#C28181] dark:bg-[#60C5EA] text-white transition-opacity hover:opacity-90 active:scale-[0.97]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowKeyInput(false)}
                    className="px-2 py-1 text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* File Type — auto-detected from the uploaded file extension */}
            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">File type</label>
              <div className="w-full bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] outline-none shadow-sm flex items-center gap-2 h-[32px]">
                 <span className={`font-medium tracking-wide ${
                   detectedFileType
                     ? 'text-[#202020] dark:text-[#EAEAEA]'
                     : 'text-gray-400 dark:text-gray-500'
                 }`}>{detectedFileType}</span>
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
          <div className="flex-1 min-h-[280px] md:min-h-0 bg-[#F9F9F9] dark:bg-[#1A1A22] rounded-tl-[10px] border-t border-l border-black/5 dark:border-white/5 relative flex flex-col items-center justify-between shadow-[-4px_-4px_16px_rgba(0,0,0,0.02)] overflow-hidden">

            {/* The Document Presentation Viewport with Scrolling */}
            <div
               id="scanner-viewport"
               ref={viewportRef}
               onPointerDown={onPointerDown}
               onPointerMove={onPointerMove}
               onPointerUp={onPointerUp}
               onPointerCancel={onPointerUp}
               onPointerLeave={onPointerUp}
               className={`flex-1 min-h-0 w-full overflow-auto custom-scrollbar relative bg-[#F9F9F9] dark:bg-[#1A1A22] ${isSpacePressed ? (dragRef.current?.isDragging ? "cursor-grabbing" : "cursor-grab") : isCropEnabled ? "cursor-crosshair" : dragRef.current?.isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
               {isDocumentLoading && uploadPresentation.phase === "idle" && (
                 <div className="absolute inset-0 z-[80] flex items-center justify-center bg-[#F9F9F9]/90 dark:bg-[#1A1A22]/90 backdrop-blur-[2px]">
                   <div className="flex flex-col items-center gap-3 text-neutral-600 dark:text-neutral-300">
                     <div className="h-7 w-7 rounded-full border-2 border-current border-t-transparent animate-spin" />
                     <span className="text-[13px] font-medium">Loading document…</span>
                   </div>
                 </div>
               )}
               <AnimatePresence>
                 {uploadPresentation.phase === "success" && (
                   <motion.div
                     data-scanner-upload-success
                     initial={{ opacity: 0, scale: 0.96 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.985 }}
                     transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                     className="absolute inset-0 z-[82] flex items-center justify-center bg-[#F9F9F9]/88 dark:bg-[#1A1A22]/88 backdrop-blur-[2px] pointer-events-none"
                   >
                     <div className="flex items-center gap-2.5 text-gray-700 dark:text-gray-200 text-[13px] font-medium">
                       <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 dark:bg-white/[0.06] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.5)]">
                         <CheckCircle className="h-4 w-4" style={{ color: activeAccent }} strokeWidth={1.9} />
                       </span>
                       <span>Document ready</span>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
               <div
                 data-scanner-stage
                 className="relative m-auto flex items-center justify-center p-3 sm:p-8 transition-all duration-200"
                 style={documentStageWidth && documentStageHeight ? {
                   width: `${documentStageWidth}px`,
                   height: `${documentStageHeight}px`,
                   minWidth: `${documentStageWidth}px`,
                   minHeight: `${documentStageHeight}px`,
                   marginTop: isScannerProgressActive
                     ? `${Math.max(0, Math.round(((viewportSize.height || previewHeight) - documentStageHeight) / 2))}px`
                     : undefined,
                 } : undefined}
               >
                  <div
                    className={`m-auto relative ${!hasDocumentLoaded || uploadPresentation.phase === "selected" || uploadPresentation.phase === "pending" ? "w-full" : ""}`}
                    style={isCropEnabled && hasDocumentLoaded && !isScannerProgressActive ? { width: `${cropVisualWidth}px`, height: `${cropVisualHeight}px` } : undefined}
                  >
                  {scannerProgress && scannerProgress.status !== 'idle' && cropQueue.length > 0 ? (
                      <div
                        className="relative flex flex-col items-center justify-center"
                        style={{ width: `${progressDeckWidth}px`, height: `${progressDeckHeight}px` }}
                      >
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

                         {/* Typography Status — keep the caption clear of the lower scanner controls. */}
                         <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                            {scannerProgress.status === 'success' ? (
                               <div className="text-neutral-700 dark:text-neutral-300 font-medium text-[13px] flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" strokeWidth={2.5} />
                                  <span>Scan completed</span>
                               </div>
                            ) : scannerProgress.status === 'stopping' ? (
                               <div className="text-gray-800 dark:text-gray-200 font-medium text-[13px] flex items-center gap-2">
                                  <Hand className="w-3.5 h-3.5" strokeWidth={2} />
                                  <span>Stopping scan...</span>
                               </div>
                            ) : scannerProgress.status === 'preflight' ? (
                               <div className="text-gray-800 dark:text-gray-200 font-medium text-[13px] flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                                  <span>Preparing scan...</span>
                               </div>
                            ) : (
                               <div className="text-gray-800 dark:text-gray-200 font-medium text-[13px] flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                                  <span>Scanning clip {scannerProgress.currentIndex + 1} of {scannerProgress.total}...</span>
                               </div>
                            )}
                         </div>
                      </div>
                   ) : (!hasDocumentLoaded || uploadPresentation.phase === "selected" || uploadPresentation.phase === "pending") ? (
                     <div
                       data-scanner-empty-upload-state
                       className="w-full max-w-[520px] min-h-[340px] mx-auto rounded-[28px] bg-transparent p-5 transition-colors duration-300"
                       style={{ backgroundColor: isDragActive ? `${uploadSurfaceAccent}0E` : undefined }}
                       onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setIsDragActive(true); }}
                       onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); setIsDragActive(true); }}
                       onDragLeave={(event) => { event.preventDefault(); event.stopPropagation(); setIsDragActive(false); }}
                       onDrop={(event) => {
                         event.preventDefault();
                         event.stopPropagation();
                         setIsDragActive(false);
                         const file = event.dataTransfer.files?.[0];
                         if (file) selectLocalUploadFile(file);
                       }}
                     >
                       <input
                         ref={localUploadInputRef}
                         type="file"
                         className="hidden"
                         accept=".pdf,.md,.html,.txt,.jpeg,.jpg,.png,.webp"
                         onChange={(event) => {
                           const file = event.target.files?.[0];
                           if (file) selectLocalUploadFile(file);
                         }}
                       />
                       <input
                         ref={imageSequenceInputRef}
                         type="file"
                         className="hidden"
                         accept=".jpeg,.jpg,.png,.webp"
                         multiple
                         onChange={(event) => {
                           const files = Array.from(event.target.files || []);
                           event.target.value = "";
                           void onImageSequenceUpload?.(files);
                         }}
                       />
                       <AnimatePresence mode="wait" initial={false}>
                         {uploadPresentation.phase === "pending" ? (
                           <motion.div
                             key="pending-upload"
                             data-scanner-upload-pending
                             initial={{ opacity: 0, y: 12 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                             onAnimationComplete={() => {
                               uploadPresentationVisibleAtRef.current = performance.now();
                               setIsUploadPendingEntered(true);
                             }}
                             className="flex min-h-[290px] flex-col justify-center"
                           >
                             <div className="mx-auto w-full max-w-[368px] rounded-2xl bg-white/70 px-5 py-4 shadow-[0_14px_30px_-24px_rgba(62,55,91,0.45)] dark:bg-white/[0.045]">
                               <div className="flex items-center gap-3.5">
                                 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#7868F4] dark:bg-[#7868F4]/15"><FileText className="h-4.5 w-4.5" strokeWidth={1.7} /></span>
                                 <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-[#343146] dark:text-white">{uploadPresentation.fileName}</span><span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#807C8D] dark:text-white/45"><span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Preparing document</span></span>
                               </div>
                               <div className="mt-3 h-px overflow-hidden bg-[#EAE7F2] dark:bg-white/[0.08]"><motion.div className="h-full w-[42%] bg-[#7868F4]" initial={{ x: "-115%" }} animate={{ x: "260%" }} transition={{ repeat: Infinity, duration: 1.05, ease: "linear" }} /></div>
                             </div>
                           </motion.div>
                         ) : (
                           <motion.div key={uploadPresentation.phase === "selected" ? "selected-upload" : "idle-upload"} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }} className="flex min-h-[290px] flex-col">
                             <button
                               type="button"
                               data-scanner-upload-dropzone
                               onClick={() => localUploadInputRef.current?.click()}
                             className={`flex w-full flex-col items-center justify-center rounded-[22px] px-8 text-center transition-all duration-300 ${uploadPresentation.phase === "selected" ? "min-h-[108px] py-3" : "min-h-[168px]"} ${isDragActive ? "bg-[#F0EEFF] text-[#4C3CC8] dark:bg-[#7868F4]/16 dark:text-white" : "bg-transparent text-[#28253B] hover:bg-[#FAF9FD] dark:text-white dark:hover:bg-white/[0.035]"}`}
                             >
                               {isDragActive ? (
                                 <>
                                   <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-[#7868F4] dark:bg-white/[0.08] dark:text-white"><Images className="h-5 w-5" strokeWidth={1.6} /></span>
                                   <h3 className="text-[17px] font-semibold tracking-[-0.025em]">Drop document here</h3>
                                 </>
                               ) : (
                                 <>
                                   <span className={`flex items-center justify-center rounded-2xl bg-white text-[#8B8798] shadow-[0_12px_26px_-20px_rgba(53,47,78,0.5)] dark:bg-white/[0.07] dark:text-white/65 ${uploadPresentation.phase === "selected" ? "mb-2 h-10 w-10" : "mb-4 h-12 w-12"}`} aria-hidden="true">
                                     <FileText className={uploadPresentation.phase === "selected" ? "h-4.5 w-4.5" : "h-5 w-5"} strokeWidth={1.55} />
                                   </span>
                                   <h3 className={`${uploadPresentation.phase === "selected" ? "text-[16px]" : "text-[18px]"} font-semibold tracking-[-0.025em]`}>Add a document</h3>
                                   <p className={`${uploadPresentation.phase === "selected" ? "mt-0.5 text-[11px]" : "mt-1.5 text-[12px]"} text-[#777386] dark:text-white/55`}>Drop a file here, or choose one from your device.</p>
                                 </>
                               )}
                             </button>

                             {uploadPresentation.phase === "selected" && uploadPresentation.file ? (
                               <motion.div data-scanner-upload-selected initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, duration: 0.2 }} className="mx-auto mt-3 flex w-full max-w-[368px] items-center gap-3 rounded-2xl bg-white/65 px-3.5 py-2.5 shadow-[0_12px_28px_-24px_rgba(53,47,78,0.42)] dark:bg-white/[0.04]">
                                 <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F0EEFF] text-[#7868F4] dark:bg-[#7868F4]/15">
                                   {uploadPresentation.thumbnailUrl ? <img data-scanner-upload-thumbnail src={uploadPresentation.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5" strokeWidth={1.7} />}
                                 </span>
                                 <span className="min-w-0 flex-1 text-left"><span className="block truncate text-[14px] font-medium text-[#343146] dark:text-white">{uploadPresentation.file.name}</span><span className="mt-0.5 block text-[12px] text-[#8A8696] dark:text-white/45">{uploadPresentation.file.type.startsWith("image/") ? "Image" : "Document"} · {formatUploadFileSize(uploadPresentation.file.size)}</span></span>
                                 <button data-scanner-remove-selected-upload type="button" aria-label="Remove selected file" onClick={removeSelectedUploadFile} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9A95A8] transition-colors hover:bg-[#F5F3F8] hover:text-[#5E5968] dark:hover:bg-white/[0.06]"><X className="h-4 w-4" strokeWidth={2} /></button>
                               </motion.div>
                             ) : null}

                             <div className="mt-auto pt-3">
                               <button
                                 data-scanner-local-upload
                                 type="button"
                                 onClick={() => uploadPresentation.phase === "selected" && uploadPresentation.file ? startLocalUploadPresentation(uploadPresentation.file) : localUploadInputRef.current?.click()}
                                 className="mx-auto flex min-w-[148px] items-center justify-center gap-2 rounded-xl bg-[#7868F4] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_22px_-16px_rgba(80,64,213,0.72)] transition-all hover:bg-[#6D5DE8] active:scale-[0.97]"
                               >
                                 <FolderOpen className="h-4 w-4" strokeWidth={1.9} />
                                 {uploadPresentation.phase === "selected" ? "Upload document" : "Choose file"}
                               </button>
                               <div className="mt-4 flex flex-col items-center border-t border-[#ECEAF2] pt-3 dark:border-white/[0.08]">
                                 <div className="flex items-center justify-center gap-3">
                                   <button data-scanner-import-url type="button" onClick={() => { const rawUrl = window.prompt("Paste a public document link"); if (rawUrl?.trim()) void onImportFromUrl?.(rawUrl); }} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-[#777386] transition-colors hover:bg-[#F3F1FC] hover:text-[#4B465C] dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"><Link className="h-3.5 w-3.5" strokeWidth={1.8} />From link</button>
                                   <span className="h-3.5 w-px bg-[#DEDCEA] dark:bg-white/[0.12]" aria-hidden="true" />
                                   <button data-scanner-image-sequence type="button" onClick={() => imageSequenceInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-[#777386] transition-colors hover:bg-[#F3F1FC] hover:text-[#4B465C] dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white"><Images className="h-3.5 w-3.5" strokeWidth={1.8} />Image sequence</button>
                                 </div>
                                 <p className="mt-1.5 text-[10px] font-medium tracking-[0.01em] text-[#A29EAE] dark:text-white/35">PDF · Images · Text &nbsp;•&nbsp; Up to 20 MB</p>
                               </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                  ) : scannerTotalPages > 1 ? (
                    // Book Spread Layout & Single Cover System
                    <>
                    <div data-scanner-document-surface className={`relative flex items-stretch drop-shadow-2xl bg-transparent ${isCropEnabled ? 'absolute left-1/2 top-1/2' : 'transition-transform duration-300 ease-in-out'}`}
                         style={{
                            transform: isCropEnabled ? 'translate(-50%, -50%)' : undefined,
                            transformOrigin: 'center center',
                            height: `${renderedDocumentHeight}px`,
                            width: `${renderedDocumentWidth}px`,
                            aspectRatio: 'auto',
                            maxWidth: !isCropEnabled && scannerZoom <= 1 ? '100%' : undefined,
                            maxHeight: !isCropEnabled && scannerZoom <= 1 ? '100%' : undefined
                         }}
                         onContextMenu={handleContextMenu}
                    >
                      <div
                        className="absolute left-1/2 top-1/2"
                        style={{
                          width: `${documentWidth}px`,
                          height: `${pageHeight}px`,
                          transform: `translate(-50%, -50%) rotate(${scannerRotation}deg) scaleX(${scannerScaleX}) scaleY(${scannerScaleY})`,
                          transformOrigin: 'center center',
                        }}
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

                          </>
                        );
                      })()}
                      </div>
                    {isCropEnabled ? (
                      <div onPointerDownCapture={onCropPointerDownCapture} className={`absolute inset-0 z-20 pointer-events-auto ${isSpacePressed ? "pointer-events-none" : ""}`}>
                        <ScannerCropSurface
                          crop={scannerCrop}
                          onCommit={setScannerCrop}
                          viewportRef={viewportRef}
                          src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                          sourceWidth={cropSourceWidth}
                          sourceHeight={cropSourceHeight}
                          visualWidth={cropVisualWidth}
                          visualHeight={cropVisualHeight}
                          rotation={scannerRotation}
                          scaleX={scannerScaleX}
                          scaleY={scannerScaleY}
                          className="w-full h-full"
                          style={{ height: '100%', width: '100%' }}
                          imageClassName="w-full h-full opacity-0 pointer-events-none block"
                          imageStyle={{ objectFit: 'fill' }}
                          alt="Crop overlay"
                        />
                      </div>
                    ) : null}
                    </div>
                    </>
                  ) : (
                    // Single Page Layout (Seamlessly fit without scroll when 100%)
                    <>
                    <div data-scanner-document-surface
                      className={`relative shadow-2xl bg-white dark:bg-[#f6f6f6] rounded-sm ${isCropEnabled ? 'absolute left-1/2 top-1/2' : 'transition-transform duration-300'}`}
                        style={{
                          transform: isCropEnabled ? 'translate(-50%, -50%)' : undefined,
                          transformOrigin: 'center center',
                          width: `${renderedDocumentWidth}px`,
                          height: `${renderedDocumentHeight}px`,
                        maxWidth: !isCropEnabled && scannerZoom <= 1 ? '100%' : undefined,
                        maxHeight: !isCropEnabled && scannerZoom <= 1 ? '100%' : undefined
                      }}>
                       <div
                         className="absolute left-1/2 top-1/2"
                         style={{
                           width: `${pageWidth}px`,
                           height: `${pageHeight}px`,
                           transform: `translate(-50%, -50%) rotate(${scannerRotation}deg) scaleX(${scannerScaleX}) scaleY(${scannerScaleY})`,
                           transformOrigin: 'center center',
                         }}
                       >
                       <img
                         ref={scannerImgRef}
                         src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                         className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                         style={{ objectFit: 'fill' }}
                         alt=""
                       />
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
                            onPointerDownCapture={onCropPointerDownCapture}
                            onContextMenu={handleContextMenu}
                          >
                             <img
                                src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                                alt="Scanned Document Paper Element"
                                className="block pointer-events-none rounded-sm"
                                style={{ height: `${pageHeight}px`, width: 'auto', filter: getImageFilterStyle() }}
                             />
                          </div>
                       ) : (
                          <div
                            data-scanner-empty-upload-state
                            className={`w-full max-w-2xl border border-gray-200/70 bg-gradient-to-b from-white to-gray-50/70 dark:border-white/[0.08] dark:from-[#1D1D26] dark:to-[#181820] flex flex-col items-center justify-center rounded-2xl transition-all duration-300 group mx-auto ${windowSize.width < 640 ? 'mt-4 mb-12 px-5 py-4' : 'my-auto px-7 py-8'} ${
                              isDragActive
                                ? "scale-[1.01]"
                                : "hover:border-gray-300 dark:hover:border-white/[0.13]"
                            }`}
                            style={{
                              height: windowSize.width < 640
                                ? '248px'
                                : `calc(max(320px, 80vh - 220px) * ${scannerZoom})`,
                              minHeight: windowSize.width < 640 ? '248px' : '420px',
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
                                 startLocalUploadPresentation(e.dataTransfer.files[0]);
                               }
                            }}
                          >
                             <div className={`${windowSize.width < 640 ? 'w-10 h-10 rounded-xl mb-3' : 'w-12 h-12 rounded-2xl mb-5'} bg-white/80 dark:bg-white/[0.045] flex items-center justify-center transition-all duration-300 border border-black/[0.06] dark:border-white/[0.07] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.45)]`}
                                style={{
                                  transform: isDragActive ? "scale(1.06) translateY(-3px)" : undefined,
                                  borderColor: isDragActive ? activeAccent : undefined
                                }}>
                                <FileText
                                  className="w-5 h-5 transition-colors duration-300"
                                  style={{ color: isDragActive ? activeAccent : '#8b8b99' }}
                                  strokeWidth={1.65}
                                />
                             </div>

                              <h3 className="text-gray-800 dark:text-gray-100 font-semibold text-[17px] mb-1 tracking-[-0.02em]">
                                Add a document
                              </h3>
                              <p className={`${windowSize.width < 640 ? 'text-[12px] mb-4' : 'text-[13px] mb-6'} text-gray-500 dark:text-gray-400 font-medium text-center`}>
                                Drop a file here, or choose one from your device.
                             </p>

                             <label
                               data-scanner-local-upload
                               className="text-white min-w-32 px-5 py-2.5 rounded-xl font-medium cursor-pointer transition-all shadow-[0_10px_20px_-12px_rgba(0,0,0,0.65)] text-[13px] hover:brightness-105 hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.7)] active:scale-[0.97] duration-150 inline-flex items-center justify-center gap-2"
                               style={{ backgroundColor: activeAccent }}
                             >
                               <FolderOpen className="w-3.5 h-3.5" strokeWidth={1.9} />
                               Choose file
                               <input
                                 type="file"
                                 className="hidden"
                                 accept=".pdf,.md,.html,.txt,.jpeg,.jpg,.png,.webp"
                                 onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      startLocalUploadPresentation(e.target.files[0]);
                                    }
                                 }}
                               />
                             </label>

                              <div className={`${windowSize.width < 640 ? 'mt-4 pt-3' : 'mt-7 pt-5'} w-full max-w-[310px] border-t border-gray-200/70 dark:border-white/[0.07] flex flex-col items-center`}>
                                <input
                                  ref={imageSequenceInputRef}
                                  type="file"
                                  className="hidden"
                                  accept=".jpeg,.jpg,.png,.webp"
                                  multiple
                                  onChange={(event) => {
                                    const files = Array.from(event.target.files || []);
                                    event.target.value = "";
                                    void onImageSequenceUpload?.(files);
                                  }}
                                />
                                <div className="flex items-center justify-center gap-2.5">
                                <button data-scanner-import-url type="button" onClick={() => {
                                  const rawUrl = window.prompt("Paste a public document link");
                                  if (rawUrl?.trim()) void onImportFromUrl?.(rawUrl);
                                }} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-[12px] inline-flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                                  <Link className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  From link
                                </button>
                                <span className="h-3.5 w-px bg-gray-200 dark:bg-white/[0.10]" aria-hidden="true" />
                                <button type="button" onClick={() => imageSequenceInputRef.current?.click()} data-scanner-image-sequence className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-[12px] inline-flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
                                  <Images className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  Image sequence
                                </button>
                                </div>
                                <p className={`${windowSize.width < 640 ? 'mt-2' : 'mt-3'} text-[10px] font-medium tracking-[0.01em] text-gray-400 dark:text-gray-500 text-center`}>
                                  PDF · Images · Text &nbsp;•&nbsp; Up to 20 MB
                                </p>
                              </div>
                          </div>
                       )}
                       </div>
                    {isCropEnabled ? (
                      <div
                        onPointerDownCapture={onCropPointerDownCapture}
                        className={`absolute inset-0 z-20 ${isSpacePressed ? "pointer-events-none" : "pointer-events-auto"}`}
                      >
                        <ScannerCropSurface
                          crop={scannerCrop}
                          onCommit={setScannerCrop}
                          viewportRef={viewportRef}
                          src={scannerStitchedUrl || scannerPreviewUrl || undefined}
                          sourceWidth={cropSourceWidth}
                          sourceHeight={cropSourceHeight}
                          visualWidth={cropVisualWidth}
                          visualHeight={cropVisualHeight}
                          rotation={scannerRotation}
                          scaleX={scannerScaleX}
                          scaleY={scannerScaleY}
                          className="w-full h-full"
                          style={{ height: '100%', width: '100%' }}
                          imageClassName="w-full h-full opacity-0 pointer-events-none block"
                          imageStyle={{ objectFit: 'fill' }}
                          alt="Crop overlay"
                        />
                      </div>
                    ) : null}
                    </div>
                    </>
                  )}
                  </div>

               </div>
            </div>

            {/* Bottom Final Action Bar */}
            <div
              data-scanner-action-bar
              className="w-full p-4 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-[#FFFFFF] dark:bg-[#20202A] relative z-40 border-t border-black/5 dark:border-white/5 overflow-visible"
            >

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
               <div className="flex max-w-full min-w-0 flex-wrap overflow-visible custom-scrollbar items-center justify-center gap-1.5 bg-[#F9F9F9] dark:bg-[#2A2A35] px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm shrink-0">
                 <div className="flex gap-1">
                    <button onClick={() => changeScannerZoom(z => Math.max(0.2, z - 0.1))} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors"><ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
                   <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded h-7">
                     <span className="text-[12px] font-mono text-gray-600 dark:text-gray-300 w-10 text-center select-none">{Math.round(scannerZoom * 100)}%</span>
                     <div className="flex flex-col justify-center items-center h-full -space-y-1">
                       <button
                          onClick={() => changeScannerZoom(z => Math.min(4.0, z + 0.05))}
                         className="hover:bg-black/10 dark:hover:bg-white/10 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                         title="Increase Zoom (+5%)"
                       >
                         <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                       </button>
                       <button
                          onClick={() => changeScannerZoom(z => Math.max(0.2, z - 0.05))}
                         className="hover:bg-black/10 dark:hover:bg-white/10 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                         title="Decrease Zoom (-5%)"
                       >
                         <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                       </button>
                     </div>
                   </div>
                    <button onClick={() => changeScannerZoom(z => Math.min(4.0, z + 0.1))} className="hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-md transition-colors"><ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300"/></button>
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
                    data-scanner-primary-action
                    onClick={() => {
                      if (isOcrLoading) {
                        onStopScan?.();
                      } else if (isTextReady) {
                        handleSendToPath();
                      } else {
                        triggerScan();
                      }
                    }}
                    disabled={scannerRunState === 'stopping' || (!isOcrLoading && ((isTextReady && !selectedDestinationFolder) || (!isTextReady && !canScan)))}
                    title={isOcrLoading ? "Stop scan" : isTextReady ? "Send extracted text" : canScan ? "Scan" : "No document or clips available"}
                    className={`relative px-[24px] py-1.5 rounded-md text-[13px] font-medium transition-all duration-500 ease-out disabled:opacity-50 flex items-center justify-center min-w-[80px] shadow-sm ${
                      isOcrLoading
                        ? "bg-[#E81123] hover:bg-[#C8102E] dark:bg-[#E81123] dark:hover:bg-[#C8102E] text-white shadow-md"
                        : isTextReady
                          ? selectedDestinationFolder
                            ? "bg-[#0a84ff] hover:bg-[#0070e0] dark:bg-[#0a84ff] dark:hover:bg-[#0070e0] text-white shadow-md scale-105"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                          : "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-[0.97]"
                    }`}
                 >
                   {!isTextReady && cropQueue.length > 0 && (
                     <span className={`absolute -top-1.5 -right-1.5 text-[10px] w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-md font-bold z-50 transition-opacity ${
                       isOcrLoading
                         ? "bg-neutral-600 dark:bg-neutral-300 text-white dark:text-neutral-900"
                         : "bg-red-500 dark:bg-red-500 text-white"
                     }`}>
                       {cropQueue.length}
                     </span>
                   )}
                   {isOcrLoading ? (
                     <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                       <Hand className="w-[18px] h-[18px] shrink-0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                       <span>{scannerRunState === 'stopping' ? "Stopping" : "Stop"}</span>
                     </div>
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

                    <input                       type="text"
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
