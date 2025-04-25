export interface DeviceError extends Error {
  message: string;
}

// This is currently only used in bcur.ts
export interface Summary {
  success: boolean;
  current: number;
  length: number;
}
