export type CommandPaletteExecutionGuard<TSelection> = {
  capture: (selection: TSelection | null) => void;
  execute: (action: () => void) => void;
};

export function createCommandPaletteExecutionGuard<TSelection>({
  focusEditor,
  restoreSelection,
}: {
  focusEditor: () => void;
  restoreSelection: (selection: TSelection, afterRestore: () => void) => void;
}): CommandPaletteExecutionGuard<TSelection> {
  let capturedSelection: TSelection | null = null;

  return {
    capture(selection) {
      capturedSelection = selection;
    },
    execute(action) {
      const selection = capturedSelection;
      capturedSelection = null;

      if (selection === null) {
        action();
        focusEditor();
        return;
      }

      // The palette search input owns DOM focus until its close render commits.
      // Restore the Lexical snapshot, wait for that editor update to commit, then
      // dispatch. Running a block command inside the restore update can make a
      // collapsed start-of-block selection normalize into an empty sibling.
      restoreSelection(selection, () => {
        action();
        focusEditor();
      });
    },
  };
}
