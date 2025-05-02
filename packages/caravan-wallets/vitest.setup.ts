import { vi } from "vitest";


global.Buffer = Buffer
// vi.mock("@caravan/bitcoin", async () => {
//   const actual = await vi.importActual("@caravan/bitcoin");
//   return {
//     ...actual,
//     getPsbtVersionNumber: vi.fn().mockImplementation((psbt) => {
//       console.log("mocked getPsbtVersionNumber called with:", psbt);
//       return 2; 
//     }),
//   };
// });

// Mock bitcoinjs-lib-v6 to ensure initEccLib is called
vi.mock("bitcoinjs-lib-v6", async () => {
  const actual = await vi.importActual("bitcoinjs-lib-v6");
  return {
    ...actual,
    initEccLib: vi.fn(),
  };
});