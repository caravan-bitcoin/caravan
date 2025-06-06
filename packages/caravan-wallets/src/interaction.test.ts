import {
  UNSUPPORTED,
  PENDING,
  ACTIVE,
  INFO,
  WARNING,
  ERROR,
  KeystoreInteraction,
  DirectKeystoreInteraction,
  UnsupportedInteraction,
  IndirectKeystoreInteraction,
} from "./interaction";

describe("KeystoreInteraction", () => {
  class TestKeystoreInteraction extends KeystoreInteraction {
    param;

    constructor({ param }) {
      super();
      this.param = param;
    }

    messages() {
      const messages: any = super.messages();
      messages.push({
        state: PENDING,
        level: WARNING,
        text: "First message",
        code: "alpha",
        param: this.param,
      });
      messages.push({
        state: ACTIVE,
        level: INFO,
        text: "Second message",
        code: "beta",
        param: this.param,
        version: "2.x",
      });
      return messages;
    }
  }

  const param = "foo";
  const interaction = new TestKeystoreInteraction({ param });

  it("has an environment", () => {
    expect(interaction.environment).toBeDefined();
  });

  it("isSupported", () => {
    expect(interaction.isSupported()).toBe(true);
  });

  it("can accept parameters through a constructor", () => {
    expect(interaction.param).toEqual(param);
  });

  describe("filtering messages", () => {
    it("requires at least one argument", () => {
      expect(() => {
        interaction.messagesFor((<unknown>null) as object);
      }).toThrow();
    });

    it("matches all messages when passed no known options", () => {
      expect(interaction.messagesFor({}).length).toEqual(2);
    });

    it("matches all messages when passed unknown options", () => {
      expect(
        interaction.messagesFor((<unknown>{ ding: "dong" }) as any).length,
      ).toEqual(2);
    });

    describe("by state", () => {
      it("can find matching messages", () => {
        expect(interaction.messagesFor({ state: PENDING }).length).toEqual(1);
      });

      it("returns an empty array if there are no matches", () => {
        expect(interaction.messagesFor({ state: UNSUPPORTED }).length).toEqual(
          0,
        );
      });
    });

    describe("by level", () => {
      it("can find matching messages", () => {
        expect(interaction.messagesFor({ level: INFO }).length).toEqual(1);
      });

      it("returns an empty array if there are no matches", () => {
        expect(interaction.messagesFor({ level: ERROR }).length).toEqual(0);
      });
    });

    describe("by text", () => {
      it("can find messages that are exact matches", () => {
        expect(interaction.messagesFor({ text: "First" }).length).toEqual(1);
      });

      it("can find messages that are partial matches", () => {
        expect(interaction.messagesFor({ text: "econ" }).length).toEqual(1);
      });

      it("can find messages via regular expression", () => {
        expect(interaction.messagesFor({ text: /ss+/ }).length).toEqual(2);
      });

      it("returns an empty array if there are no matches", () => {
        expect(interaction.messagesFor({ text: "third" }).length).toEqual(0);
      });
    });

    describe("by code", () => {
      it("can find messages that are exact matches", () => {
        expect(interaction.messagesFor({ code: "alpha" }).length).toEqual(1);
      });

      it("can find messages that are partial matches", () => {
        expect(interaction.messagesFor({ code: "lph" }).length).toEqual(1);
      });

      it("can find messages via regular expression", () => {
        expect(interaction.messagesFor({ code: /a$/ }).length).toEqual(2);
      });

      it("returns an empty array if there are no matches", () => {
        expect(interaction.messagesFor({ code: "gamma" }).length).toEqual(0);
      });
    });

    describe("by version", () => {
      it("can find messages that are exact matches", () => {
        expect(interaction.messagesFor({ version: "2.x" }).length).toEqual(1);
      });

      it("can find messages that are partial matches", () => {
        expect(interaction.messagesFor({ version: "2" }).length).toEqual(1);
      });

      it("can find messages via regular expression", () => {
        expect(interaction.messagesFor({ version: /^2/ }).length).toEqual(1);
      });

      it("returns an empty array if there are no matches", () => {
        expect(interaction.messagesFor({ version: "3" }).length).toEqual(0);
      });
    });

    describe("by multiple options", () => {
      it("can find matching messages", () => {
        expect(
          interaction.messagesFor({
            state: PENDING,
            level: WARNING,
          }).length,
        ).toEqual(1);
      });

      it("returns an empty array if there are no matches", () => {
        expect(
          interaction.messagesFor({
            state: PENDING,
            level: INFO,
          }).length,
        ).toEqual(0);
      });
    });
  });

  describe("hasMessagesFor", () => {
    it("returns true when more than one message matches", () => {
      expect(interaction.hasMessagesFor({ text: "message" })).toBe(true);
    });

    it("returns true when exactly one message matches", () => {
      expect(interaction.hasMessagesFor({ state: PENDING })).toBe(true);
    });

    it("returns false when no message matches", () => {
      expect(interaction.hasMessagesFor({ state: UNSUPPORTED })).toBe(false);
    });
  });

  describe("messageFor", () => {
    it("returns the first matching message", () => {
      expect(interaction.messageFor({ text: "message" })?.code).toEqual(
        "alpha",
      );
    });

    it("returns null if no message is found", () => {
      expect(interaction.messageFor({ state: UNSUPPORTED })).toBeNull();
    });
  });

  describe("messageTextFor", () => {
    it("returns the text of the first matching message", () => {
      expect(interaction.messageTextFor({ text: "message" })).toEqual(
        "First message",
      );
    });

    it("returns null if no message is found", () => {
      expect(interaction.messageTextFor({ state: UNSUPPORTED })).toBeNull();
    });
  });
});

