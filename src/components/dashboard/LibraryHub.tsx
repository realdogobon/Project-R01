import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  FolderOpen,
  Star,
  Trash2,
  FileText,
  Save,
  RotateCcw,
  ChevronRight,
  Keyboard,
  Trash,
  CheckCircle,
  Folder,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useResizable } from "../../hooks/useResizable";
import { SmoothInput, SmoothTextarea } from "../ui/SmoothInputs";
import {
  ScanDocument,
  getAllScans,
  deleteScan,
  updateDocument,
  restoreScan,
  syncRagIndex
} from "../../lib/rag-search";

interface LibraryHubProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadIntoTypewriter: (content: string) => void;
  onLoadIntoPractice: (content: string) => void;
  onLoadIntoExam?: (content: string, title: string) => void;
  userName?: string;
  themeAccentColor?: string;
}

interface CustomFolder {
  id: string;
  name: string;
}

export const LibraryHub: React.FC<LibraryHubProps> = ({
  isOpen,
  onClose,
  onLoadIntoTypewriter,
  onLoadIntoPractice,
  userName = "User",
  themeAccentColor = "#C28181"
}) => {

  const [scans, setScans] = useState<ScanDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);


  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const [undoDeleteTarget, setUndoDeleteTarget] = useState<ScanDocument | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(6);
  const undoTimeoutRef = useRef<any>(null);
  const undoIntervalRef = useRef<any>(null);


  const [trashScans, setTrashScans] = useState<ScanDocument[]>(() => {
    try {
      const stored = localStorage.getItem("ais_library_trash_scans");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });


  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("ais_library_starred_scans");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });


  const [customFolders, setCustomFolders] = useState<CustomFolder[]>(() => {
    try {
      const stored = localStorage.getItem("ais_library_folders");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [docFolders, setDocFolders] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("ais_library_doc_folders");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("ais_library_custom_order");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { width, height, x, y, startResize } = useResizable({
    persistKey: 'library_v2',
    initialWidth: 840,
    initialHeight: 610
  });

  const activeAccent = themeAccentColor || "#C28181";


  useEffect(() => {
    if (isOpen) {
      const fetchScans = async () => {
        await syncRagIndex();
        setScans(getAllScans());
      };
      fetchScans();
    }
  }, [isOpen]);


  useEffect(() => {
    localStorage.setItem("ais_library_trash_scans", JSON.stringify(trashScans));
  }, [trashScans]);

  useEffect(() => {
    localStorage.setItem("ais_library_starred_scans", JSON.stringify(starredIds));
  }, [starredIds]);

  useEffect(() => {
    localStorage.setItem("ais_library_folders", JSON.stringify(customFolders));
  }, [customFolders]);

  useEffect(() => {
    localStorage.setItem("ais_library_doc_folders", JSON.stringify(docFolders));
  }, [docFolders]);

  useEffect(() => {
    localStorage.setItem("ais_library_custom_order", JSON.stringify(customOrder));
  }, [customOrder]);


  const selectedDoc = useMemo(() => {
    if (selectedCategory === "trash") {
      return trashScans.find(d => d.id === selectedDocId) || null;
    }
    return scans.find(d => d.id === selectedDocId) || null;
  }, [selectedDocId, scans, trashScans, selectedCategory]);

  useEffect(() => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title);
      setEditContent(selectedDoc.content);
      setHasUnsavedChanges(false);
    } else {
      setEditTitle("");
      setEditContent("");
      setHasUnsavedChanges(false);
    }
  }, [selectedDoc]);


  const getWordCount = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };


  const telemetry = useMemo(() => {
    const totalFiles = scans.length;
    return {
      totalFiles,
      starredCount: starredIds.filter(id => scans.some(s => s.id === id)).length,
      trashCount: trashScans.length
    };
  }, [scans, starredIds, trashScans]);


  const filteredDocs = useMemo(() => {
    let result: ScanDocument[] = [];

    if (selectedCategory === "all") {
      result = scans.filter(s => !trashScans.some(t => t.id === s.id));
    } else if (selectedCategory === "starred") {
      result = scans.filter(s => starredIds.includes(s.id) && !trashScans.some(t => t.id === s.id));
    } else if (selectedCategory === "trash") {
      result = trashScans;
    } else {

      result = scans.filter(s => docFolders[s.id] === selectedCategory && !trashScans.some(t => t.id === s.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query)
      );
    }


    result.sort((a, b) => {
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return result;
  }, [scans, selectedCategory, trashScans, starredIds, searchQuery, docFolders, customOrder]);


  useEffect(() => {
    if (filteredDocs.length > 0) {
      if (!selectedDocId || !filteredDocs.some(d => d.id === selectedDocId)) {
        setSelectedDocId(filteredDocs[0].id);
      }
    } else {
      setSelectedDocId(null);
    }
  }, [filteredDocs, selectedCategory]);


  const clearUndoTimer = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (undoIntervalRef.current) {
      clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearUndoTimer();
  }, []);


  const handleSaveEdit = async () => {
    if (!selectedDocId || !editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    try {
      if (selectedCategory === "trash") {

        setTrashScans(prev => prev.map(item =>
          item.id === selectedDocId
            ? { ...item, title: editTitle, content: editContent }
            : item
        ));
      } else {

        await updateDocument(selectedDocId, editTitle, editContent);
        setScans(getAllScans());
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
    } finally {
      setIsSaving(false);
    }
  };


  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };


  const handleSoftDelete = async (docToDelete: ScanDocument) => {
    if (!docToDelete) return;


    clearUndoTimer();


    setUndoDeleteTarget(docToDelete);
    setShowUndoToast(true);
    setUndoCountdown(6);


    undoIntervalRef.current = setInterval(() => {
      setUndoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(undoIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);


    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoToast(false);
      setUndoDeleteTarget(null);
    }, 6000);


    if (!trashScans.some(d => d.id === docToDelete.id)) {
      setTrashScans(prev => [docToDelete, ...prev]);
    }


    setStarredIds(prev => prev.filter(id => id !== docToDelete.id));


    await deleteScan(docToDelete.id);


    setScans(getAllScans());

    if (selectedDocId === docToDelete.id) {
      setSelectedDocId(null);
    }
  };


  const triggerUndo = async () => {
    if (!undoDeleteTarget) return;

    const docToRestore = undoDeleteTarget;
    clearUndoTimer();
    setShowUndoToast(false);
    setUndoDeleteTarget(null);


    await restoreScan(docToRestore);


    setTrashScans(prev => prev.filter(d => d.id !== docToRestore.id));


    setScans(getAllScans());
    setSelectedDocId(docToRestore.id);
  };


  const handleRestore = async (docToRestore: ScanDocument) => {
    if (!docToRestore) return;

    await restoreScan(docToRestore);

    setTrashScans(prev => prev.filter(d => d.id !== docToRestore.id));
    setScans(getAllScans());
    setSelectedDocId(docToRestore.id);
  };


  const handlePermanentDelete = (id: string) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this document? This cannot be undone.");
    if (!confirmDelete) return;

    setTrashScans(prev => prev.filter(d => d.id !== id));
    if (selectedDocId === id) {
      setSelectedDocId(null);
    }
  };


  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnDoc = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;

    setCustomOrder(prev => {
      const order = [...prev];

      filteredDocs.forEach(d => {
        if (!order.includes(d.id)) order.push(d.id);
      });

      const fromIdx = order.indexOf(draggedId);
      const toIdx = order.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, draggedId);
      }
      return order;
    });
  };

  const handleDropOnCategory = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId) return;

    if (catId === "trash") {
      const doc = scans.find(s => s.id === draggedId);
      if (doc) handleSoftDelete(doc);
    } else if (catId === "starred") {
      if (!starredIds.includes(draggedId)) {
        setStarredIds(prev => [...prev, draggedId]);
      }
    } else if (catId === "all") {
      setDocFolders(prev => {
        const next = { ...prev };
        delete next[draggedId];
        return next;
      });
    } else {

      setDocFolders(prev => ({ ...prev, [draggedId]: catId }));
    }
  };

  const createNewFolder = () => {
    const name = window.prompt("Enter new folder name:");
    if (name && name.trim()) {
      const newFolder = { id: `folder_${Date.now()}`, name: name.trim() };
      setCustomFolders(prev => [...prev, newFolder]);
    }
  };


  const dispatchToTypewriter = () => {
    if (!selectedDoc) return;
    onLoadIntoTypewriter(selectedDoc.content);
    onClose();
  };

  const dispatchToPractice = () => {
    if (!selectedDoc) return;
    onLoadIntoPractice(selectedDoc.content);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 bg-black/25 dark:bg-black/40 backdrop-blur-[6px] animate-in fade-in duration-200 font-sans cursor-default"
          onDoubleClick={onClose}
        >


          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
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
              scale: 0.6,
              x: 100,
              y: 400,
              filter: "blur(12px)",
              transition: { duration: 0.3, ease: "easeIn" }
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            transition={{ duration: 0.25, type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: window.innerWidth < 640 ? 'fixed' : 'absolute' }}
          className="bg-[#FCF5F3] dark:bg-[#20202A] sm:rounded-[14px] shadow-2xl flex flex-col overflow-hidden border-none sm:border border-black/5 dark:border-white/5"
        >

          <div className="hidden sm:block">

            <div className="absolute top-0 left-0 w-full h-1 cursor-n-resize z-[160]" onMouseDown={(e) => startResize('n', e)} />
            <div className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize z-[160]" onMouseDown={(e) => startResize('s', e)} />
            <div className="absolute top-0 left-0 h-full w-1 cursor-w-resize z-[160]" onMouseDown={(e) => startResize('w', e)} />
            <div className="absolute top-0 right-0 h-full w-1 cursor-e-resize z-[160]" onMouseDown={(e) => startResize('e', e)} />


            <div className="absolute top-[38px] left-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
            <div className="absolute top-[38px] right-0 w-2 h-[calc(100%-46px)] cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />
            <div className="absolute bottom-0 left-[8px] w-[calc(100%-16px)] h-2 cursor-move z-[155]" onMouseDown={(e) => startResize('move', e)} />

            {/* Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-[170]" onMouseDown={(e) => startResize('nw', e)} />
            <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-[170]" onMouseDown={(e) => startResize('ne', e)} />
            <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-[170]" onMouseDown={(e) => startResize('sw', e)} />
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[170]" onMouseDown={(e) => startResize('se', e)} />
          </div>


          <div
            className="h-[38px] flex items-center justify-between pl-4 pr-0 shrink-0 select-none bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 cursor-move"
            onMouseDown={(e) => startResize('move', e)}
          >
             <div className="flex items-center gap-2.5 text-[#1E1E1E] dark:text-[#EAEAEA]">
               <FolderOpen className="w-4 h-4" />
               <span className="text-[12px] font-medium tracking-wide">Library</span>
             </div>
             <div className="flex items-center h-full">
               <button
                 onClick={onClose}
                 className="h-full px-4 hover:bg-[#E81123] hover:text-white text-[#1E1E1E] dark:text-[#EAEAEA] transition-colors"
               >
                 <X className="w-4 h-4"/>
               </button>
             </div>
          </div>

          {/* Dual Panel Body Layout (Ditto 1:1 style with Document Scanner) */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

            {/* Left Column Sidebar (Width: 310px) */}
            <div className="w-full lg:w-[310px] flex flex-col px-7 pb-6 overflow-y-auto shrink-0 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5">
              <h1 className="text-[26px] font-semibold text-[#1E1E1E] dark:text-[#FFFFFF] mt-3 mb-6 tracking-tight">Library</h1>

              {/* Categories Selector styled exactly like Color Mode selection in Scanner */}
              <div className="flex flex-col gap-3 mb-5 pl-0.5">
                <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA]">Collections</label>

                {[
                  { id: "all", label: "All Documents", badge: telemetry.totalFiles },
                  { id: "starred", label: "Starred Documents", badge: telemetry.starredCount },
                  ...customFolders.map(f => ({
                    id: f.id,
                    label: f.name,
                    badge: Object.values(docFolders).filter(id => id === f.id).length
                  })),
                  { id: "trash", label: "Trash Bin", badge: telemetry.trashCount }
                ].map(cat => {
                   const isActive = selectedCategory === cat.id;
                   return (
                     <label
                       key={cat.id}
                       className={`flex items-center justify-between cursor-pointer group p-1 -ml-1 rounded transition-colors ${isActive ? '' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                       onClick={() => {
                         setSelectedCategory(cat.id);
                         setSelectedDocId(null);
                       }}
                       onDragOver={(e) => {
                         e.preventDefault();
                         e.dataTransfer.dropEffect = "move";
                       }}
                       onDrop={(e) => handleDropOnCategory(e, cat.id)}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                           isActive
                             ? 'border-[#C28181] dark:border-[#60C5EA]'
                             : 'border-gray-300 dark:border-gray-500 group-hover:border-gray-400 dark:group-hover:border-gray-400'
                         }`}>
                           {isActive && (
                             <div className="w-[10px] h-[10px] rounded-full bg-[#C28181] dark:bg-[#60C5EA] animate-in zoom-in-75 duration-150" />
                           )}
                         </div>
                         <span className="text-[13px] text-[#1E1E1F] dark:text-[#EAEAEA]">{cat.label}</span>
                       </div>
                     </label>
                   );
                })}

                <button
                  onClick={createNewFolder}
                  className="flex items-center gap-2 mt-1 px-1 py-1 text-[13px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Folder</span>
                </button>
              </div>

              {/* Minimal Search Bar (Dropdown styled in scanner) */}
              <div className="flex flex-col gap-1.5 mb-5 mt-2">
                <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Search</label>
                <div className="relative">
                   <SmoothInput
                     type="text"
                     placeholder="Search title or text..."
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA]"
                   />
                   {searchQuery && (
                     <button
                       onClick={() => setSearchQuery("")}
                       className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-neutral-700 z-10"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                   )}
                </div>
              </div>

              {/* Scanned Notes Directory List under category selection */}
              <div className="flex flex-col gap-1.5 mt-3 flex-1 min-h-0">
                <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">
                  Documents
                </label>

                <div className={`flex-1 overflow-y-auto pr-1 space-y-2.5 ${filteredDocs.length > 0 ? 'custom-scrollbar' : 'no-scrollbar overflow-y-hidden'}`}>
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map(doc => {
                      const isSelected = selectedDocId === doc.id;
                      const isStarred = starredIds.includes(doc.id);
                      const words = getWordCount(doc.content);

                      return (
                        <div
                          key={doc.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, doc.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => handleDropOnDoc(e, doc.id)}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`p-3.5 rounded-md border cursor-pointer select-none transition-all duration-200 ${
                            isSelected
                              ? "bg-white dark:bg-[#2A2A35] border-[#C28181] dark:border-[#60C5EA] shadow-sm scale-[0.99]"
                              : "bg-white/40 dark:bg-[#1A1A23]/20 border-[#E5DCDA]/60 dark:border-[#1A1A23]/60 hover:border-gray-400 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-[#2A2A35]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] text-[#202020] dark:text-[#EAEAEA] truncate flex-1">
                              {doc.title}
                            </span>
                            {isStarred && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                            <span>{words} {words === 1 ? "word" : "words"}</span>
                            <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "Local"}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-gray-400 dark:text-zinc-600">
                      <Folder className="w-8 h-8 mx-auto mb-2 opacity-55" />
                      <span className="text-[12px] font-medium">Empty collection</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column Canvas Area (Flex-1) */}
            <div className="flex-1 bg-[#F9F9F9] dark:bg-[#1A1A22] rounded-tl-[10px] border-t border-l border-black/5 dark:border-white/5 relative flex flex-col items-center justify-between shadow-[-4px_-4px_16px_rgba(0,0,0,0.02)] overflow-hidden">

              {selectedDoc ? (
                <div className="flex-1 flex flex-col w-full p-6 pb-6 min-h-0">

                  {/* Title textbox field */}
                  <div className="flex flex-col gap-1.5 mb-4 shrink-0">
                    <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA] pl-0.5">Document Title</label>
                    <SmoothInput
                      type="text"
                      spellCheck={true}
                      value={editTitle}
                      onChange={e => {
                        setEditTitle(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA] !font-sans font-normal exclude-font-sync"
                      style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontWeight: 400, letterSpacing: '0', lineHeight: '1.2' }}
                    />
                  </div>

                  {/* Body Textarea field */}
                  <div className="flex-1 flex flex-col gap-1.5 min-h-0 mb-4">
                    <div className="flex items-center justify-between pl-0.5 shrink-0">
                      <label className="text-[13px] text-[#202020] dark:text-[#EAEAEA]">Content</label>
                      {hasUnsavedChanges && (
                        <span className="text-[11px] text-[#C28181] dark:text-[#60C5EA] font-bold animate-pulse">
                          Unsaved modifications
                        </span>
                      )}
                    </div>

                    <SmoothTextarea
                      spellCheck={true}
                      value={editContent}
                      onChange={e => {
                        setEditContent(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full flex-1 bg-white dark:bg-[#2A2A35] border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md px-3 py-1.5 text-[13px] text-[#202020] dark:text-[#EAEAEA] outline-none shadow-sm focus:border-[#C28181] dark:focus:border-[#60C5EA] resize-none custom-scrollbar select-text !font-sans font-normal exclude-font-sync"
                      style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', fontWeight: 400, letterSpacing: '0', lineHeight: '1.2' }}
                    />
                  </div>

                  {/* Bottom Action Footer Controls matching Document Scanner style */}
                  <div className="h-14 shrink-0 flex items-center justify-between border-t border-[#E5DCDA]/40 dark:border-[#1A1A23]/40 pt-4 mt-auto">

                    {/* Left operations: Star toggle & Soft Delete */}
                    <div className="flex items-center gap-2">
                      {selectedCategory !== "trash" && (
                        <button
                          onClick={e => toggleStar(selectedDoc.id, e)}
                          className={`p-2 rounded-md transition-colors border ${
                            starredIds.includes(selectedDoc.id)
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-500"
                              : "border-[#E5DCDA] dark:border-[#1A1A23] hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400"
                          }`}
                          title={starredIds.includes(selectedDoc.id) ? "Unstar document" : "Star document"}
                        >
                          <Star className={`w-4 h-4 ${starredIds.includes(selectedDoc.id) ? "fill-current" : ""}`} />
                        </button>
                      )}

                      {selectedCategory === "trash" ? (
                        <>
                          <button
                            onClick={() => handleRestore(selectedDoc)}
                            className="px-3 py-1.5 border border-[#E5DCDA] dark:border-[#1A1A23] hover:bg-black/5 dark:hover:bg-white/10 text-[13px] text-[#202020] dark:text-[#EAEAEA] rounded-md transition-colors flex items-center gap-1 font-medium"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          <button
                            onClick={() => handlePermanentDelete(selectedDoc.id)}
                            className="p-2 border border-red-200 dark:border-red-950/30 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleSoftDelete(selectedDoc)}
                          className="p-2 border border-[#E5DCDA] dark:border-[#1A1A23] rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
                          title="Move to Trash Bin"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Right actions: Save Changes, Start Practice, Open in Editor */}
                    <div className="flex items-center gap-3">
                      {hasUnsavedChanges && (
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="px-4 py-1.5 border border-[#E5DCDA] dark:border-[#1A1A23] hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 text-[#202020] dark:text-[#EAEAEA] text-[13px] font-medium rounded-md transition-colors flex items-center gap-1"
                        >
                          {isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save</span>
                        </button>
                      )}

                      {selectedCategory !== "trash" && (
                        <>
                          <button
                            onClick={dispatchToPractice}
                            className="px-4 py-1.5 border border-[#E5DCDA] dark:border-[#1A1A23] hover:bg-black/5 dark:hover:bg-white/10 text-[#202020] dark:text-[#EAEAEA] rounded-md text-[13px] font-medium transition-colors"
                          >
                            Start Practice
                          </button>

                          <button
                            onClick={dispatchToTypewriter}
                            className="bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-[0.97] px-[24px] py-1.5 rounded-md text-[13px] font-medium transition-all duration-300 shadow-sm active:scale-95 border border-transparent"
                          >
                            Open in Editor
                          </button>
                        </>
                      )}
                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
                  <FolderOpen className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" strokeWidth={1.25} />
                  <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-base mb-1 tracking-tight">No document selected</h3>
                  <p className="text-gray-400 dark:text-gray-500 text-[12px] max-w-xs leading-relaxed">
                    Select a document from the left directory column to preview, correct text errors, or send to writing modes.
                  </p>
                </div>
              )}

            </div>

            {/* Float Soft Delete Undo Ticker/Alert Pill */}
            <AnimatePresence>
              {showUndoToast && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E1E24]/95 dark:bg-[#111116]/95 text-white border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-full px-5 py-2.5 flex items-center gap-4 text-xs select-none backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Moved Note to Trash Bin ({undoCountdown}s)</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <button
                    onClick={triggerUndo}
                    className="text-[#60C5EA] hover:text-[#50b5da] font-bold uppercase tracking-wider text-[11px] outline-none active:scale-95 duration-100"
                  >
                    Undo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
