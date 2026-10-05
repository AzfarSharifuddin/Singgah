interface Window {
  turnstile?: {
    render: (element: HTMLElement, options: Record<string, unknown>) => string;
    execute: (id: string) => void;
    reset: (id: string) => void;
    remove: (id: string) => void;
  };
}
