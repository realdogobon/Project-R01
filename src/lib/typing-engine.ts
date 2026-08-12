import { animate } from "motion/react";

export interface ReplayEvent {
  t: number;
  s: string;
}

export interface EngineConfig {
  words: string[];
  durationLimitMin: number;
  strictDisableBackspace: boolean;
  strictMinWpm: number;
  strictMinAcc: number;
  strictMaxErrors: number;
  strictSuddenDeath: boolean;
  strictInactivityTimeout: number;
  onFinish: (wpm: number, acc: number, elapsedSecs: number, finalTyped: string, wpmHistory: number[], replayLog: ReplayEvent[], errorIndices: number[]) => void;
  onSound: (type: "up" | "down" | "error", key: string) => void;
  onStrictViolation: (reason: string) => void;
  onTick: (wpm: number, acc: number, remaining: number | null) => void;
}

export class TypingEngine {

  private words: string[];
  public wordIndex = 0;
  private typed = "";
  private wordInputs: string[] = [];
  private replayLog: ReplayEvent[] = [];
  private isStarted = false;
  private startTime: number | null = null;
  private elapsedSeconds = 0;
  private lastKeyPressTime = 0;


  private correctChars = 0;
  private incorrectChars = 0;
  private totalChars = 0;
  private wpmHistory: number[] = [];
  private errorIndices: Set<number> = new Set();


  private inputElem: HTMLInputElement | null = null;
  private cursorElem: HTMLElement | null = null;
  private wordsContainer: HTMLElement | null = null;


  private config: EngineConfig;
  private timer: ReturnType<typeof setInterval> | null = null;


  private finished = false;

  private activeChunkIndex = 0;
  private typingTimeout: any = null;
  private isFirstCursorUpdate = true;

  constructor(config: EngineConfig) {
    this.config = config;
    this.words = config.words;
  }

  public mount(inputElem: HTMLInputElement, cursorElem: HTMLElement, wordsContainer: HTMLElement) {
    this.inputElem = inputElem;
    this.cursorElem = cursorElem;
    this.wordsContainer = wordsContainer;


    this.inputElem.addEventListener("keydown", this.handleKeyDown);
    this.inputElem.addEventListener("keyup", this.handleKeyUp);


    this.updateCursor();
  }

  public unmount() {
    if (this.inputElem) {
      this.inputElem.removeEventListener("keydown", this.handleKeyDown);
      this.inputElem.removeEventListener("keyup", this.handleKeyUp);
    }
    this.stopTimer();
  }

  public getSnapshot() {
    return {
      wordIndex: this.wordIndex,
      typed: this.typed,
      wordInputs: [...this.wordInputs],
      replayLog: [...this.replayLog],
      wpmHistory: [...this.wpmHistory],
      errorIndices: Array.from(this.errorIndices),
      correctChars: this.correctChars,
      incorrectChars: this.incorrectChars,
      elapsedSeconds: this.elapsedSeconds,
    };
  }

  public isFinished() {
    return this.finished;
  }


  private handleKeyUp = (e: KeyboardEvent) => {
    this.config.onSound("up", e.code);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.finished) return;
    if (e.repeat && e.key !== "Backspace") {
      e.preventDefault();
      return;
    }

    this.lastKeyPressTime = Date.now();