describe("UnsupportedInteraction", () => {
  const text = "Unsupported interaction";
  const code = "alpha";
  const interaction = new UnsupportedInteraction({
    text,
    code,
  });

  it("is not supported", () => {
    expect(interaction.isSupported()).toBe(false);
  });

  it("has a message explaining why it is unsupported", () => {
    expect(
      interaction.hasMessagesFor({
        state: UNSUPPORTED,
        level: ERROR,
        code,
        text,
      }),
    ).toBe(true);
  });
});

describe("DirectKeystoreInteraction", () => {
  class TestDirectKeystoreInteraction extends DirectKeystoreInteraction {
    param;

    constructor({ param }) {
      super();
      this.param = param;
    }

    async run() {
      return this.param;
    }
  }

  const param = "foo";
  const interaction = new TestDirectKeystoreInteraction({ param });

  it("can accept parameters through a constructor", () => {
    expect(interaction.param).toEqual(param);
  });

  it("has an async `run` method", async () => {
    await expect(interaction.run()).resolves.toEqual(param);
  });

  it("throws an error if the `request` method is called", () => {
    expect(() => {
      interaction.request();
    }).toThrow();
  });

  it("throws an error if the `parse` method is called", () => {
    expect(() => {
      interaction.parse();
    }).toThrow();
  });
});

describe("IndirectKeystoreInteraction", () => {
  class TestIndirectKeystoreInteraction extends IndirectKeystoreInteraction {
    param;

    constructor({ param }) {
      super();
      this.param = param;
    }

    request() {
      return this.param;
    }

    parse(response) {
      return (response || "").toLowerCase();
    }
  }

  const param = "foo";
  const interaction = new TestIndirectKeystoreInteraction({ param });

  it("can accept parameters through a constructor", () => {
    expect(interaction.param).toEqual(param);
  });

  it("has a `request` method", () => {
    expect(interaction.request()).toEqual(param);
  });

  it("has a `parse` method", () => {
    expect(interaction.parse("BANG")).toEqual("bang");
  });

  it("throws an error if the `run` method is called", async () => {
    await expect(interaction.run()).rejects.toThrow();
  });
});
