import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock scrollTo and scrollIntoView
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

// Mock pointer capture and PointerEvent for Radix UI
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};

if (typeof window.PointerEvent === "undefined") {
  class MockPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 0;
      this.pointerType = params.pointerType || "mouse";
    }
  }
  window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
}

// Mock crypto for test environment (JSDOM doesn't provide crypto.subtle)
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
  });
} else if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: () => "00000000-0000-0000-0000-000000000000",
  });
}

// Mock AbortSignal and AbortController for vitest/jsdom
if (typeof globalThis.AbortSignal === "undefined") {
  globalThis.AbortSignal = class AbortSignal {
    aborted = false;
    reason: any = undefined;
    onabort: (() => void) | null = null;
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false; }
    throwIfAborted() {}
  } as any;
}

if (typeof globalThis.AbortController === "undefined") {
  globalThis.AbortController = class AbortController {
    signal = new (globalThis.AbortSignal as any)();
    abort(reason?: any) {
      this.signal.aborted = true;
      this.signal.reason = reason;
      if (this.signal.onabort) this.signal.onabort();
    }
  } as any;
}

// Mock sessionStorage and localStorage for tests
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

Object.defineProperty(window, "sessionStorage", {
  value: createStorageMock(),
  writable: true,
});

Object.defineProperty(window, "localStorage", {
  value: createStorageMock(),
  writable: true,
});

// Mock Supabase client for unit tests
const mockSupabaseFrom = (table: string) => ({
  select: (columns?: string, options?: any) => {
    if (options?.head) {
      return Promise.resolve({ data: [], error: null, count: 0 });
    }
    return {
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
      then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
    };
  },
  insert: (values: any) => ({
    select: () => ({
      single: () => Promise.resolve({ data: values, error: null }),
      then: (resolve: any) => resolve({ data: [values], error: null }),
    }),
  }),
  update: (values: any) => ({
    eq: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: values, error: null }),
      }),
    }),
  }),
  delete: () => ({
    eq: () => Promise.resolve({ error: null }),
  }),
  upsert: (values: any) => ({
    select: () => ({
      single: () => Promise.resolve({ data: values, error: null }),
      then: (resolve: any) => resolve({ data: [values], error: null }),
    }),
  }),
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: { id: "mock-user" } }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  },
  isSupabaseConfigured: () => true,
  SUPABASE_URL: "https://mock.supabase.co",
  checkSupabaseHealth: () => Promise.resolve({
    connected: true,
    latencyMs: 10,
    tables: {},
  }),
  KNOWN_TABLES: [],
}));