    const isAltWordDelete = e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === "Backspace" || e.key === "Delete");
    const isCtrlBackspace = e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && e.key === "Backspace";

    if ((isAltWordDelete || isCtrlBackspace) && !this.config.strictDisableBackspace) {
      e.preventDefault();
      this.config.onSound("down", "Backspace");
      if (this.typed.length === 0 && this.wordIndex > 0) {

        this.wordIndex--;
        this.typed = "";
        this.wordInputs.pop();
        if (this.inputElem) this.inputElem.value = "";

        const wordContainer = document.getElementById(`typing-word-${this.wordIndex}`);
        if (wordContainer) {
           wordContainer.classList.remove("after:absolute", "after:right-0", "after:bottom-0", "after:left-0", "after:h-[2px]", "after:rounded-full", "after:bg-red-500/50");
        }
      } else {
        this.typed = "";
        if (this.inputElem) this.inputElem.value = "";
      }
      this.updateWordDOM();
      this.updateCursor();
      this.updateScroll();
      this.logReplayState();
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) {
      this.config.onSound("down", e.code);
      return;
    }
    if (e.key.length > 1 && e.key !== "Backspace") {
      this.config.onSound("down", e.code);
      return;
    }

    if (this.config.strictDisableBackspace && e.key === "Backspace") {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    if (!this.isStarted) {
      this.start();
    }

    if (this.wordsContainer) {
       this.wordsContainer.classList.add("is-typing");
       if (this.typingTimeout) clearTimeout(this.typingTimeout);
       this.typingTimeout = setTimeout(() => {
           if (this.wordsContainer) this.wordsContainer.classList.remove("is-typing");
       }, 500);
    }

    const currentWord = this.words[this.wordIndex];

    if (e.key === " ") {
      if (this.typed.length === 0) return;

      this.config.onSound("down", " ");


      const isCorrect = this.typed === currentWord;

      if (this.config.strictSuddenDeath && !isCorrect) {
          this.config.onStrictViolation("Sudden Death! Typos are forbidden under perfect run parameters.");
          this.fail();
          return;
      }

      const wordContainer = document.getElementById(`typing-word-${this.wordIndex}`);
      if (wordContainer && !isCorrect) {
         wordContainer.classList.add("after:absolute", "after:right-0", "after:bottom-0", "after:left-0", "after:h-[2px]", "after:rounded-full", "after:bg-red-500/50");
      }

      this.wordInputs[this.wordIndex] = this.typed;
      this.wordIndex++;
      this.typed = "";
      if (this.inputElem) this.inputElem.value = "";

      this.updateWordDOM();
      this.updateScroll();
      this.updateCursor();
      this.logReplayState();

      if (this.wordIndex === this.words.length) {
        this.finish();
      }
      return;
    }

    if (e.key === "Backspace") {
      this.config.onSound("down", "Backspace");
      if (this.typed.length === 0 && this.wordIndex > 0) {

        this.wordIndex--;
        this.typed = this.wordInputs[this.wordIndex] || "";
        this.wordInputs.pop();
        if (this.inputElem) this.inputElem.value = this.typed;


        const wordContainer = document.getElementById(`typing-word-${this.wordIndex}`);
        if (wordContainer) {
           wordContainer.classList.remove("after:absolute", "after:right-0", "after:bottom-0", "after:left-0", "after:h-[2px]", "after:rounded-full", "after:bg-red-500/50");
        }
      } else if (this.typed.length > 0) {
        this.typed = this.typed.slice(0, -1);
        if (this.inputElem) this.inputElem.value = this.typed;
      }
      this.updateWordDOM();
      this.updateCursor();
      this.updateScroll();
      this.logReplayState();
      return;
    }


    const char = e.key;
    const isError = this.typed.length < currentWord.length ? char !== currentWord[this.typed.length] : true;

    if (isError) {
      this.config.onSound("error", e.code);
      this.incorrectChars++;

      // Track the snapshot index where the mistake occurred
      this.errorIndices.add(this.replayLog.length);

      if (this.config.strictSuddenDeath) {
          this.config.onStrictViolation("Sudden Death! Typos are forbidden under perfect run parameters.");
          this.fail();
          return;
      }


      if (!Number.isNaN(this.config.strictMaxErrors) && this.incorrectChars > this.config.strictMaxErrors) {
          this.config.onStrictViolation(`Maximum errors exceeded: ${this.incorrectChars} > ${this.config.strictMaxErrors}`);
          this.fail();
          return;
      }
    } else {
      this.config.onSound("down", e.code);
      if (this.typed.length < currentWord.length) {
         this.correctChars++;
      }
    }

    this.typed += char;
    if (this.inputElem) this.inputElem.value = this.typed;

    this.updateWordDOM();
    this.updateCursor();
    this.logReplayState();
  };

  private logReplayState() {
      const fullText = this.wordInputs.join(" ") + (this.wordInputs.length > 0 ? " " : "") + this.typed;
      const t = this.startTime !== null ? Date.now() - this.startTime : 0;
      this.replayLog.push({ t, s: fullText });
  }

  private renderExtrasDOM(extrasContainer: HTMLElement, extraTyped: string) {
       let html = "";
       for (let i=0; i<extraTyped.length; i++) {
           html += `<span class="relative inline-block text-red-500 font-normal">${extraTyped[i]}</span>`;
       }
       extrasContainer.innerHTML = html;
  }

  private renderWordCharsDOM(wordIdx: number, typedStr: string) {
    const currentWord = this.words[wordIdx];
    if (!currentWord) return;

    for (let i = 0; i < currentWord.length; i++) {
      const charElem = document.getElementById(`typing-char-${wordIdx}-${i}`);
      if (!charElem) continue;

      if (i < typedStr.length) {
        if (typedStr[i] === currentWord[i]) {
          charElem.className = "typing-char-correct font-normal";
          charElem.style.color = "var(--typing-text-correct, currentColor)";
          charElem.style.textShadow = "none";
          charElem.style.opacity = "1";
        } else {
          charElem.className = "typing-char-error font-normal";
          charElem.style.color = "var(--typing-text-error, #ef4444)";
          charElem.style.textShadow = "none";
          charElem.style.opacity = "1";
        }
      } else {
        charElem.className = "typing-char-pending font-normal";
        charElem.style.color = "var(--typing-text-pending, #a3a3a3)";
        charElem.style.textShadow = "none";
        charElem.style.opacity = "0.5";
      }
    }

    const extrasSpan = document.getElementById(`typing-extras-${wordIdx}`);
    if (extrasSpan) {
        if (typedStr.length > currentWord.length) {
           const extraTyped = typedStr.slice(currentWord.length);
           this.renderExtrasDOM(extrasSpan, extraTyped);
        } else {
           extrasSpan.innerHTML = "";
        }
    }
  }

  private updateWordDOM() {
    this.renderWordCharsDOM(this.wordIndex, this.typed);
  }

  /**
   * Restores a previously in-progress session (e.g. after the browser tab was
   * closed/reloaded mid-test). Must be called after construction and before
   * `mount()`'s first cursor/scroll paint settles, i.e. call it, then mount,
   * then it will re-run cursor/scroll positioning once the DOM is attached.
   */
  public hydrate(snapshot: {
    wordIndex: number;
    typed: string;
    wordInputs: string[];
    replayLog: ReplayEvent[];
    wpmHistory: number[];
    errorIndices: number[];
    correctChars: number;
    incorrectChars: number;
    elapsedSeconds: number;
  }) {
    // Reset so the first cursor paint after hydration snaps instantly
    // (no spring animation), matching the behaviour of a fresh session.
    this.isFirstCursorUpdate = true;
    this.wordIndex = Math.min(snapshot.wordIndex, this.words.length - 1);
    this.typed = snapshot.typed || "";
    this.wordInputs = [...snapshot.wordInputs];
    this.replayLog = [...snapshot.replayLog];
    this.wpmHistory = [...snapshot.wpmHistory];
    this.errorIndices = new Set(snapshot.errorIndices);
    this.correctChars = snapshot.correctChars;
    this.incorrectChars = snapshot.incorrectChars;
    this.elapsedSeconds = snapshot.elapsedSeconds;

    if (this.inputElem) this.inputElem.value = this.typed;

    for (let i = 0; i < this.wordIndex; i++) {
      this.renderWordCharsDOM(i, this.wordInputs[i] ?? "");
      // Re-apply the word-level red underline for words that were submitted
      // with errors — hydrate() restores char colours but this class-based
      // underline is set imperatively on space-press and must be replayed.
      const hadError = (this.wordInputs[i] ?? "") !== this.words[i];
      const wordEl = document.getElementById(`typing-word-${i}`);
      if (wordEl) {
        if (hadError) {
          wordEl.classList.add("after:absolute", "after:right-0", "after:bottom-0", "after:left-0", "after:h-[2px]", "after:rounded-full", "after:bg-red-500/50");
        } else {
          wordEl.classList.remove("after:absolute", "after:right-0", "after:bottom-0", "after:left-0", "after:h-[2px]", "after:rounded-full", "after:bg-red-500/50");
        }
      }
    }
    this.updateWordDOM();
    // Restore the visual cursor position and row-scroll offset so the
    // user sees exactly the same view they had before the crash/reload.
    // updateCursor() defers via requestAnimationFrame internally, so
    // layout measurements are always valid when they run.
    this.updateCursor();
    this.updateScroll();

    if (this.elapsedSeconds > 0 || this.typed.length > 0 || this.wordIndex > 0) {
      this.isStarted = true;
      this.startTime = Date.now() - this.elapsedSeconds * 1000;
      this.lastKeyPressTime = Date.now();
      this.timer = setInterval(() => this.tick(), 1000);
    }
  }

  private updateCursor() {
     if (!this.cursorElem) return;


     requestAnimationFrame(() => {
        let referenceElem: HTMLElement | null = null;
        let attachAtRight = false;

        const currentWord = this.words[this.wordIndex];

        if (this.typed.length === 0) {

           referenceElem = document.getElementById(`typing-char-${this.wordIndex}-0`);
           attachAtRight = false;
        } else if (this.typed.length <= currentWord.length) {

           const tgtIdx = this.typed.length - 1;
           referenceElem = document.getElementById(`typing-char-${this.wordIndex}-${tgtIdx}`);
           attachAtRight = true;
        } else {

           const extrasSpan = document.getElementById(`typing-extras-${this.wordIndex}`);
           if (extrasSpan && extrasSpan.lastElementChild) {
              referenceElem = extrasSpan.lastElementChild as HTMLElement;
              attachAtRight = true;
           } else {
              referenceElem = document.getElementById(`typing-char-${this.wordIndex}-${currentWord.length - 1}`);
              attachAtRight = true;
           }
        }

        if (referenceElem && this.wordsContainer) {

            const charRect = referenceElem.getBoundingClientRect();
            const contRect = this.wordsContainer.getBoundingClientRect();

            const targetX = charRect.left - contRect.left + (attachAtRight ? charRect.width : 0) - 1;
            const targetY = charRect.top - contRect.top + 2;

            if (this.isFirstCursorUpdate) {
               this.cursorElem!.style.transform = `translate(${targetX}px, ${targetY}px)`;
               this.isFirstCursorUpdate = false;
            } else {
               animate(this.cursorElem!, { x: targetX, y: targetY }, { type: "spring", stiffness: 700, damping: 38, mass: 0.6 });
            }
        }
     });
  }

  private updateScroll() {
     if (!this.wordsContainer) return;
     const activeWordElem = document.getElementById(`typing-word-${this.wordIndex}`);
     if (activeWordElem) {
        const lineH = activeWordElem.offsetHeight + 4;
        const row = Math.round(activeWordElem.offsetTop / lineH);




        const rowOffset = Math.max(0, row - 2) * lineH;
        this.wordsContainer.style.transform = `translate3d(0, -${rowOffset}px, 0)`;
     }
  }

  private start() {
    this.isStarted = true;
    this.startTime = Date.now();
    this.lastKeyPressTime = Date.now();


    this.timer = setInterval(() => this.tick(), 1000);
  }

  private stopTimer() {
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    }
  }

  private tick() {
     if (this.finished) return;

     this.elapsedSeconds++;


     const rawCorrect = this.correctChars / 5;
     let wpm = Math.round(rawCorrect / Math.max(this.elapsedSeconds / 60, 1/60));

     let acc = 100;
     if (this.correctChars + this.incorrectChars > 0) {
         acc = Math.round((this.correctChars / (this.correctChars + this.incorrectChars)) * 100);
     }

     this.wpmHistory.push(wpm);

     let remaining: number | null = null;
     if (this.config.durationLimitMin > 0) {
         remaining = (this.config.durationLimitMin * 60) - this.elapsedSeconds;
     }

     this.config.onTick(wpm, acc, remaining);


      if (!Number.isNaN(this.config.strictInactivityTimeout) && this.config.strictInactivityTimeout > 0) {
          const idleTime = (Date.now() - this.lastKeyPressTime) / 1000;
          if (idleTime > this.config.strictInactivityTimeout) {
              this.config.onStrictViolation(`Rest Limit exceeded! You paused typing for over ${this.config.strictInactivityTimeout} seconds.`);
              this.fail();
              return;
          }
      }


      if (!Number.isNaN(this.config.strictMinWpm) && wpm < this.config.strictMinWpm) {
          this.config.onStrictViolation(`WPM dropped below minimum constraint: ${wpm} < ${this.config.strictMinWpm}`);
          this.fail();
          return;
      }
      if (!Number.isNaN(this.config.strictMinAcc) && acc < this.config.strictMinAcc) {
          this.config.onStrictViolation(`Accuracy dropped below minimum constraint: ${acc}% < ${this.config.strictMinAcc}%`);
          this.fail();
          return;
      }

     if (remaining !== null && remaining <= 0) {
         this.finish();
     }
  }

  private fail() {
      if (this.finished) return;
      this.finished = true;
      this.stopTimer();
  }

  private finish() {
     if (this.finished) return;
     this.finished = true;
     this.stopTimer();

     const rawCorrect = this.correctChars / 5;
     let wpm = Math.round(rawCorrect / Math.max(this.elapsedSeconds / 60, 1/60));

     let acc = 100;
     if (this.correctChars + this.incorrectChars > 0) {
         acc = Math.round((this.correctChars / (this.correctChars + this.incorrectChars)) * 100);
     }

     const finalWords = [...this.wordInputs];
     if (this.typed) finalWords.push(this.typed);
     const finalTypedText = finalWords.join(" ");

     this.config.onFinish(wpm, acc, this.elapsedSeconds, finalTypedText, this.wpmHistory, this.replayLog, Array.from(this.errorIndices));
  }
}

