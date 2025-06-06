/**
 * This module provides base classes for modeling interactions with
 * keystores.
 *
 * It also defines several constants used throughout the API for
 * categorizing messages.
 *
 * Integrations with new wallets should begin by creating a base class
 * for that wallet by subclassing either `DirectKeystoreInteraction`
 * or `IndirectKeystoreInteraction`.
 */

import { signatureNoSighashType } from "@caravan/bitcoin";
import Bowser from "bowser";

/**
 * Constant representing a keystore which is unsupported due to the
 * kind of interaction or combination of paramters provided.
 */
export const UNSUPPORTED = "unsupported";

/**
 * Constant representing a keystore pending activation by the user.
 */
export const PENDING = "pending";

/**
 * Constant representing a keystore in active use.
 */
export const ACTIVE = "active";

/**
 * Constant for messages at the "info" level.
 */
export const INFO = "info";

/**
 * Constant for messages at the "warning" level.
 */
export const WARNING = "warning";

/**
 * Constant for messages at the "error" level.
 */
export const ERROR = "error";

/**
 * Enumeration of possible keystore states ([PENDING]{@link module:interaction.PENDING}|[ACTIVE]{@link module:interaction.ACTIVE}|[UNSUPPORTED]{@link module:interaction.UNSUPPORTED}).
 *
 */
export const STATES = [PENDING, ACTIVE, UNSUPPORTED];

/**
 * Enumeration of possible message levels ([INFO]{@link module:interaction.INFO}|[WARNING]{@link module:interaction.WARNING}|[ERROR]{@link module:interaction.ERROR}).
 */
export const LEVELS = [INFO, WARNING, ERROR];

/**
 * Represents a message returned by an interaction.
 *
 * Message objects may have additional properties.
 */
export type Message = {
  state?: typeof STATES extends readonly (infer ElementType)[]
    ? ElementType
    : never;
  level?: string;
  code?: string;
  text?: string;
  version?: string;
  action?: string;
  image?: MessageImage;
  messages?: Message[];
  preProcessingTime?: number;
  postProcessingTime?: number;
};

/**
 * Represents an image in a message returned by an interaction.
 */
type MessageImage = { label: string; mimeType: string; data: string };

type MessageMethodArgs = {
  state?: Message["state"];
  level?: Message["level"];
  code?: Message["code"] | RegExp;
  text?: Message["text"] | RegExp;
  version?: Message["version"] | RegExp;
};

type FormatType = "buffer" | "hex";
type FormatReturnType<T extends FormatType> = T extends "buffer"
  ? Buffer
  : string;

/**
 * Abstract base class for all keystore interactions.
 *
 * Concrete subclasses will want to subclass either
 * `DirectKeystoreInteraction` or `IndirectKeystoreInteraction`.
 *
 * Defines an API for subclasses to leverage and extend.
 *
 * - Subclasses should not have any internal state.  External tools
 *   (UI frameworks such as React) will maintain state and pass it
 *   into the interaction in order to display properly.
 *
 * - Subclasses may override the default constructor in order to allow
 *   users to pass in parameters.
 *
 * - Subclasses should override the `messages` method to customize
 *   what messages are surfaced in applications at what state of the
 *   user interface.
 *
 * - Subclasses should not try to catch all errors, instead letting
 *   them bubble up the stack.  This allows UI developers to deal with
 *   them as appropriate.
 *
 * @example
 * import {KeystoreInteraction, PENDING, ACTIVE, INFO} from "@caravan/wallets";
 * class DoNothingInteraction extends KeystoreInteraction {
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   messages() {
 *     const messages = super.messages()
 *     messages.push({state: PENDING, level: INFO, text: `Interaction pending: ${this.param}` code: "pending"});
 *     messages.push({state: ACTIVE, level: INFO, text: `Interaction active: ${this.param}` code: "active"});
 *     return messages;
 *   }
 *
 * }
 *
 * // usage
 * const interaction = new DoNothingInteraction({param: "foo"});
 * console.log(interaction.messageTextFor({state: ACTIVE})); // "Interaction active: foo"
 * console.log(interaction.messageTextFor({state: PENDING})); // "Interaction pending: foo"
 *
 */
export class KeystoreInteraction {
  environment: Bowser.Parser.Parser;

  /**
   * Base constructor.
   *
   * Subclasses will often override this constructor to accept options.
   *
   * Just make sure to call `super()` if you do that!
   */
  constructor() {
    this.environment = Bowser.getParser(window.navigator.userAgent);
  }

