"use client";

import React, { useState, useEffect, useMemo, useRef, forwardRef, useCallback } from "react";
import { useTheme } from "next-themes";
import {

  createEditorSystem,


  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension,
  horizontalRuleExtension,
  TableExtension,
  listExtension,
  historyExtension,
  imageExtension,
  blockFormatExtension,
  htmlExtension,
  MarkdownExtension,
  codeExtension,
  codeFormatExtension,
  HTMLEmbedExtension,
  floatingToolbarExtension,
  contextMenuExtension,
  commandPaletteExtension,
  DraggableBlockExtension,


  ALL_MARKDOWN_TRANSFORMERS,


  type ExtractCommands,
  type ExtractStateQueries,
  type BaseCommands,
  RichText,
} from "@lexkit/editor";
import { LexicalEditor, $getRoot, $createParagraphNode, $getSelection, $isRangeSelection, $isNodeSelection, $setSelection, $createNodeSelection, $createRangeSelection, $isTextNode } from "lexical";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Undo, Redo, Sun, Moon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Upload, Link, Unlink, Minus, Code, Terminal, Table as TableIcon, FileCode, Eye, Pencil, Command, Type, Quote, Indent, Outdent } from "lucide-react";
import { Select, Dropdown, Dialog } from "./components";
import { SmoothInput } from "../ui/SmoothInputs";
import {
  commandsToCommandPaletteItems,
  registerKeyboardShortcuts,
} from "./commands";
import { CommandPalette } from "./CommandPalette";
import { createPortal } from "react-dom";
import { defaultTheme } from "./theme";
import "./styles.css";

type TableConfig = {
  rows?: number;
  columns?: number;
  includeHeaders?: boolean;
};


const markdownExt = new MarkdownExtension().configure({
  customTransformers: ALL_MARKDOWN_TRANSFORMERS,
});


export const extensions = [
  boldExtension,
  italicExtension,
  underlineExtension,
  strikethroughExtension,
  linkExtension.configure({
    linkSelectedTextOnPaste: true,
    autoLinkText: true,
    autoLinkUrls: true,
  }),
  horizontalRuleExtension,
  new TableExtension().configure({
    enableContextMenu: true,
    markdownExtension: markdownExt,
  }),
  listExtension,
  historyExtension,
  imageExtension,
  blockFormatExtension,
  htmlExtension,
  markdownExt,
  codeExtension,
  codeFormatExtension,
  new HTMLEmbedExtension().configure({
    markdownExtension: markdownExt,
  }),
  floatingToolbarExtension,
  contextMenuExtension,
  commandPaletteExtension,
  new DraggableBlockExtension().configure({ offsetLeft: -24 }),
] as const;


const { Provider, useEditor } = createEditorSystem<typeof extensions>();


type EditorCommands = BaseCommands & ExtractCommands<typeof extensions>;
type EditorStateQueries = ExtractStateQueries<typeof extensions>;
type ExtensionNames = (typeof extensions)[number]["name"];


export interface DefaultTemplateRef {
  injectMarkdown: (content: string) => void;
  injectHTML: (content: string) => void;
  getMarkdown: () => string;
  getHTML: () => string;
  getText: () => string;
  getSelection: () => { start: number; end: number } | null;
  setSelection: (range: { start: number; end: number }) => void;
  setReadOnly: (readOnly: boolean) => void;
  focus: () => void;
}


function useImageHandlers(commands: EditorCommands, editor: LexicalEditor | null, onInsertFromUrl?: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlers = useMemo(
    () => ({
      insertFromUrl: () => {
        if (onInsertFromUrl) {
          onInsertFromUrl();
        }
      },
      insertFromFile: () => fileInputRef.current?.click(),
      handleUpload: async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        let src: string;
        if (imageExtension.config.uploadHandler) {
          try {
            src = await imageExtension.config.uploadHandler(file);
          } catch (error) {
            alert("Failed to upload image");
            return;
          }
        } else {
          src = URL.createObjectURL(file);
        }
        commands.insertImage({ src, alt: file.name, file });
        e.target.value = "";
      },
      setAlignment: (alignment: "left" | "center" | "right" | "none") => {
        commands.setImageAlignment(alignment);
      },
      setCaption: () => {
        const newCaption = prompt("Enter caption:") || "";
        commands.setImageCaption(newCaption);
      },
    }),
    [commands],
  );

  return { handlers, fileInputRef };
}


