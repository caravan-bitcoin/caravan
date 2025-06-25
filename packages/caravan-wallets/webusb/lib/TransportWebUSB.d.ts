/// <reference types="w3c-web-usb" />
/// <reference types="node" />
import Transport from "@ledgerhq/hw-transport";
import type { Observer, DescriptorEvent, Subscription } from "@ledgerhq/hw-transport";
import type { DeviceModel } from "@ledgerhq/devices";
import { getLedgerDevices } from "./webusb";
/**
 * WebUSB Transport implementation
 * @example
 * import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
 * ...
 * TransportWebUSB.create().then(transport => ...)
 */
export default class TransportWebUSB extends Transport {
    device: USBDevice;
    deviceModel: DeviceModel | null | undefined;
    channel: number;
    packetSize: number;
    interfaceNumber: number;
    constructor(device: USBDevice, interfaceNumber: number);
    /**
     * Check if WebUSB transport is supported.
     */
    static isSupported: () => Promise<boolean>;
    /**
     * List the WebUSB devices that was previously authorized by the user.
     */
    static list: typeof getLedgerDevices;
    /**
     * Actively listen to WebUSB devices and emit ONE device
     * that was either accepted before, if not it will trigger the native permission UI.
     *
     * Important: it must be called in the context of a UI click!
     */
    static listen: (observer: Observer<DescriptorEvent<USBDevice>>) => Subscription;
    /**
     * Similar to create() except it will always display the device permission (even if some devices are already accepted).
     */
    static request(): Promise<TransportWebUSB>;
    /**
     * Similar to create() except it will never display the device permission (it returns a Promise<?Transport>, null if it fails to find a device).
     */
    static openConnected(): Promise<TransportWebUSB | null>;
    /**
     * Create a Ledger transport with a USBDevice
     */
    static open(device: USBDevice): Promise<TransportWebUSB>;
    _disconnectEmitted: boolean;
    _emitDisconnect: (e: Error) => void;
    /**
     * Release the transport device
     */
    close(): Promise<void>;
    /**
     * Exchange with the device using APDU protocol.
     * @param apdu
     * @returns a promise of apdu response
     */
    exchange(apdu: Buffer): Promise<Buffer>;
    setScrambleKey(): void;
}
//# sourceMappingURL=TransportWebUSB.d.ts.map