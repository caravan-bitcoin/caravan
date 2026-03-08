/**
 * Page Object: Addresses tab.
 */
import { Page } from "@playwright/test";
import { AddressTableData } from "../state/types";

export class AddressesTab {
  constructor(private page: Page) {}

  async extractTableData(): Promise<AddressTableData[]> {
    await this.page.waitForSelector("table tbody tr", { timeout: 10000 });

    // Wait for address data in column 5 (the 6th column)
    await this.page.waitForFunction(
      () => {
        const firstRow = document.querySelector("tbody tr");
        if (!firstRow) return false;
        const cells = firstRow.querySelectorAll("td");
        if (cells.length < 6) return false;
        const code = cells[5]?.querySelector("code");
        return !!code?.textContent?.trim();
      },
      { timeout: 15000 },
    );

    return await this.page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows.map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        return {
          pathSuffix: cells[1]?.textContent?.trim() || "",
          utxos: cells[2]?.textContent?.trim() || "",
          balance: cells[3]?.textContent?.trim() || "",
          lastUsed: cells[4]?.textContent?.trim() || "",
          address: cells[5]?.querySelector("code")?.textContent?.trim() || "",
        };
      });
    });
  }
}
