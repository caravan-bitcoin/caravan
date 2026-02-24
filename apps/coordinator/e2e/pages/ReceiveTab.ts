/**
 * Page Object: Receive tab.
 */
import { Page } from "@playwright/test";
import { receiveTableData } from "../state/types";

export class ReceiveTab {
  constructor(private page: Page) {}

  /**
   * Polls the DOM until a table cell has non-empty content.
   *
   * waitForFunction (browser context) instead of expect.poll (Node):
   * We're doing a pure DOM check — reading cell.textContent. This
   * runs faster in the browser than round-tripping through Node's
   * evaluate() on each poll iteration.
   *
   * @param cellIndex — 0-based <td> index to check
   * @param contentSelector — optional sub-selector (e.g. "code")
   */
  private async waitForTableDataReady(
    cellIndex: number,
    contentSelector?: string,
  ) {
    await this.page.waitForSelector("table tbody tr", { timeout: 10000 });

    await this.page.waitForFunction(
      (args: { idx: number; selector: string | undefined }) => {
        const firstRow = document.querySelector("tbody tr");
        if (!firstRow) return false;

        const cells = firstRow.querySelectorAll("td");
        if (!cells || cells.length <= args.idx) return false;

        const cell = cells[args.idx];
        if (!cell) return false;

        const target = args.selector ? cell.querySelector(args.selector) : cell;
        const text = target?.textContent?.trim();
        return !!text && text.length > 0;
      },
      { idx: cellIndex, selector: contentSelector },
      { timeout: 15000 },
    );
  }

  /**
   * Extracts all rows from the receive table.
   * Columns: Index(0) | PathSuffix(1) | UTXOs(2) | Balance(3) | Address(4)
   */
  async extractTableData(): Promise<receiveTableData[]> {
    await this.waitForTableDataReady(4, "code");

    return await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        return {
          pathSuffix: cells[1]?.textContent?.trim() || "",
          utxos: cells[2]?.textContent?.trim() || "",
          balance: cells[3]?.textContent?.trim() || "",
          address: cells[4]?.querySelector("code")?.textContent?.trim() || "",
        };
      });
    });
  }

  async getCurrentAddress(): Promise<string> {
    const tableData = await this.extractTableData();

    if (tableData.length === 0) {
      throw new Error(
        "ReceiveTab.getCurrentAddress: no rows in receive table.",
      );
    }

    const address = tableData[0].address;

    if (!address) {
      throw new Error(
        "ReceiveTab.getCurrentAddress: first row has empty address. " +
          "Data may not have finished loading despite wait.",
      );
    }

    if (!/^(2[MN]|bcrt1)/.test(address)) {
      throw new Error(
        `ReceiveTab.getCurrentAddress: unexpected format "${address}". ` +
          "Expected regtest address starting with 2M, 2N, or bcrt1.",
      );
    }

    return address;
  }

  async getCurrentPathSuffix(): Promise<string> {
    await this.waitForTableDataReady(1);
    return await this.page.evaluate(() => {
      const row = document.querySelector("tbody tr");
      return row?.querySelector("td:nth-child(2)")?.textContent?.trim() || "";
    });
  }

  /**
   * Clicks "Next Address" and waits for the address to change.
   *
   * The wait checks THREE conditions (not just "different"):
   *   1. newAddr exists (not null)
   *   2. newAddr !== prevAddr (actually changed)
   *   3. newAddr.length > 10 (has real content, not partial render)
   */
  async goToNextAddress(currentAddress: string) {
    await this.page
      .locator("button[type=button]:has-text('Next Address')")
      .click();

    await this.page.waitForFunction(
      (prevAddr: string) => {
        const el = document.querySelector("tbody tr td:nth-child(5) code");
        const newAddr = el?.textContent?.trim();
        return !!newAddr && newAddr !== prevAddr && newAddr.length > 10;
      },
      currentAddress,
      { timeout: 10000 },
    );
  }

  /**
   * Collects N sequential addresses.
   */
  async collectAddresses(count: number): Promise<string[]> {
    const addresses: string[] = [];

    for (let i = 0; i < count; i++) {
      const addr = await this.getCurrentAddress();
      addresses.push(addr);

      if (i < count - 1) {
        await this.goToNextAddress(addr);
      }
    }

    return addresses;
  }
}
