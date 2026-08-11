import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";


export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".lexkit-select-dropdown")
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (!isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="lexkit-select" ref={selectRef}>
      <button
        className={`lexkit-select-trigger ${isOpen ? "open" : ""}`}
        onClick={handleOpen}
        type="button"
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={14} />
      </button>
      {isOpen &&
        createPortal(
          <div
            className="lexkit-select-dropdown"
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: Math.max(dropdownPos.width, 140),
              zIndex: 9999,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                className={`lexkit-select-option ${value === option.value ? "selected" : ""}`}
                onClick={() => {
                  onValueChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}


export function Dropdown({
  trigger,
  children,
  isOpen,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".lexkit-dropdown-content")
      ) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  const handleOpen = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    onOpenChange(!isOpen);
  };

  return (
    <div className="lexkit-dropdown" ref={dropdownRef}>
      <div onClick={handleOpen}>{trigger}</div>
      {isOpen &&
        createPortal(
          <div
            className="lexkit-dropdown-content"
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 9999,
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
}

// Custom Dialog Component
export function Dialog({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="lexkit-dialog-overlay">
      <div className="lexkit-dialog" ref={dialogRef}>
        <div className="lexkit-dialog-header">
          <h3 className="lexkit-dialog-title">{title}</h3>
          <button
            className="lexkit-dialog-close"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <div className="lexkit-dialog-content">{children}</div>
      </div>
    </div>,
    document.body
  );
}
