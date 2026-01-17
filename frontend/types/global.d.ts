// Extend the Window interface to include baseAccountSDK
declare global {
  interface Window {
    baseAccountSDK?: {
      getProvider: () => any;
      // Add other methods from the SDK that you use
    };
  }
}

export {}; // This file needs to be a module