  /**
   * Subclasses can override this method to indicate they are not
   * supported.
   *
   * This method has access to whatever options may have been passed
   * in by the constructor as well as the ability to interact with
   * `this.environment` to determine whether the functionality is
   * supported.  See the Bowser documentation for more details:
   * https://github.com/lancedikson/bowser
   *
   * @example
   * isSupported() {
   *   return this.environment.satisfies({
   *     * declare browsers per OS
   *     windows: {
   *       "internet explorer": ">10",
   *     },
   *     macos: {
   *       safari: ">10.1"
   *     },
   *
   *     * per platform (mobile, desktop or tablet)
   *     mobile: {
   *       safari: '>=9',
   *       'android browser': '>3.10'
   *     },
   *
   *     * or in general
   *     chrome: "~20.1.1432",
   *     firefox: ">31",
   *     opera: ">=22",
   *
   *     * also supports equality operator
   *     chrome: "=20.1.1432", * will match particular build only
   *
   *     * and loose-equality operator
   *     chrome: "~20",        * will match any 20.* sub-version
   *     chrome: "~20.1"       * will match any 20.1.* sub-version (20.1.19 as well as 20.1.12.42-alpha.1)
   *   });
   * }
   */
  isSupported() {
    return true;
  }

  /**
   * Return messages array for this interaction.
   *
   * The messages array is a (possibly empty) array of `Message` objects.
   *
   * Subclasses should override this method and add messages as
   * needed.  Make sure to call `super.messages()` to return an empty
   * messages array for you to begin populating.
   */
  messages() {
    const messages: Message[] = [];
    return messages;
  }

