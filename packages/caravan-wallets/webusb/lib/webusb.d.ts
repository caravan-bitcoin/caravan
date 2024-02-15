/// <reference types="w3c-web-usb" />
export declare function requestLedgerDevice(): Promise<USBDevice>;
export declare function getLedgerDevices(): Promise<USBDevice[]>;
export declare function getFirstLedgerDevice(): Promise<USBDevice>;
export declare const isSupported: () => Promise<boolean>;
//# sourceMappingURL=webusb.d.ts.map