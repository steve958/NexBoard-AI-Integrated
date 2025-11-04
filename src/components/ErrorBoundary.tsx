"use client";
import React from "react";

type EBState = { error?: unknown };
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { error: undefined }; }
  static getDerivedStateFromError(error: unknown): EBState { return { error }; }
  componentDidCatch(error: unknown, info: React.ErrorInfo) { console.error("Board error:", error, info); }
  render() {
    if (this.state.error) {
      const errorMessage = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
      return (
        <div className="p-6">
          <h2 className="text-red-400 font-semibold mb-2">Something went wrong.</h2>
          <pre className="text-xs opacity-70 whitespace-pre-wrap">{errorMessage}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
