"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type PromptOptions = {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
};

type DialogContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const [promptDialog, setPromptDialog] = useState<{
    options: PromptOptions;
    resolve: (value: string | null) => void;
  } | null>(null);

  const [promptValue, setPromptValue] = useState("");

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  };

  const prompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptValue(options.defaultValue || "");
      setPromptDialog({ options, resolve });
    });
  };

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  const handlePrompt = (result: string | null) => {
    if (promptDialog) {
      promptDialog.resolve(result);
      setPromptDialog(null);
      setPromptValue("");
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => handleConfirm(false)}
        >
          <div
            className="nb-card-elevated rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--nb-ink)" }}>
              {confirmDialog.options.title}
            </h2>
            <p className="mb-6" style={{ color: "color-mix(in srgb, var(--nb-ink) 70%, transparent)" }}>
              {confirmDialog.options.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirm(false)}
                className="h-10 px-4 rounded-lg nb-btn-secondary transition-colors"
                style={{
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "color-mix(in srgb, var(--nb-ink) 5%, transparent)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {confirmDialog.options.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="h-10 px-4 rounded-lg transition-colors"
                style={{
                  backgroundColor: confirmDialog.options.danger
                    ? "var(--nb-coral)"
                    : "var(--nb-accent)",
                  color: "#1d1d1d",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
                onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
              >
                {confirmDialog.options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => handlePrompt(null)}
        >
          <div
            className="nb-card-elevated rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--nb-ink)" }}>
              {promptDialog.options.title}
            </h2>
            <p className="mb-4" style={{ color: "color-mix(in srgb, var(--nb-ink) 70%, transparent)" }}>
              {promptDialog.options.message}
            </p>
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePrompt(promptValue.trim() || null);
                } else if (e.key === "Escape") {
                  handlePrompt(null);
                }
              }}
              placeholder={promptDialog.options.placeholder}
              className="w-full h-10 px-3 rounded-lg bg-transparent mb-6 focus:outline-none focus:ring-2"
              style={{
                border: "1px solid color-mix(in srgb, var(--nb-ink) 15%, transparent)",
                color: "var(--nb-ink)",
                caretColor: "var(--nb-ink)",
              }}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handlePrompt(null)}
                className="h-10 px-4 rounded-lg nb-btn-secondary transition-colors"
                style={{
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "color-mix(in srgb, var(--nb-ink) 5%, transparent)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {promptDialog.options.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => handlePrompt(promptValue.trim() || null)}
                className="h-10 px-4 rounded-lg nb-btn-primary transition-colors"
              >
                {promptDialog.options.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
