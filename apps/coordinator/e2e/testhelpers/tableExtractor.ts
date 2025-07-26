import { Page } from "@playwright/test";
import { AddressTableData, receiveTableData } from "../utils/types";

type TableData = receiveTableData | AddressTableData;

/**
 * Generic function to extract table data with configurable row mapping
 */
async function extractTableData<T extends TableData>(
  page: Page,
  tableSelector: string,
  rowMapper: (cells: Element[]) => T
): Promise<T[]> {
  await page.waitForSelector(tableSelector);
  
  const rawData = await page.evaluate((selector) => {
    const rows = Array.from(document.querySelectorAll(`${selector} tbody tr`));
    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      return cells.map(cell => ({
        textContent: cell.textContent?.trim() || "",
        codeContent: cell.querySelector("code")?.textContent?.trim() || ""
      }));
    });
  }, tableSelector);
  
  return rawData.map(rowCells => rowMapper(rowCells as any));
}

// Row mapper for receive table data
const receiveTableRowMapper = (cells: any[]): receiveTableData => ({
  pathSuffix: cells[1]?.textContent || "",
  utxos: cells[2]?.textContent || "",
  balance: cells[3]?.textContent || "",
  address: cells[4]?.codeContent || "",
});

// Row mapper for address table data  
const addressTableRowMapper = (cells: any[]): AddressTableData => ({
  pathSuffix: cells[1]?.textContent || "",
  utxos: cells[2]?.textContent || "",
  balance: cells[3]?.textContent || "",
  lastUsed: cells[4]?.textContent || "",
  address: cells[5]?.codeContent || "",
});

/**
 * Extracts receive table data from the current page
 * Used in Receive tab where columns are: Index, Path Suffix, UTXOs, Balance, Address
 */
export async function extractReceiveTableData(page: Page): Promise<receiveTableData[]> {
  return extractTableData(page, "table", receiveTableRowMapper);
}

/**
 * Extracts address table data from the current page  
 * Used in Addresses tab where columns are: Index, Path Suffix, UTXOs, Balance, Last Used, Address
 */
export async function extractAddressTableData(page: Page): Promise<AddressTableData[]> {
  return extractTableData(page, "table", addressTableRowMapper);
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