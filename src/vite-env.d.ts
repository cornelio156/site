/// <reference types="vite/client" />

// Extend Window interface to include our env object
interface Window {
  env?: {
    [key: string]: string;
  };
}
