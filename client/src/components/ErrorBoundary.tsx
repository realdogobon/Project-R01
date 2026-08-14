/**
 * Global error boundary for RoyScript TSR.
 *
 * The Vite dev environment can occasionally throw a transient mount error
 * (e.g. while the server is mid-restart and a module graph is partially
 * replaced). Rather than leaving the user staring at a broken error screen,
 * this boundary self-heals: it retries a full page reload a few times with
 * backoff, then fails closed without presenting a diagnostic surface.
 */
import React, { Component } from "react";

interface State {
  error: Error | null;
  retrying: boolean;
}

const RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const RETRY_KEY = "roystsr-crash-retries";

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, retrying: true };

  componentDidMount() {
    // A successful mount proves the module graph is healthy; do not carry a
    // retry counter into a later, unrelated navigation.
    window.sessionStorage.removeItem(RETRY_KEY);
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, retrying: true };
  }

  componentDidCatch(error: Error) {
    const msg = error?.message ?? "";
    const fatal =
      msg.includes("Cannot read propert") ||
      msg.includes("Invalid hook call") ||
      msg.includes("useState");
    if (!fatal || typeof window === "undefined" || typeof window.location === "undefined") {
      this.setState({ retrying: false });
      return;
    }
    let remaining = Number(window.sessionStorage.getItem(RETRY_KEY) ?? RETRIES);
    if (remaining <= 0) {
      this.setState({ retrying: false });
      return;
    }
    window.sessionStorage.setItem(RETRY_KEY, String(remaining - 1));
    window.setTimeout(() => {
      // A normal reload can reuse the browser's stale Vite dependency graph.
      // A unique entry URL forces the preview shell to request a fresh graph.
      const recoveryUrl = new URL(window.location.href);
      recoveryUrl.searchParams.set("__roy_recover", String(Date.now()));
      window.location.replace(recoveryUrl.toString());
    }, RETRY_DELAY_MS);
  }

  render() {
    const { error, retrying } = this.state;
    if (!error) return this.props.children;
    void retrying;
    return null;
  }
}
