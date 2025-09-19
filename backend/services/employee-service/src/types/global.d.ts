declare const process: {
  env: Record<string, string | undefined>;
  version: string;
  uptime(): number;
  memoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage(): {
    user: number;
    system: number;
  };
  exit(code?: number): never;
};

declare const require: {
  main: any;
  (id: string): any;
};

declare const module: {
  exports: any;
};

declare const __dirname: string;

declare global {
  const process: typeof process;
  const require: typeof require;
  const module: typeof module;
  const __dirname: string;
  
  // Jest globals
  const jest: {
    setTimeout(timeout: number): void;
  };
  
  const beforeAll: (fn: () => void | Promise<void>) => void;
  const afterAll: (fn: () => void | Promise<void>) => void;
  const beforeEach: (fn: () => void | Promise<void>) => void;
  const afterEach: (fn: () => void | Promise<void>) => void;
  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void | Promise<void>) => void;
  const expect: any;
}

export {};
