import {StrictMode, Component, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';


if (typeof Map !== 'undefined' && !('getOrInsertComputed' in Map.prototype)) {
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    value: function <K, V>(this: Map<K, V>, key: K, computer: (key: K) => V): V {
      if (this.has(key)) {
        return this.get(key)!;
      }
      const value = computer(key);
      this.set(key, value);
      return value;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

if (typeof WeakMap !== 'undefined' && !('getOrInsertComputed' in WeakMap.prototype)) {
  Object.defineProperty(WeakMap.prototype, 'getOrInsertComputed', {
    value: function <K extends object, V>(this: WeakMap<K, V>, key: K, computer: (key: K) => V): V {
      if (this.has(key)) {
        return this.get(key)!;
      }
      const value = computer(key);
      this.set(key, value);
      return value;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

import App from './App.tsx';
import './index.css';

import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
