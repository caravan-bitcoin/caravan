import { Page } from "@playwright/test";
import { AddressTableData, receiveTableData } from "../utils/types";



/**
 * Extracts receive table data from the current page
 * Used in Receive tab where columns are: Index, Path Suffix, UTXOs, Balance, Address
 */
export async function extractReceiveTableData(page: Page): Promise<receiveTableData[]> {
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
export async function extractAddressTableData(page: Page): Promise<AddressTableData[]> {
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