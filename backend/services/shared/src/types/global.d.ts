declare const process: {
  env: Record<string, string | undefined>;
};

declare global {
  const process: {
    env: Record<string, string | undefined>;
  };
}

export {};
