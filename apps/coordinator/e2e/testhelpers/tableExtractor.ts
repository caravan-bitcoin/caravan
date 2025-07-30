import { Page, expect } from "@playwright/test";
import {
  AddressTableData,
  receiveTableData,
} from "../utils/types";

/**
 * Extracts receive table data from the current page
 * Used in Receive tab where columns are: Index, Path Suffix, UTXOs, Balance, Address
 */
export async function extractReceiveTableData(
  page: Page,
): Promise<receiveTableData[]> {
  await page.waitForSelector("table");

  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    console.log("Extracting receive table rows:", rows.length);

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

/**
 * Extracts address table data from the current page
 * Used in Addresses tab where columns are: Index, Path Suffix, UTXOs, Balance, Last Used, Address
 */
export async function extractAddressTableData(
  page: Page,
): Promise<AddressTableData[]> {
  await page.waitForSelector("table");

  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    console.log("Extracting address table rows:", rows.length);

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
/**
 * Select UTXOs from the main table until target amount is reached.
 * @param page playwright page object.
 * @param targetAmount desired total balance to select.
 * @returns total value of the selected UTXOs.
 */

export async function selectUTXOs(page: Page, targetAmount: number) {
  const mainTable = page.getByTestId("main-utxo-table");
  await expect(mainTable).toBeVisible();

  // Locate all rows within the table using a "starts with" attribute selector
  const rows = mainTable.locator('[data-testid^="main-utxo-row-"]');

  let selectedUTXOValue = 0;

  for (const row of await rows.all()) {
    if(selectedUTXOValue >= targetAmount){
      // stop once the target is met
      break;
    }

    // Get balance 
    const balanceText = await row.locator("td").nth(3).textContent();
    const balance = parseFloat(balanceText?.trim()!);

    console.log("balance Check", balance);

    // Find and Check the checkbox to select this 
    const checkbox = row.locator('input[name="spend"][type="checkbox"]')
    // const checkbox = row.locator('[data-testid^="utxo-checkbox-"]')

    await page.waitForTimeout(2000)

    console.log("checkBox find: ", checkbox)
    
    if (await checkbox.isVisible() && !await checkbox.isDisabled()) {
      await checkbox.check();
      selectedUTXOValue += balance;
    }
    await page.waitForTimeout(2000)
    console.log("selectedUTXOval: ", selectedUTXOValue)
  }

  return { selectedUTXOValue };
}

/**
 * Gets the current address from the receive table (first row)
 */
export async function getCurrentReceiveAddress(page: Page): Promise<string> {
  const tableData = await extractReceiveTableData(page);
  if (tableData.length === 0) {
    throw new Error("No data found in receive table");
  }
  return tableData[0].address;
}

/**
 * Gets the current path suffix from the receive table (first row)
 */
export async function getCurrentPathSuffix(page: Page): Promise<string> {
  const tableData = await extractReceiveTableData(page);
  if (tableData.length === 0) {
    throw new Error("No data found in receive table");
  }
  return tableData[0].pathSuffix;
}

/**
 * Gets the current fee rate from the send form
 */
export async function getCurrentFeeRate(page: Page): Promise<number> {
  const feeRateInput = page.locator('input[name="fee_rate"][type=number]');
  const feeRateValue = await feeRateInput.inputValue();
  return parseFloat(feeRateValue) || 1;
}
