import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

const useAutoDarkTheme = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};


interface CaretPos {
  left: number;
  top: number;
  height: number;
  visible: boolean;
}

interface StylesCache {
  font: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  letterSpacing: string;
  paddingLeft: number;
  paddingRight: number;
  borderLeft: number;
  borderRight: number;
  borderTop: number;
  borderBottom: number;
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  boxSizing: string;
  width: string;
  height: string;
}

export interface SmoothInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  isDarkTheme?: boolean;
}

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  ({ className = "", isDarkTheme, onChange, onFocus, onBlur, onScroll, ...props }, ref) => {
    const detectedDark = useAutoDarkTheme();
    const isDark = isDarkTheme ?? detectedDark;

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement | null>(null);
    const caretIdleTimeoutRef = useRef<any>(null);
    const stylesCacheRef = useRef<StylesCache | null>(null);
    const frameRef = useRef<number | null>(null);

    const [caretPos, setCaretPos] = useState<CaretPos | null>(null);
    const [caretFocused, setCaretFocused] = useState(false);
    const [isCaretIdle, setIsCaretIdle] = useState(true);

    useImperativeHandle(ref, () => inputRef.current!);


    const cacheStyles = useCallback(() => {
      const input = inputRef.current;
      if (!input) return;
      const style = window.getComputedStyle(input);

      stylesCacheRef.current = {
        font: style.font,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        paddingLeft: parseFloat(style.paddingLeft) || 0,
        paddingRight: parseFloat(style.paddingRight) || 0,
        borderLeft: parseFloat(style.borderLeftWidth) || 0,
        borderRight: parseFloat(style.borderRightWidth) || 0,
        borderTop: parseFloat(style.borderTopWidth) || 0,
        borderBottom: parseFloat(style.borderBottomWidth) || 0,
        lineHeight: parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.2),
        paddingTop: parseFloat(style.paddingTop) || 0,
        paddingBottom: parseFloat(style.paddingBottom) || 0,
        boxSizing: style.boxSizing,
        width: style.width,
        height: style.height,
      };


      let mirror = mirrorRef.current;
      if (!mirror) {
        mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.top = "0px";
        mirror.style.left = "0px";
        mirror.style.height = "0px";
        mirror.style.overflow = "hidden";
        mirror.style.visibility = "hidden";
        mirror.style.pointerEvents = "none";
        document.body.appendChild(mirror);
        mirrorRef.current = mirror;
      }
      const stylesToCopy = [
        "font", "fontSize", "fontFamily", "fontWeight", "fontStyle",
        "letterSpacing", "lineHeight", "paddingTop", "paddingBottom",
        "paddingLeft", "paddingRight", "borderTopWidth", "borderBottomWidth",
        "borderLeftWidth", "borderRightWidth", "boxSizing", "textAlign", "textTransform",
        "whiteSpace", "wordBreak", "overflowWrap"
      ];
      stylesToCopy.forEach(key => (mirror.style as any)[key] = (style as any)[key]);
    }, []);

    const updateCaret = useCallback(() => {
      const input = inputRef.current;
      if (!input) return;

      const activeDoc = document.activeElement;
      const isFocused = activeDoc === input;
      setCaretFocused(isFocused);

      if (!isFocused) {
        setCaretPos(prev => prev ? { ...prev, visible: false } : null);
        return;
      }


      if (!stylesCacheRef.current) {
        cacheStyles();
      }

      const cache = stylesCacheRef.current;
      if (!cache) return;

      const selectionStart = input.selectionStart ?? 0;
      const textBeforeCaret = input.value.substring(0, selectionStart);

      let mirror = mirrorRef.current;
      if (!mirror) {
        mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.top = "0px";
        mirror.style.left = "0px";
        mirror.style.height = "0px";
        mirror.style.overflow = "hidden";
        mirror.style.visibility = "hidden";
        mirror.style.pointerEvents = "none";
        document.body.appendChild(mirror);
        mirrorRef.current = mirror;
      }

      mirror.textContent = textBeforeCaret.replace(/ /g, "\u00a0");

      const textWidth = mirror.getBoundingClientRect().width;
      const inputRect = input.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const scrollLeft = input.scrollLeft;
      const left = cache.paddingLeft + cache.borderLeft + textWidth - scrollLeft;

      if (isNaN(left)) return;

      const inputHeight = inputRect.height;
      const fontSize = parseFloat(cache.fontSize) || 14;
      const caretHeight = fontSize * 1.15;
      const top = (inputHeight - caretHeight) / 2;


      setIsCaretIdle(false);
      if (caretIdleTimeoutRef.current) clearTimeout(caretIdleTimeoutRef.current);
      caretIdleTimeoutRef.current = setTimeout(() => {
        setIsCaretIdle(true);
      }, 550);

      setCaretPos({
        left,
        top,
        height: caretHeight,
        visible: true
      });
    }, [cacheStyles]);

    const requestUpdateCaret = useCallback(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        updateCaret();
      });
    }, [updateCaret]);

    useEffect(() => {
      const handleSelectionChange = () => {
        if (document.activeElement === inputRef.current) {
          requestUpdateCaret();
        }
      };

      const handleResize = () => {
        if (document.activeElement === inputRef.current) {
          cacheStyles();
          updateCaret();
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      window.addEventListener("resize", handleResize);
      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        window.removeEventListener("resize", handleResize);
        if (mirrorRef.current) {
          mirrorRef.current.remove();
          mirrorRef.current = null;
        }
        if (caretIdleTimeoutRef.current) clearTimeout(caretIdleTimeoutRef.current);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }, [requestUpdateCaret, cacheStyles, updateCaret]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      cacheStyles();
      setCaretFocused(true);
      if (onFocus) onFocus(e);

      requestAnimationFrame(() => {
        updateCaret();
      });
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setCaretFocused(false);
      stylesCacheRef.current = null;
      if (onBlur) onBlur(e);
      setCaretPos(prev => prev ? { ...prev, visible: false } : null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e);
      requestUpdateCaret();
    };

    const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
      if (onScroll) onScroll(e);
      updateCaret();
    };

    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        data-editor-theme={isDark ? "dark" : "light"}
      >
        <input
          ref={inputRef}
          className={`${className} smooth-input-target`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
          onScroll={handleScroll}
          onKeyUp={requestUpdateCaret}
          onKeyDown={requestUpdateCaret}
          onClick={requestUpdateCaret}
          {...props}
        />
      </div>
    );
  }
);

