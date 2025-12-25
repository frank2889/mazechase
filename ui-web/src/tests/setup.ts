/**
 * Vitest global test setup
 */

import { vi } from 'vitest';

// Mock performance.now for timing tests
if (typeof performance === 'undefined') {
    (global as any).performance = {
        now: vi.fn(() => Date.now()),
    };
}

// Mock requestAnimationFrame for frame timing tests
if (typeof requestAnimationFrame === 'undefined') {
    (global as any).requestAnimationFrame = vi.fn((callback: () => void) => {
        return setTimeout(callback, 16);
    });
}

if (typeof cancelAnimationFrame === 'undefined') {
    (global as any).cancelAnimationFrame = vi.fn((id: number) => {
        clearTimeout(id);
    });
}

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock WebSocket
class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly CONNECTING = MockWebSocket.CONNECTING;
    readonly OPEN = MockWebSocket.OPEN;
    readonly CLOSING = MockWebSocket.CLOSING;
    readonly CLOSED = MockWebSocket.CLOSED;

    readyState = MockWebSocket.CONNECTING;
    binaryType: BinaryType = 'blob';
    bufferedAmount = 0;
    extensions = '';
    protocol = '';
    url = '';

    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor(url: string | URL, protocols?: string | string[]) {
        this.url = url.toString();
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
                this.onopen(new Event('open'));
            }
        }, 0);
    }

    close(code?: number, reason?: string): void {
        this.readyState = MockWebSocket.CLOSED;
        if (this.onclose) {
            this.onclose(new CloseEvent('close', { code, reason }));
        }
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        // Mock send - do nothing
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        // Mock event listener
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        // Mock remove event listener
    }

    dispatchEvent(event: Event): boolean {
        return true;
    }
}

(global as any).WebSocket = MockWebSocket;

// Mock ResizeObserver
class MockResizeObserver {
    constructor(callback: ResizeObserverCallback) {}
    observe(target: Element): void {}
    unobserve(target: Element): void {}
    disconnect(): void {}
}

(global as any).ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {}
    observe(target: Element): void {}
    unobserve(target: Element): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
}

(global as any).IntersectionObserver = MockIntersectionObserver;

// Mock Audio
class MockAudio {
    src = '';
    volume = 1;
    loop = false;
    muted = false;
    paused = true;
    currentTime = 0;
    duration = 0;

    play(): Promise<void> {
        this.paused = false;
        return Promise.resolve();
    }

    pause(): void {
        this.paused = true;
    }

    load(): void {}

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {}
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {}
}

(global as any).Audio = MockAudio;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Console warning/error tracking for test debugging
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
    vi.clearAllMocks();
});

export { localStorageMock, MockWebSocket, MockAudio };
