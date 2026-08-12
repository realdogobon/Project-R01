/**
 * Global error boundary for RoyScript TSR.
 *
 * The Vite dev environment can occasionally throw a transient mount error
 * (e.g. while the server is mid-restart and a module graph is partially
 * replaced). Rather than leaving the user staring at a broken error screen,
 * this boundary self-heals: it retries a full page reload a few times with
 * backoff, and only gives up with a visible message after exhausting retries.
 */
import React, { Component } from "react";

interface State {
  error: Error | null;
  retrying: boolean;
}

const RETRIES = 3;
const RETRY_DELAY_MS = 1500;

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, retrying: true };

  static getDerivedStateFromError(error: Error): State {
    return { error, retrying: true };
  }

  componentDidCatch(error: Error) {
    const msg = error?.message ?? "";
    const fatal =
      msg.includes("Cannot read propert") ||
      msg.includes("Invalid hook call") ||
      msg.includes("useState");
    if (!fatal || !window || typeof window.location === "undefined") {
      this.setState({ retrying: false });
      return;
    }
    const retryKey = "roystsr-crash-retries";
    let remaining = Number(window.sessionStorage.getItem(retryKey) ?? RETRIES);
    if (remaining <= 0) {
      this.setState({ retrying: false });
      return;
    }
    window.sessionStorage.setItem(retryKey, String(remaining - 1));
    window.setTimeout(() => {
      window.location.reload();
    }, RETRY_DELAY_MS);
  }

  render() {
    const { error, retrying } = this.state;
    if (!error) return this.props.children;
    if (retrying) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#0b0d12",
            color: "#cbd5e1",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          Recovering… reloading in a moment.
        </div>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          height: "100vh",
          background: "#0b0d12",
          color: "#cbd5e1",
          fontFamily: "monospace",
          fontSize: 14,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div>Something went wrong while loading the app.</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