function FloatingToolbarRenderer({ setShowLinkDialog, onEditCaption }: { setShowLinkDialog: (show: boolean) => void; onEditCaption: () => void }) {
  const { commands, activeStates, extensions, hasExtension, lexical: editor } = useEditor();

  const [isVisible, setIsVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number } | null>(null);

  const floatingExtension = extensions.find((ext) => ext.name === "floatingToolbar") as any;

  useEffect(() => {
    if (!floatingExtension) return;

    const checkState = () => {
      const visible = floatingExtension.getIsVisible();
      setIsVisible(visible);

      if (visible) {

        if (activeStates.imageSelected) {
          let imageRect: DOMRect | null = null;
          editor?.getEditorState().read(() => {
            const sel = $getSelection();
            if ($isNodeSelection(sel)) {
              const nodes = sel.getNodes();
              if (nodes.length > 0) {
                const domEl = editor.getElementByKey(nodes[0].getKey());
                if (domEl) {
                  const fig = domEl.querySelector("figure") || domEl;
                  imageRect = fig.getBoundingClientRect();
                }
              }
            }
          });

          if (imageRect) {
            const toolbarWidth = 180;
            const toolbarHeight = 44;
            const selectionCenter = imageRect.left + imageRect.width / 2;
            let left = selectionCenter - toolbarWidth / 2;
            let top = imageRect.top - toolbarHeight - 10;

            const padding = 16;
            if (left < padding) left = padding;
            if (left + toolbarWidth > window.innerWidth - padding) {
              left = window.innerWidth - toolbarWidth - padding;
            }
            if (top < padding) {
              top = imageRect.bottom + 10;
            }

            setSelectionRect({ x: left, y: top });
            return;
          }
        }


        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {

            const toolbarWidth = 460;
            const toolbarHeight = 44;


            const selectionCenter = rect.left + rect.width / 2;


            let left = selectionCenter - toolbarWidth / 2;


            const padding = 16;
            if (left < padding) {
              left = padding;
            } else if (left + toolbarWidth > window.innerWidth - padding) {
              left = window.innerWidth - toolbarWidth - padding;
            }


            let top = rect.top - toolbarHeight - 10;
            if (top < padding) {
              top = rect.bottom + 10;
            }

            setSelectionRect({ x: left, y: top });
            return;
          }
        }
      }
      setSelectionRect(null);
    };

    const interval = setInterval(checkState, 150);
    document.addEventListener("selectionchange", checkState);
    window.addEventListener("resize", checkState);

    const editable = document.querySelector(".lexkit-content-editable");
    if (editable) {
      editable.addEventListener("scroll", checkState);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener("selectionchange", checkState);
      window.removeEventListener("resize", checkState);
      if (editable) {
        editable.removeEventListener("scroll", checkState);
      }
    };
  }, [floatingExtension, editor, activeStates.imageSelected]);

  if (!isVisible || !selectionRect) return null;

  const isImageSelected = activeStates.imageSelected;

  return createPortal(
    <div
      className="lexkit-floating-toolbar"
      style={{
        position: "fixed",
        top: selectionRect.y,
        left: selectionRect.x,
        zIndex: 9999,
        width: "max-content",
        maxWidth: "fit-content",
        flexWrap: "nowrap",
        pointerEvents: "auto",
        transform: "none",
      }}
    >
      {isImageSelected ? (
        <>
          <button onClick={() => commands.setImageAlignment("left")} className={`lexkit-toolbar-button ${activeStates.isImageAlignedLeft ? "active" : ""}`} title="Align Left">
            <AlignLeft size={14} />
          </button>
          <button onClick={() => commands.setImageAlignment("center")} className={`lexkit-toolbar-button ${activeStates.isImageAlignedCenter ? "active" : ""}`} title="Align Center">
            <AlignCenter size={14} />
          </button>
          <button onClick={() => commands.setImageAlignment("right")} className={`lexkit-toolbar-button ${activeStates.isImageAlignedRight ? "active" : ""}`} title="Align Right">
            <AlignRight size={14} />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={onEditCaption} className="lexkit-toolbar-button" title="Edit Caption">
            <Type size={14} />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => commands.toggleBold()} className={`lexkit-toolbar-button ${activeStates.bold ? "active" : ""}`} title="Bold">
            <Bold size={14} />
          </button>
          <button onClick={() => commands.toggleItalic()} className={`lexkit-toolbar-button ${activeStates.italic ? "active" : ""}`} title="Italic">
            <Italic size={14} />
          </button>
          <button onClick={() => commands.toggleUnderline()} className={`lexkit-toolbar-button ${activeStates.underline ? "active" : ""}`} title="Underline">
            <Underline size={14} />
          </button>
          <button onClick={() => commands.toggleStrikethrough()} className={`lexkit-toolbar-button ${activeStates.strikethrough ? "active" : ""}`} title="Strikethrough">
            <Strikethrough size={14} />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => commands.formatText("code")} className={`lexkit-toolbar-button ${activeStates.code ? "active" : ""}`} title="Inline Code">
            <Code size={14} />
          </button>
          <button onClick={() => activeStates.isLink ? commands.removeLink() : setShowLinkDialog(true)} className={`lexkit-toolbar-button ${activeStates.isLink ? "active" : ""}`} title={activeStates.isLink ? "Remove Link" : "Insert Link"}>
            {activeStates.isLink ? <Unlink size={14} /> : <Link size={14} />}
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          {hasExtension("blockFormat") && (
            <>
              <button onClick={() => commands.toggleParagraph()} className={`lexkit-toolbar-button ${!activeStates.isH1 && !activeStates.isH2 && !activeStates.isH3 && !activeStates.isH4 && !activeStates.isH5 && !activeStates.isH6 && !activeStates.isQuote ? "active" : ""}`} title="Paragraph">
                P
              </button>
              <button onClick={() => commands.toggleHeading("h1")} className={`lexkit-toolbar-button ${activeStates.isH1 ? "active" : ""}`} title="Heading 1">
                H1
              </button>
              <button onClick={() => commands.toggleHeading("h2")} className={`lexkit-toolbar-button ${activeStates.isH2 ? "active" : ""}`} title="Heading 2">
                H2
              </button>
              <button onClick={() => commands.toggleHeading("h3")} className={`lexkit-toolbar-button ${activeStates.isH3 ? "active" : ""}`} title="Heading 3">
                H3
              </button>
              <button onClick={() => commands.toggleQuote()} className={`lexkit-toolbar-button ${activeStates.isQuote ? "active" : ""}`} title="Quote">
                <Quote size={14} />
              </button>
              {hasExtension("code") && (
                <button onClick={() => commands.toggleCodeBlock()} className={`lexkit-toolbar-button ${activeStates.isInCodeBlock ? "active" : ""}`} title="Code Block">
                  <Terminal size={14} />
                </button>
              )}
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          {hasExtension("list") && (
            <>
              <button onClick={() => commands.toggleUnorderedList()} className={`lexkit-toolbar-button ${activeStates.unorderedList ? "active" : ""}`} title="Bullet List">
                <List size={14} />
              </button>
              <button onClick={() => commands.toggleOrderedList()} className={`lexkit-toolbar-button ${activeStates.orderedList ? "active" : ""}`} title="Numbered List">
                <ListOrdered size={14} />
              </button>
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}


function Toolbar({
  commands,
  hasExtension,
  activeStates,
  isDark,
  toggleTheme,
  onCommandPaletteOpen,
  leftAddon,
  rightAddon,
  showLinkDialog,
  setShowLinkDialog,
  linkUrl,
  setLinkUrl,
  onEditCaption,
}: {
  commands: EditorCommands;
  hasExtension: (name: ExtensionNames) => boolean;
  activeStates: EditorStateQueries;
  isDark: boolean;
  toggleTheme: () => void;
  onCommandPaletteOpen: () => void;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  showLinkDialog: boolean;
  setShowLinkDialog: (show: boolean) => void;
  linkUrl: string;
  setLinkUrl: (url: string) => void;
  onEditCaption: () => void;
}) {
  const { lexical: editor } = useEditor();
  const [showImageUrlDialog, setShowImageUrlDialog] = useState(false);
  const { handlers, fileInputRef } = useImageHandlers(commands, editor, () => setShowImageUrlDialog(true));
  const [showImageDropdown, setShowImageDropdown] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const [tableConfig, setTableConfig] = useState<TableConfig>({
    rows: 3,
    columns: 3,
    includeHeaders: false,
  });

  const blockFormatOptions = [
    { value: "p", label: "Paragraph" },
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "h4", label: "Heading 4" },
    { value: "h5", label: "Heading 5" },
    { value: "h6", label: "Heading 6" },
    { value: "quote", label: "Quote" },
  ];

  const currentBlockFormat =
    activeStates.isH1 ? "h1" :
    activeStates.isH2 ? "h2" :
    activeStates.isH3 ? "h3" :
    activeStates.isH4 ? "h4" :
    activeStates.isH5 ? "h5" :
    activeStates.isH6 ? "h6" :
    activeStates.isQuote ? "quote" :
    "p";

  const handleBlockFormatChange = (value: string) => {
    if (value === "p") commands.toggleParagraph();
    else if (value.startsWith("h")) commands.toggleHeading(value as "h1" | "h2" | "h3" | "h4" | "h5" | "h6");
    else if (value === "quote") commands.toggleQuote();
  };

  return (
    <>
      <div className="lexkit-toolbar flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap py-0.5">
          {leftAddon && <div className="lexkit-toolbar-section mr-2 shrink-0">{leftAddon}</div>}

          {/* Text Formatting */}
          <div className="lexkit-toolbar-section shrink-0">
            <button onClick={() => commands.toggleBold()} className={`lexkit-toolbar-button ${activeStates.bold ? "active" : ""}`} title="Bold (Ctrl+B)"><Bold size={16} /></button>
            <button onClick={() => commands.toggleItalic()} className={`lexkit-toolbar-button ${activeStates.italic ? "active" : ""}`} title="Italic (Ctrl+I)"><Italic size={16} /></button>
            <button onClick={() => commands.toggleUnderline()} className={`lexkit-toolbar-button ${activeStates.underline ? "active" : ""}`} title="Underline (Ctrl+U)"><Underline size={16} /></button>
            <button onClick={() => commands.toggleStrikethrough()} className={`lexkit-toolbar-button ${activeStates.strikethrough ? "active" : ""}`} title="Strikethrough"><Strikethrough size={16} /></button>
            <button onClick={() => commands.formatText("code")} className={`lexkit-toolbar-button ${activeStates.code ? "active" : ""}`} title="Inline Code"><Code size={16} /></button>
            <button onClick={() => activeStates.isLink ? commands.removeLink() : setShowLinkDialog(true)} className={`lexkit-toolbar-button ${activeStates.isLink ? "active" : ""}`} title={activeStates.isLink ? "Remove Link" : "Insert Link"}>
              {activeStates.isLink ? <Unlink size={16} /> : <Link size={16} />}
            </button>
          </div>

          {/* Block Format */}
          {hasExtension("blockFormat") && (
            <div className="lexkit-toolbar-section shrink-0">
              <Select value={currentBlockFormat} onValueChange={handleBlockFormatChange} options={blockFormatOptions} placeholder="Format" />
              {hasExtension("code") && (
                <button onClick={() => commands.toggleCodeBlock()} className={`lexkit-toolbar-button ${activeStates.isInCodeBlock ? "active" : ""}`} title="Code Block"><Terminal size={16} /></button>
              )}
            </div>
          )}

          {/* Lists */}
          {hasExtension("list") && (
            <div className="lexkit-toolbar-section shrink-0">
              <button onClick={() => commands.toggleUnorderedList()} className={`lexkit-toolbar-button ${activeStates.unorderedList ? "active" : ""}`} title="Bullet List"><List size={16} /></button>
              <button onClick={() => commands.toggleOrderedList()} className={`lexkit-toolbar-button ${activeStates.orderedList ? "active" : ""}`} title="Numbered List"><ListOrdered size={16} /></button>
              {(activeStates.unorderedList || activeStates.orderedList) && (
                <>
                  <button onClick={() => commands.indentList()} className="lexkit-toolbar-button" title="Indent List"><Indent size={14} /></button>
                  <button onClick={() => commands.outdentList()} className="lexkit-toolbar-button" title="Outdent List"><Outdent size={14} /></button>
                </>
              )}
            </div>
          )}

          {/* Horizontal Rule */}
          {hasExtension("horizontalRule") && (
            <div className="lexkit-toolbar-section shrink-0">
              <button onClick={() => commands.insertHorizontalRule()} className="lexkit-toolbar-button" title="Insert Horizontal Rule"><Minus size={16} /></button>
            </div>
          )}


          {hasExtension("table") && (
            <div className="lexkit-toolbar-section shrink-0">
              <button onClick={() => setShowTableDialog(true)} className="lexkit-toolbar-button" title="Insert Table (Ctrl+Shift+T)"><TableIcon size={16} /></button>
            </div>
          )}

          {/* Image */}
          {hasExtension("image") && (
            <div className="lexkit-toolbar-section shrink-0">
              <Dropdown
                trigger={<button className={`lexkit-toolbar-button ${activeStates.imageSelected ? "active" : ""}`} title="Insert Image"><ImageIcon size={16} /></button>}
                isOpen={showImageDropdown}
                onOpenChange={setShowImageDropdown}
              >
                <button className="lexkit-dropdown-item" onClick={() => { handlers.insertFromUrl(); setShowImageDropdown(false); }}><Link size={16} /> From URL</button>
                <button className="lexkit-dropdown-item" onClick={() => { handlers.insertFromFile(); setShowImageDropdown(false); }}><Upload size={16} /> Upload File</button>
              </Dropdown>
              {activeStates.imageSelected && (
                <Dropdown
                  trigger={<button className="lexkit-toolbar-button" title="Align Image"><AlignCenter size={16} /></button>}
                  isOpen={showAlignDropdown}
                  onOpenChange={setShowAlignDropdown}
                >
                  <button className="lexkit-dropdown-item" onClick={() => { handlers.setAlignment("left"); setShowAlignDropdown(false); }}><AlignLeft size={16} /> Align Left</button>
                  <button className="lexkit-dropdown-item" onClick={() => { handlers.setAlignment("center"); setShowAlignDropdown(false); }}><AlignCenter size={16} /> Align Center</button>
                  <button className="lexkit-dropdown-item" onClick={() => { handlers.setAlignment("right"); setShowAlignDropdown(false); }}><AlignRight size={16} /> Align Right</button>
                  <button className="lexkit-dropdown-item" onClick={() => { onEditCaption(); setShowAlignDropdown(false); }}><Type size={16} /> Set Caption</button>
                </Dropdown>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlers.handleUpload} className="lexkit-file-input" />
            </div>
          )}

          {/* HTML Embed */}
          {hasExtension("htmlEmbed") && (
            <div className="lexkit-toolbar-section shrink-0">
              <button onClick={() => commands.insertHTMLEmbed()} className={`lexkit-toolbar-button ${activeStates.isHTMLEmbedSelected ? "active" : ""}`} title="Insert HTML Embed"><FileCode size={16} /></button>
              {activeStates.isHTMLEmbedSelected && (
                <button onClick={() => commands.toggleHTMLPreview()} className="lexkit-toolbar-button" title="Toggle Preview/Edit">
                  {activeStates.isHTMLPreviewMode ? <Eye size={16} /> : <Pencil size={16} />}
                </button>
              )}
            </div>
          )}

          {/* History */}
          {hasExtension("history") && (
            <div className="lexkit-toolbar-section shrink-0">
              <button onClick={() => commands.undo()} disabled={!activeStates.canUndo} className="lexkit-toolbar-button" title="Undo (Ctrl+Z)"><Undo size={16} /></button>
              <button onClick={() => commands.redo()} disabled={!activeStates.canRedo} className="lexkit-toolbar-button" title="Redo (Ctrl+Y)"><Redo size={16} /></button>
            </div>
          )}

        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2 ml-auto border-l border-black/5 dark:border-white/5 lexkit-right-addon">
          <div className="lexkit-toolbar-section m-0">
            <button onClick={onCommandPaletteOpen} className="lexkit-toolbar-button" title="Command Palette (Ctrl+K)"><Command size={16} /></button>
          </div>
          {rightAddon}
        </div>
      </div>

      {/* Table Dialog */}
      <Dialog isOpen={showTableDialog} onClose={() => setShowTableDialog(false)} title="Insert Table">
        <div className="lexkit-table-dialog">
          <div className="lexkit-form-group">
            <label htmlFor="table-rows">Rows:</label>
            <SmoothInput id="table-rows" type="number" min="1" max="20" value={tableConfig.rows} onChange={(e) => setTableConfig((prev) => ({ ...prev, rows: parseInt(e.target.value) || 1 }))} className="lexkit-input" />
          </div>
          <div className="lexkit-form-group">
            <label htmlFor="table-columns">Columns:</label>
            <SmoothInput id="table-columns" type="number" min="1" max="20" value={tableConfig.columns} onChange={(e) => setTableConfig((prev) => ({ ...prev, columns: parseInt(e.target.value) || 1 }))} className="lexkit-input" />
          </div>
          <div className="lexkit-form-group">
            <label className="lexkit-checkbox-label">
              <input type="checkbox" checked={tableConfig.includeHeaders || false} onChange={(e) => setTableConfig((prev) => ({ ...prev, includeHeaders: e.target.checked }))} className="lexkit-checkbox" />
              Include headers
            </label>
          </div>
          <div className="lexkit-dialog-actions">
            <button onClick={() => setShowTableDialog(false)} className="lexkit-button-secondary">Cancel</button>
            <button onClick={() => { commands.insertTable(tableConfig); setShowTableDialog(false); }} className="lexkit-button-primary">Insert Table</button>
          </div>
        </div>
      </Dialog>

      {/* Link Dialog */}
      <Dialog isOpen={showLinkDialog} onClose={() => setShowLinkDialog(false)} title="Insert Link">
        <div className="lexkit-table-dialog">
          <div className="lexkit-form-group">
            <label htmlFor="link-url">URL:</label>
            <SmoothInput id="link-url" type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="lexkit-input" autoFocus />
          </div>
          <div className="lexkit-dialog-actions">
            <button onClick={() => setShowLinkDialog(false)} className="lexkit-button-secondary">Cancel</button>
            <button onClick={() => { if (linkUrl) { commands.insertLink(linkUrl); } setShowLinkDialog(false); setLinkUrl(""); }} className="lexkit-button-primary">Insert Link</button>
          </div>
        </div>
      </Dialog>


      <Dialog isOpen={showImageUrlDialog} onClose={() => setShowImageUrlDialog(false)} title="Insert Image from URL">
        <div className="lexkit-table-dialog">
          <div className="lexkit-form-group">
            <label htmlFor="image-url">Image URL:</label>
            <SmoothInput id="image-url" type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="lexkit-input" autoFocus />
          </div>
          <div className="lexkit-form-group">
            <label htmlFor="image-alt">Alt Text (optional):</label>
            <SmoothInput id="image-alt" type="text" placeholder="Description..." value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className="lexkit-input" />
          </div>
          <div className="lexkit-dialog-actions">
            <button onClick={() => setShowImageUrlDialog(false)} className="lexkit-button-secondary">Cancel</button>
            <button onClick={() => { if (imageUrl) { commands.insertImage({ src: imageUrl, alt: imageAlt }); } setShowImageUrlDialog(false); setImageUrl(""); setImageAlt(""); }} className="lexkit-button-primary">Insert Image</button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// Editor Content Component
function EditorContent({
  className,
  isDark,
  toggleTheme,
  onReady,
  onChange,
  readOnly,
  examActive,
  toolbarLeftAddon,
  toolbarRightAddon,
}: {
  className?: string;
  isDark: boolean;
  toggleTheme: () => void;
  onReady?: (methods: DefaultTemplateRef) => void;
  onChange?: () => void;
  readOnly?: boolean;
  examActive?: boolean;
  toolbarLeftAddon?: React.ReactNode;
  toolbarRightAddon?: React.ReactNode;
}) {
  const alert = (message: string) => {
    try {
      window.alert(message);
    } catch (e) {
      console.warn("Alert blocked in sandbox iframe:", message);
    }
  };

  const prompt = (message: string, defaultValue = ""): string | null => {
    try {
      return window.prompt(message, defaultValue);
    } catch (e) {
      console.warn("Prompt blocked in sandbox iframe:", message);
      return defaultValue;
    }
  };

  const { commands, hasExtension, activeStates, lexical: editor } = useEditor();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showCaptionDialog, setShowCaptionDialog] = useState(false);
  const [tempCaption, setTempCaption] = useState("");

  const handleEditCaptionClick = () => {
    editor?.getEditorState().read(() => {
      const sel = $getSelection();
      if ($isNodeSelection(sel)) {
        const nodes = sel.getNodes();
        if (nodes.length > 0 && nodes[0].getType() === "image") {
          setTempCaption((nodes[0] as any).__caption || "");
        }
      }
    });
    setShowCaptionDialog(true);
  };
  const commandsRef = useRef<EditorCommands>(commands);
  const readyRef = useRef(false);

  // Custom Smooth Caret state and variables
  const containerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const [caretFocused, setCaretFocused] = useState(false);
  const [isCaretIdle, setIsCaretIdle] = useState(true);
  const caretIdleTimeoutRef = useRef<any>(null);

  // Physics-based Caret Ref
  const caretPhysicsRef = useRef({
    current: { x: 0, y: 0, h: 20 },
    target: { x: 0, y: 0, h: 20 },
    velocity: { x: 0, y: 0, h: 0 },
    lastUpdateTime: 0,
    isActive: false,
    isVisible: false
  });

  // Physics animation loop for "The Ultimate Caret"
  useEffect(() => {
    let animationFrame: number;

    const update = () => {
      const p = caretPhysicsRef.current;
      if (!p.isVisible && !p.isActive) {
        animationFrame = requestAnimationFrame(update);
        return;
      }

      // Spring constants for "Hot Knife Through Butter" feel
      const stiffness = 0.18; // Feel: How aggressive it snaps to target
      const damping = 0.72;   // Feel: How much weight/momentum it carries

      // Calculate forces
      const ax = (p.target.x - p.current.x) * stiffness;
      const ay = (p.target.y - p.current.y) * stiffness;
      const ah = (p.target.h - p.current.h) * stiffness;

      // Update velocity
      p.velocity.x = (p.velocity.x + ax) * damping;
      p.velocity.y = (p.velocity.y + ay) * damping;
      p.velocity.h = (p.velocity.h + ah) * damping;

      // Update current position
      p.current.x += p.velocity.x;
      p.current.y += p.velocity.y;
      p.current.h += p.velocity.h;

      // Check if we are close enough to "settle" and stop active processing for CPU efficiency
      const dist = Math.abs(p.target.x - p.current.x) + Math.abs(p.target.y - p.current.y);
      if (dist < 0.01 && Math.abs(p.velocity.x) < 0.01) {
        p.isActive = false;
      }

      // Apply to DOM
      if (caretRef.current) {
        // VELOCITY STRETCHING: Scale the width slightly based on horizontal movement speed
        const stretch = 1 + Math.min(Math.abs(p.velocity.x) * 0.08, 1.2);
        const rotation = p.velocity.x * 0.15; // Subtle lean into the direction of motion

        caretRef.current.style.transform = `translate3d(${p.current.x}px, ${p.current.y}px, 0) scaleX(${stretch}) rotate(${rotation}deg)`;
        caretRef.current.style.height = `${p.current.h}px`;
        caretRef.current.style.opacity = p.isVisible ? "1" : "0";
      }

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Custom Scrollbar States
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [scrollProgressX, setScrollProgressX] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [isDraggingScrollbarX, setIsDraggingScrollbarX] = useState(false);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollTrackXRef = useRef<HTMLDivElement>(null);

  const updateScrollStats = useCallback(() => {
    const editable = containerRef.current?.querySelector(".lexkit-content-editable") as HTMLElement;
    if (editable) {
      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = editable;

      // Vertical
      if (scrollHeight > clientHeight) {
        const progress = scrollTop / (scrollHeight - clientHeight);
        setScrollProgress(progress);
        const trackHeight = scrollTrackRef.current?.clientHeight || clientHeight;
        const h = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
        setThumbHeight(h);
      } else {
        setScrollProgress(0);
        setThumbHeight(0);
      }

      // Horizontal
      if (scrollWidth > clientWidth) {
        const progressX = scrollLeft / (scrollWidth - clientWidth);
        setScrollProgressX(progressX);
        const trackWidth = scrollTrackXRef.current?.clientWidth || clientWidth;
        const w = Math.max(30, (clientWidth / scrollWidth) * trackWidth);
        setThumbWidth(w);
      } else {
        setScrollProgressX(0);
        setThumbWidth(0);
      }
    }
  }, []);

  const updateCaretPosition = useCallback(() => {
    if (!containerRef.current) return;

    // Find contentEditable element
    const editableEl = containerRef.current.querySelector(".lexkit-content-editable") as HTMLElement;
    if (!editableEl) return;

    // Check focus state — also treat selection-inside-editor as focused,
    // because click fires before document.activeElement updates in some browsers.
    const activeEl = document.activeElement;
    const isDocFocused = document.hasFocus();
    const nativeFocus = !!(activeEl && (editableEl.contains(activeEl) || activeEl === editableEl) && isDocFocused);
    const selectionInsideEditor = (() => {
      try {
        const s = window.getSelection();
        if (!s || s.rangeCount === 0) return false;
        const r = s.getRangeAt(0);
        return editableEl === r.commonAncestorContainer || editableEl.contains(r.commonAncestorContainer);
      } catch { return false; }
    })();
    const hasFocus = nativeFocus || selectionInsideEditor;
    setCaretFocused(hasFocus);

    if (!caretRef.current) return;

    if (!hasFocus || activeStates.imageSelected) {
      caretRef.current.style.display = "none";
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      caretRef.current.style.display = "none";
      return;
    }

    const range = selection.getRangeAt(0);

    // Make sure selection is part of our editable wrapper
    if (!editableEl.contains(range.commonAncestorContainer)) {
      caretRef.current.style.display = "none";
      return;
    }

    // Get client rect of user's typing insertion point
    let rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    let left = 0;
    let top = 0;
    let height = 0;
    let fontSize = 16;

    // Handle collapsed range on extremely empty lines, fallback elegantly
    if (rect.left === 0 && rect.top === 0) {
      const node = selection.anchorNode;
      if (node) {
        let el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
        if (el) {
          const elRect = el.getBoundingClientRect();
          left = elRect.left - containerRect.left;
          top = elRect.top - containerRect.top;

          const style = window.getComputedStyle(el);
          const parsedLineHeight = parseFloat(style.lineHeight);
          fontSize = parseFloat(style.fontSize) || 16;
          height = isNaN(parsedLineHeight) ? fontSize * 1.2 : parsedLineHeight;
        }
      }
    } else {
      left = rect.left - containerRect.left;
      top = rect.top - containerRect.top;
      height = rect.height;

      // Extract font size of the active container text block to calculate proportional caret size
      const node = selection.anchorNode;
      if (node) {
        let el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
        if (el) {
          const style = window.getComputedStyle(el);
          fontSize = parseFloat(style.fontSize) || 16;
        }
      }
    }

    if (height <= 0 || height > 120) {
      height = 20; // Safe default height
    }

    /**
     * [WINDOWS NATIVE WPF MIGRATION NOTE: CARET PROPORTIONAL CENTERING ALGORITHM]
     * When porting to C# / WPF / DirectX, native line-height rendering will cause standard caret boxes
     * to span the full line height (leading to uncentered and overly tall cursors).
     * Solution: Calculate the target font's visual cap height (roughly 1.12 to 1.15 times the font size),
     * and center it vertically inside the larger line-height bounding rectangle.
     * Math formulas:
     *   visualHeightMap = fontSize * 1.12
     *   verticalOffset  = (renderedLineBoxHeight - visualHeightMap) / 2
     *   caretTop        = baseLineBoxTop + verticalOffset
     */
    const visualHeight = fontSize * 1.12;
    if (height > visualHeight) {
      const offsetY = (height - visualHeight) / 2;
      top = top + offsetY;
      height = visualHeight;
    }

    // Direct Physics Update
    const p = caretPhysicsRef.current;
    if (caretRef.current) {
      if (!hasFocus || !selection || selection.rangeCount === 0 || !editableEl.contains(range.commonAncestorContainer)) {
        p.isVisible = false;
        caretRef.current.style.display = "none";
        return;
      }

      // If this is the first jump or a long-distance jump, snap instantly, then glide
      const jumpDist = Math.abs(p.target.x - left) + Math.abs(p.target.y - top);
      if (!p.isVisible || jumpDist > 200) {
        p.current = { x: left, y: top, h: height };
        p.velocity = { x: 0, y: 0, h: 0 };
      }

      p.target = { x: left, y: top, h: height };
      p.isVisible = true;
      p.isActive = true;
      caretRef.current.style.display = "block";
    }

    // Trigger non-idle state (smooth solid style) for active typing moments
    setIsCaretIdle(false);
    if (caretIdleTimeoutRef.current) {
      clearTimeout(caretIdleTimeoutRef.current);
    }
    caretIdleTimeoutRef.current = setTimeout(() => {
      setIsCaretIdle(true);
    }, 550); // Blink state is restored when idle for 550ms
  }, []);

  const handleEvents = useCallback(() => {
    updateCaretPosition();
    updateScrollStats();
  }, [updateCaretPosition, updateScrollStats]);

  useEffect(() => {
    // Register selection and resize handles globally
    document.addEventListener("selectionchange", handleEvents);
    window.addEventListener("resize", handleEvents);

    const editable = containerRef.current?.querySelector(".lexkit-content-editable");
    if (editable) {
      editable.addEventListener("scroll", handleEvents);
      editable.addEventListener("focus", handleEvents);
      editable.addEventListener("blur", handleEvents);
      editable.addEventListener("keyup", handleEvents);
      editable.addEventListener("keydown", handleEvents);
      editable.addEventListener("click", handleEvents);
      editable.addEventListener("mouseup", handleEvents);
      editable.addEventListener("pointerup", handleEvents);
    }

    // Hide caret when clicking outside the editor container
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (!containerRef.current.contains(target)) {
        if (caretRef.current) caretRef.current.style.display = "none";
        setCaretFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);

    // Capture initial positions
    const timeoutId = setTimeout(handleEvents, 80);

    return () => {
      document.removeEventListener("selectionchange", handleEvents);
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("resize", handleEvents);
      if (editable) {
        editable.removeEventListener("scroll", handleEvents);
        editable.removeEventListener("focus", handleEvents);
        editable.removeEventListener("blur", handleEvents);
        editable.removeEventListener("keyup", handleEvents);
        editable.removeEventListener("keydown", handleEvents);
        editable.removeEventListener("click", handleEvents);
        editable.removeEventListener("mouseup", handleEvents);
        editable.removeEventListener("pointerup", handleEvents);
      }
      clearTimeout(timeoutId);
      if (caretIdleTimeoutRef.current) {
        clearTimeout(caretIdleTimeoutRef.current);
      }
    };
  }, [handleEvents]);

  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingScrollbar(true);
    const startY = e.clientY;
    const editable = containerRef.current?.querySelector(".lexkit-content-editable") as HTMLElement;
    if (!editable) return;
    const startScrollTop = editable.scrollTop;
    const scrollHeight = editable.scrollHeight;
    const clientHeight = editable.clientHeight;
    const trackHeight = scrollTrackRef.current?.clientHeight || clientHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const scrollableDist = scrollHeight - clientHeight;
      const trackDist = trackHeight - thumbHeight;
      const scrollRatio = scrollableDist / trackDist;
      editable.scrollTop = startScrollTop + deltaY * scrollRatio;
    };

    const onMouseUp = () => {
      setIsDraggingScrollbar(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onThumbMouseDownX = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingScrollbarX(true);
    const startX = e.clientX;
    const editable = containerRef.current?.querySelector(".lexkit-content-editable") as HTMLElement;
    if (!editable) return;
    const startScrollLeft = editable.scrollLeft;
    const scrollWidth = editable.scrollWidth;
    const clientWidth = editable.clientWidth;
    const trackWidth = scrollTrackXRef.current?.clientWidth || clientWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const scrollableDist = scrollWidth - clientWidth;
      const trackDist = trackWidth - thumbWidth;
      const scrollRatio = scrollableDist / trackDist;
      editable.scrollLeft = startScrollLeft + deltaX * scrollRatio;
    };

    const onMouseUp = () => {
      setIsDraggingScrollbarX(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const methods = useMemo<DefaultTemplateRef>(
    () => ({
      injectMarkdown: (markdownStr: string) => {
        setTimeout(() => {
          if (editor) {
            editor.update(() => {
              commandsRef.current.importFromMarkdown(markdownStr, { immediate: true, preventFocus: true });
            });
          }
        }, 100);
      },
      injectHTML: (htmlStr: string) => {
        setTimeout(() => {
          if (editor) {
            editor.update(() => {
              commandsRef.current.importFromHTML(htmlStr, { preventFocus: true });
            });
          }
        }, 100);
      },
      getMarkdown: () => commandsRef.current.exportToMarkdown(),
      getHTML: () => commandsRef.current.exportToHTML(),
      getText: () => {
         let text = "";
         if(editor) {
             editor.getEditorState().read(() => {

                 text = $getRoot().getTextContent();
             });
         }
         return text;
      },
      getSelection: () => {
        let result: { start: number; end: number } | null = null;
        if (editor) {
          editor.getEditorState().read(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              result = { start: sel.anchor.offset, end: sel.focus.offset };
            }
          });
        }
        return result;
      },
      setSelection: (range: { start: number; end: number }) => {
        if (!editor) return;
        setTimeout(() => {
          editor.update(() => {
            const root = $getRoot();
            const textNodes: any[] = [];
            const collectTextNodes = (node: any) => {
              if ($isTextNode(node)) {
                textNodes.push(node);
              } else if (typeof node.getChildren === "function") {
                node.getChildren().forEach(collectTextNodes);
              }
            };
            root.getChildren().forEach(collectTextNodes);

            const locate = (offset: number) => {
              let remaining = offset;
              for (const node of textNodes) {
                const len = node.getTextContentSize();
                if (remaining <= len) {
                  return { node, offset: remaining };
                }
                remaining -= len;
              }
              const last = textNodes[textNodes.length - 1];
              return last ? { node: last, offset: last.getTextContentSize() } : null;
            };

            const anchorPos = locate(range.start);
            const focusPos = locate(range.end);
            if (anchorPos && focusPos) {
              const selection = $createRangeSelection();
              selection.anchor.set(anchorPos.node.getKey(), anchorPos.offset, "text");
              selection.focus.set(focusPos.node.getKey(), focusPos.offset, "text");
              $setSelection(selection);
            }
          });
        }, 120);
      },
      setReadOnly: (readOnly: boolean) => {
        if(editor) {
          editor.setEditable(!readOnly);
        }
      },
      focus: () => {
        if (editor) {
          editor.focus();
        }
      }
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
        if (onChange) onChange();
        updateCaretPosition();
      }
    });
  }, [editor, onChange, updateCaretPosition]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || !commands) return;

    const paletteCommands = commandsToCommandPaletteItems(commands);
    paletteCommands.forEach((cmd) => commands.registerCommand(cmd));

    const originalShowCommand = commands.showCommandPalette;
    (commands as any).showCommandPalette = () => setCommandPaletteOpen(true);

    const originalInsertImage = commands.insertImage;
    commands.insertImage = (payload: any) => {
      originalInsertImage(payload);

      setTimeout(() => {
        editor.update(() => {
          const root = $getRoot();
          const children = root.getChildren();

          let imageNode: any = null;
          const findImageNode = (nodes: any[]): any => {
            for (const node of nodes) {
              if (node.getType() === "image") {
                imageNode = node;
              } else if (node.getChildren) {
                const found = findImageNode(node.getChildren());
                if (found) return found;
              }
            }
            return null;
          };
          findImageNode(children);

          if (imageNode) {
            const nextSibling = imageNode.getNextSibling();
            if (!nextSibling || nextSibling.getType() !== "paragraph") {
              const paragraphNode = $createParagraphNode();
              imageNode.insertAfter(paragraphNode);
              paragraphNode.select();
            } else {
              (nextSibling as any).selectStart();
            }
          }
        });
      }, 50);
    };

    const unregisterShortcuts = registerKeyboardShortcuts(commands, document.body);

    if (!readyRef.current) {
      readyRef.current = true;
      onReady?.(methods);
    }

    return () => {
      unregisterShortcuts();
      (commands as any).showCommandPalette = originalShowCommand;
      commands.insertImage = originalInsertImage;
    };
  }, [editor, commands, onReady, methods]);

  return (
    <>
      <div className="lexkit-editor-header shrink-0 flex w-full flex-col">
        <Toolbar
            commands={commands}
            hasExtension={hasExtension}
            activeStates={activeStates}
            isDark={isDark}
            toggleTheme={toggleTheme}
            onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            leftAddon={toolbarLeftAddon}
            rightAddon={toolbarRightAddon}
            showLinkDialog={showLinkDialog}
            setShowLinkDialog={setShowLinkDialog}
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            onEditCaption={handleEditCaptionClick}
          />
      </div>
      <div
        ref={containerRef}
        data-editor-theme={isDark ? "dark" : "light"}
        className={`lexkit-editor flex-1 min-h-0 ${readOnly ? "select-none cursor-default" : ""}`}
        onCopyCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); alert("Clipboard operations are locked."); } }}
        onCutCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); alert("Clipboard operations are locked."); } }}
        onPasteCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); alert("Clipboard operations are locked."); } }}
        onContextMenuCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); } }}
        onMouseDownCapture={(e) => { if (readOnly) { e.preventDefault(); e.stopPropagation(); } }}
        onPointerDownCapture={(e) => { if (readOnly) { e.preventDefault(); e.stopPropagation(); } }}
        onKeyDownCapture={(e) => { if (readOnly) { e.preventDefault(); e.stopPropagation(); } }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <RichText
            classNames={{
              container: "flex flex-col flex-1 min-h-0 relative",
              contentEditable: "lexkit-content-editable",
            }}
            placeholder={<div className="lexkit-placeholder">Start typing...</div>}
            errorBoundary={({children}) => <>{children}</>}
          />
          <FloatingToolbarRenderer setShowLinkDialog={setShowLinkDialog} onEditCaption={handleEditCaptionClick} />
        </div>

        {/* Buttery Smooth Custom Gliding Caret */}
        <div
          ref={caretRef}
          className={`custom-smooth-caret ${isCaretIdle ? "animate-caret-blink" : ""}`}
        />

        {/* Custom Virtualized Scrollbar Overlay */}
        {thumbHeight > 0 && (
          <div
            ref={scrollTrackRef}
            className={`lexkit-scrollbar-track-v ${isDraggingScrollbar ? 'active' : ''}`}
          >
            <div
              className="lexkit-scrollbar-thumb-v"
              onMouseDown={onThumbMouseDown}
              style={{
                height: `${thumbHeight}px`,
                transform: `translateY(${scrollProgress * ( (scrollTrackRef.current?.clientHeight || 0) - thumbHeight )}px)`
              }}
            />
          </div>
        )}

        {thumbWidth > 0 && (
          <div
            ref={scrollTrackXRef}
            className={`lexkit-scrollbar-track-h ${isDraggingScrollbarX ? 'active' : ''}`}
          >
            <div
              className="lexkit-scrollbar-thumb-h"
              onMouseDown={onThumbMouseDownX}
              style={{
                width: `${thumbWidth}px`,
                transform: `translateX(${scrollProgressX * ( (scrollTrackXRef.current?.clientWidth || 0) - thumbWidth )}px)`
              }}
            />
          </div>
        )}
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} commands={commandsToCommandPaletteItems(commands)} />

      {/* Caption Dialog */}
      <Dialog isOpen={showCaptionDialog} onClose={() => setShowCaptionDialog(false)} title="Edit Image Caption">
        <div className="lexkit-table-dialog">
          <div className="lexkit-form-group">
            <label htmlFor="image-caption">Caption:</label>
            <input
              id="image-caption"
              type="text"
              placeholder="Write a caption..."
              value={tempCaption}
              onChange={(e) => setTempCaption(e.target.value)}
              className="lexkit-input"
              autoFocus
            />
          </div>
          <div className="lexkit-dialog-actions">
            <button onClick={() => setShowCaptionDialog(false)} className="lexkit-button-secondary">Cancel</button>
            <button
              onClick={() => {
                commands.setImageCaption(tempCaption);
                setShowCaptionDialog(false);
                setTempCaption("");
              }}
              className="lexkit-button-primary"
            >
              Save Caption
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// Main DefaultTemplate Component
interface DefaultTemplateProps {
  className?: string;
  onReady?: (methods: DefaultTemplateRef) => void;
  onChange?: () => void;
  readOnly?: boolean;
  examActive?: boolean;
  toolbarLeftAddon?: React.ReactNode;
  toolbarRightAddon?: React.ReactNode;
}