SmoothInput.displayName = "SmoothInput";

export interface SmoothTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  isDarkTheme?: boolean;
}

export const SmoothTextarea = forwardRef<HTMLTextAreaElement, SmoothTextareaProps>(
  ({ className = "", isDarkTheme, onChange, onFocus, onBlur, onScroll, ...props }, ref) => {
    const detectedDark = useAutoDarkTheme();
    const isDark = isDarkTheme ?? detectedDark;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mirrorRef = useRef<HTMLDivElement | null>(null);
    const caretIdleTimeoutRef = useRef<any>(null);
    const stylesCacheRef = useRef<StylesCache | null>(null);
    const frameRef = useRef<number | null>(null);

    const [caretPos, setCaretPos] = useState<CaretPos | null>(null);
    const [caretFocused, setCaretFocused] = useState(false);
    const [isCaretIdle, setIsCaretIdle] = useState(true);

    useImperativeHandle(ref, () => textareaRef.current!);

    const cacheStyles = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const style = window.getComputedStyle(textarea);

      stylesCacheRef.current = {
        font: style.font,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        paddingLeft: parseFloat(style.paddingLeft) || 0,
        paddingRight: parseFloat(style.paddingRight) || 0,
        borderLeft: parseFloat(style.borderLeftWidth) || 0,
        borderRight: parseFloat(style.borderRightWidth) || 0,
        borderTop: parseFloat(style.borderTopWidth) || 0,
        borderBottom: parseFloat(style.borderBottomWidth) || 0,
        lineHeight: parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.2),
        paddingTop: parseFloat(style.paddingTop) || 0,
        paddingBottom: parseFloat(style.paddingBottom) || 0,
        boxSizing: style.boxSizing,
        width: style.width,
        height: style.height,
      };

      let mirror = mirrorRef.current;
      if (!mirror) {
        mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.top = "0px";
        mirror.style.left = "0px";
        mirror.style.height = "0px";
        mirror.style.overflow = "hidden";
        mirror.style.visibility = "hidden";
        mirror.style.pointerEvents = "none";
        document.body.appendChild(mirror);
        mirrorRef.current = mirror;
      }

      const stylesToCopy = [
        "font", "fontSize", "fontFamily", "fontWeight", "fontStyle",
        "letterSpacing", "lineHeight", "paddingTop", "paddingBottom",
        "paddingLeft", "paddingRight", "borderTopWidth", "borderBottomWidth",
        "borderLeftWidth", "borderRightWidth", "boxSizing", "textAlign", "textTransform",
        "whiteSpace", "wordBreak", "overflowWrap"
      ];
      stylesToCopy.forEach(key => {
        (mirror!.style as any)[key] = (style as any)[key];
      });


      const preciseWidth = textarea.clientWidth + stylesCacheRef.current.borderLeft + stylesCacheRef.current.borderRight;
      mirror.style.width = preciseWidth + "px";
    }, []);

    const updateCaret = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const activeDoc = document.activeElement;
      const isFocused = activeDoc === textarea;
      setCaretFocused(isFocused);

      if (!isFocused) {
        setCaretPos(prev => prev ? { ...prev, visible: false } : null);
        return;
      }


      if (!stylesCacheRef.current) {
        cacheStyles();
      }

      const cache = stylesCacheRef.current;
      if (!cache) return;

      const selectionStart = textarea.selectionStart ?? 0;
      const textBeforeCaret = textarea.value.substring(0, selectionStart);

      let mirror = mirrorRef.current;
      if (!mirror) {
        mirror = document.createElement("div");
        mirror.style.position = "absolute";
        mirror.style.top = "0px";
        mirror.style.left = "0px";
        mirror.style.height = "0px";
        mirror.style.overflow = "hidden";
        mirror.style.visibility = "hidden";
        mirror.style.pointerEvents = "none";
        document.body.appendChild(mirror);
        mirrorRef.current = mirror;
      }

      mirror.textContent = "";

      const textNode = document.createTextNode(textBeforeCaret);
      mirror.appendChild(textNode);

      const marker = document.createElement("span");
      marker.textContent = "\u200b";
      mirror.appendChild(marker);

      const textAfterCaret = textarea.value.substring(selectionStart);
      const remainingNode = document.createTextNode(textAfterCaret);
      mirror.appendChild(remainingNode);


      const preciseWidth = textarea.clientWidth + cache.borderLeft + cache.borderRight;
      mirror.style.width = preciseWidth + "px";

      const textareaRect = textarea.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;

      const relativeLeft = markerRect.left - mirrorRect.left;
      const relativeTop = markerRect.top - mirrorRect.top;

      const left = relativeLeft - scrollLeft;
      const top = relativeTop - scrollTop;

      if (isNaN(left) || isNaN(top)) return;

      const fontSize = parseFloat(cache.fontSize) || 14;
      const caretHeight = fontSize * 1.15;

      setIsCaretIdle(false);
      if (caretIdleTimeoutRef.current) clearTimeout(caretIdleTimeoutRef.current);
      caretIdleTimeoutRef.current = setTimeout(() => {
        setIsCaretIdle(true);
      }, 550);

      setCaretPos({
        left,
        top,
        height: caretHeight,
        visible: true
      });
    }, [cacheStyles]);

    const requestUpdateCaret = useCallback(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        updateCaret();
      });
    }, [updateCaret]);

    useEffect(() => {
      const handleSelectionChange = () => {
        if (document.activeElement === textareaRef.current) {
          requestUpdateCaret();
        }
      };

      const handleResize = () => {
        if (document.activeElement === textareaRef.current) {
          cacheStyles();
          updateCaret();
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      window.addEventListener("resize", handleResize);
      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        window.removeEventListener("resize", handleResize);
        if (mirrorRef.current) {
          mirrorRef.current.remove();
          mirrorRef.current = null;
        }
        if (caretIdleTimeoutRef.current) clearTimeout(caretIdleTimeoutRef.current);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }, [requestUpdateCaret, cacheStyles, updateCaret]);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      cacheStyles();
      setCaretFocused(true);
      if (onFocus) onFocus(e);
      requestAnimationFrame(() => {
        updateCaret();
      });
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setCaretFocused(false);
      stylesCacheRef.current = null;
      if (onBlur) onBlur(e);
      setCaretPos(prev => prev ? { ...prev, visible: false } : null);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) onChange(e);
      requestUpdateCaret();
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (onScroll) onScroll(e);
      updateCaret();
    };

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col overflow-hidden"
        data-editor-theme={isDark ? "dark" : "light"}
      >
        <textarea
          ref={textareaRef}
          className={`${className} smooth-textarea-target`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleTextareaChange}
          onScroll={handleScroll}
          onKeyUp={requestUpdateCaret}
          onKeyDown={requestUpdateCaret}
          onClick={requestUpdateCaret}
          {...props}
        />
      </div>
    );
  }
);

SmoothTextarea.displayName = "SmoothTextarea";