  /**
   * Return messages filtered by the given options.
   *
   * Multiple options can be given at once to filter along multiple
   * dimensions.
   *
   * @example
   * import {PENDING, ACTIVE} from "@caravan/bitcoin";
   * // Create any interaction instance
   * interaction.messages().forEach(msg => console.log(msg));
   *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
   *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
   *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   * interaction.messagesFor({state: PENDING}).forEach(msg => console.log(msg));
   *   { code: "device.connect", state: "pending", level: "info", text: "Please plug in your device."}
   * interaction.messagesFor({code: ACTIVE}).forEach(msg => console.log(msg));
   *   { code: "device.active", state: "active", level: "info", text: "Communicating with your device..."}
   *   { code: "device.active.warning", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   * interaction.messagesFor({version: /^2/}).forEach(msg => console.log(msg));
   *   { code: "device.active", state: "active", level: "warning", text: "Your device will warn you about...", version: "2.x"}
   */
  messagesFor({ state, level, code, text, version }: MessageMethodArgs) {
    return this.messages().filter((message) => {
      if (state && message.state !== state) {
        return false;
      }
      if (level && message.level !== level) {
        return false;
      }
      if (code && !(message.code || "").match(code)) {
        return false;
      }
      if (text && !(message.text || "").match(text)) {
        return false;
      }
      if (version && !(message.version || "").match(version)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Return whether there are any messages matching the given options.
   */
  hasMessagesFor({ state, level, code, text, version }: MessageMethodArgs) {
    return (
      this.messagesFor({
        state,
        level,
        code,
        text,
        version,
      }).length > 0
    );
  }

  /**
   * Return the first message matching the given options (or `null` if none is found).
   */
  messageFor({ state, level, code, text, version }: MessageMethodArgs) {
    const messages = this.messagesFor({
      state,
      level,
      code,
      text,
      version,
    });
    if (messages.length > 0) {
      return messages[0];
    }
    return null;
  }

  /**
   * Retrieve the text of the first message matching the given options
   * (or `null` if none is found).
   */
  messageTextFor({ state, level, code, text, version }: MessageMethodArgs) {
    const message = this.messageFor({
      state,
      level,
      code,
      text,
      version,
    });
    return message?.text ?? null;
  }
}

/**
 * Class used for describing an unsupported interaction.
 *
 * - Always returns `false` when the `isSupported` method is called.
 *
 * - Has a keystore state `unsupported` message at the `error` level.
 *
 * - Throws errors when attempting to call API methods such as `run`,
 *   `request`, and `parse`.
 *
 * @example
 * import {UnsupportedInteraction} from "@caravan/wallets";
 * const interaction = new UnsupportedInteraction({text: "failure text", code: "fail"});
 * console.log(interaction.isSupported()); // false
 *
 */
export class UnsupportedInteraction extends KeystoreInteraction {
  text: string;

  code: string;

  /**
   * Accepts parameters to describe what is unsupported and why.
   *
   * The `text` should be human-readable.  The `code` is for machines.
   */
  constructor({ text, code }: { text: string; code: string }) {
    super();
    this.text = text;
    this.code = code;
  }

  /**
   * By design, this method always returns false.
   */
  isSupported() {
    return false;
  }

  /**
   * Returns a single `error` level message at the `unsupported`
   * state.
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: UNSUPPORTED,
      level: ERROR,
      code: this.code,
      text: this.text,
    });
    return messages;
  }

  /**
   * Throws an error.
   *
   */
  async run(): Promise<any> {
    throw new Error(this.text);
  }

  /**
   * Throws an error.
   *
   */
  request() {
    throw new Error(this.text);
  }

  /**
   * Throws an error.
   *
   */
  parse() {
    throw new Error(this.text);
  }
}

/**
 * Base class for direct keystore interactions.
 *
 * Subclasses *must* implement a `run` method which communicates
 * directly with the keystore.  This method must be asynchronous
 * (return a `Promise`) to accommodate delays with network, devices,
 * &c.
 *
 * @example
 * import {DirectKeystoreInteraction} from "@caravan/wallets";
 * class SimpleDirectInteraction extends DirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   async run() {
 *     // Or do something complicated...
 *     return this.param;
 *   }
 * }
 *
 * const interaction = new SimpleDirectInteraction({param: "foo"});
 *
 * const result = await interaction.run();
 * console.log(result);
 * // "foo"
 *
 */
export class DirectKeystoreInteraction extends KeystoreInteraction {
  direct: boolean;

  /**
   * Sets the `this.direct` property to `true`.  This property can be
   * utilized when introspecting on interaction classes..
   *
   * @constructor
   */
  constructor() {
    super();
    this.direct = true;
  }

  /**
   * Initiate the intended interaction and return a result.
   *
   * Subclasses *must* override this function.  This function must
   * always return a promise as it is designed to be called within an
   * `await` block.
   */
  async run(): Promise<void | boolean> {
    throw new Error("Override the `run` method in this interaction.");
  }

  /**
   * Throws an error.
   */
  request() {
    throw new Error(
      "This interaction is direct and does not support a `request` method.",
    );
  }

  /**
   * Throws an error.
   */
  parse() {
    throw new Error(
      "This interaction is direct and does not support a `parse` method.",
    );
  }

  signatureFormatter<T extends FormatType = "hex">(
    inputSignature: string,
    format: T = "hex" as T,
  ) {
    // Ledger signatures include the SIGHASH byte (0x01) if signing for P2SH-P2WSH or P2WSH ...
    // but NOT for P2SH ... This function should always return the signature with SIGHASH byte appended.
    // While we don't anticipate Trezor making firmware changes to include SIGHASH bytes with signatures,
    // We'll go ahead and make sure that we're not double adding the SIGHASH
    // byte in case they do in the future.

    const signatureWithSigHashByte = `${signatureNoSighashType(
      inputSignature,
    )}01`;
    if (format === "buffer") {
      return Buffer.from(
        signatureWithSigHashByte,
        "hex",
      ) as FormatReturnType<T>;
    } else {
      return signatureWithSigHashByte as FormatReturnType<T>;
    }
  }

  parseSignature<T extends FormatType = "hex">(
    transactionSignature: string[],
    format: T = "hex" as T,
  ) {
    return (transactionSignature || []).map((inputSignature) =>
      this.signatureFormatter(inputSignature, format),
    ) as FormatReturnType<T>[];
  }
}

/**
 * Base class for indirect keystore interactions.
 *
 * Subclasses *must* implement two methods: `request` and `parse`.
 * Application code will pass the result of calling `request` to some
 * external process (HTTP request, QR code, &c.) and pass the response
 * to `parse` which should return a result.
 *
 * @example
 * import {IndirectKeystoreInteraction} from "@caravan/wallets";
 * class SimpleIndirectInteraction extends IndirectKeystoreInteraction {   *
 *
 *   constructor({param}) {
 *     super();
 *     this.param = param;
 *   }
 *
 *   request() {
 *     // Construct the data to be passed to the keystore...
 *     return this.param;
 *   }
 *
 *   parse(response) {
 *     // Parse data returned from the keystore...
 *     return response;
 *   }
 *
 * }
 *
 * const interaction = new SimpleIndirectInteraction({param: "foo"});
 *
 * const request = interaction.request();
 * const response = "bar"; // Or do something complicated with `request`
 * const result = interaction.parse(response);
 * console.log(result);
 * // "bar"
 *
 */
export class IndirectKeystoreInteraction extends KeystoreInteraction {
  indirect: boolean;

  workflow: string[];

  /**
   * Sets the `this.indirect` property to `true`.  This property can
   * be utilized when introspecting on interaction classes.
   *
   * The `this.workflow` property is an array containing one or both
   * of the strings `request` and/or `parse`.  Their presence and
   * order indicates to calling applications whether they are
   * necessary and in which order they should be run.
   */
  constructor() {
    super();
    this.indirect = true;
    this.workflow = ["parse"];
  }

  /**
   * Provide the request.
   *
   * Subclasses *may* override this function.  It can return any kind
   * of object.  Strings, data for QR codes, HTTP requests, command
   * lines, functions, &c. are all allowed.  Whatever is appropriate
   * for the interaction.
   *
   */
  request() {
    throw new Error("Override the `request` method in this interaction.");
  }

  /**
   * Parse the response into a result.
   *
   * Subclasses *must* override this function.  It must accept an
   * appropriate kind of `response` object and return the final result
   * of this interaction.
   *
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parse(response: Record<string, unknown> | string) {
    throw new Error("Override the `parse` method in this interaction.");
  }

  /**
   * Throws an error.
   */
  async run() {
    throw new Error(
      "This interaction is indirect and does not support a `run` method.",
    );
  }
}