export const DefaultTemplate = forwardRef<DefaultTemplateRef, DefaultTemplateProps>(({ className, onReady, onChange, readOnly, examActive, toolbarLeftAddon, toolbarRightAddon }, ref) => {
  const { theme: globalTheme, resolvedTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const activeTheme = resolvedTheme || globalTheme;
    if (activeTheme === "dark" || activeTheme === "light") {
      setEditorTheme(activeTheme);
    }
  }, [globalTheme, resolvedTheme]);

  const isDark = editorTheme === "dark";

  useEffect(() => {
    imageExtension.configure({
      uploadHandler: async (file: File) => URL.createObjectURL(file),
      defaultAlignment: "center",
      resizable: true,
      pasteListener: { insert: true, replace: true },
      debug: false,
    });
  }, []);

  const toggleTheme = () => setEditorTheme(isDark ? "light" : "dark");

  // Expose methods via ref
  const [methods, setMethods] = useState<DefaultTemplateRef | null>(null);
  React.useImperativeHandle(ref, () => methods as DefaultTemplateRef, [methods]);

  const handleReady = (m: DefaultTemplateRef) => {
    setMethods(m);
    onReady?.(m);
  };

  return (
    <div className={`lexkit-editor-wrapper flex flex-col h-full border-none rounded-none shadow-none !bg-transparent ${className || ""}`} data-editor-theme={editorTheme}>
      <Provider extensions={extensions} config={{ theme: defaultTheme }}>
        <EditorContent className={className} isDark={isDark} toggleTheme={toggleTheme} onReady={handleReady} onChange={onChange} readOnly={readOnly} examActive={examActive} toolbarLeftAddon={toolbarLeftAddon} toolbarRightAddon={toolbarRightAddon} />
      </Provider>
    </div>
  );
});

DefaultTemplate.displayName = "DefaultTemplate";
