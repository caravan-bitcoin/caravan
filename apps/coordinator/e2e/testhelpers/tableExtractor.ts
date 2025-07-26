import { Page } from "@playwright/test";
import { AddressTableData, receiveTableData, AddressUTXOData, UTXOInfo, SimpleUTXOSelectionResult } from "../utils/types";


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

/**
 * Simple UTXO extraction for testing - just gets basic info
 */
export async function extractUTXOData(page: Page): Promise<AddressUTXOData[]> {
  await page.waitForSelector("table");
  
  const addressData: AddressUTXOData[] = await page.evaluate(() => {
    const mainTableRows = Array.from(document.querySelectorAll("tbody tr"));

    return mainTableRows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      
      const pathSuffix = cells[1]?.textContent?.trim() || "";
      const balanceText = cells[3]?.textContent?.trim() || "0";
      const balance = parseFloat(balanceText) || 0;
      const address = cells[5]?.querySelector("code")?.textContent?.trim() || "";
      
      // Check if expanded
      const accordion = cells[5]?.querySelector(".MuiAccordion-root");
      const isExpanded = !accordion?.querySelector(".MuiCollapse-root")?.getAttribute("style")?.includes("min-height: 0px");
      
      // Extract UTXOs if expanded
      let utxos: UTXOInfo[] = [];
      if (isExpanded) {
        const utxoTable = accordion?.querySelector("table");
        if (utxoTable) {
          const utxoRows = Array.from(utxoTable.querySelectorAll("tbody tr"));
          utxos = utxoRows.map((utxoRow, utxoIndex) => {
            const utxoCells = Array.from(utxoRow.querySelectorAll("td"));
            
            const txid = utxoCells[2]?.querySelector("code")?.textContent?.trim() || "";
            const index = utxoCells[3]?.textContent?.trim() || "";
            const amountText = utxoCells[4]?.textContent?.trim() || "0";
            const amount = parseFloat(amountText) || 0;
            
            const utxoCheckbox = utxoCells[0]?.querySelector("input[type='checkbox']");
            const checkboxTestId = utxoCheckbox?.getAttribute("data-testid");
            const checkboxSelector = checkboxTestId ? 
              `[data-testid="${checkboxTestId}"]` : 
              `table tbody tr:nth-child(${utxoIndex + 1}) input[type="checkbox"]`;
            
            return { amount, checkboxSelector, txid, index };
          });
        }
      }
      
      return { pathSuffix, balance, address, utxos, isExpanded };
    });
  });
  
  return addressData;
}

/**
 * Simple function to expand an address row
 */
export async function expandAddress(page: Page, addressIndex: number): Promise<void> {
  const expandButton = page.locator(`tbody tr:nth-child(${addressIndex + 1}) .MuiAccordionSummary-root`);
  await expandButton.click();
  await page.waitForTimeout(500);
}

/**
 * Simple UTXO selection - just pick UTXOs until we have enough
 */
export async function selectUTXOsForAmount(page: Page, targetAmount: number): Promise<SimpleUTXOSelectionResult> {
  // First extract data
  let addressData = await extractUTXOData(page);
  
  // Expand addresses that aren't expanded but have balance
  for (let i = 0; i < addressData.length; i++) {
    const addr = addressData[i];
    if (!addr.isExpanded && addr.balance > 0) {
      console.log(`Expanding address ${addr.pathSuffix} to see UTXOs`);
      await expandAddress(page, i);
    }
  }
  
  // Re-extract after expansion
  addressData = await extractUTXOData(page);
  
  // Collect all UTXOs
  const allUTXOs: UTXOInfo[] = [];
  addressData.forEach(addr => {
    allUTXOs.push(...addr.utxos);
  });
  
  // Simple selection: just pick UTXOs until we have enough
  const selectedUTXOs: UTXOInfo[] = [];
  let totalAmount = 0;
  
  for (const utxo of allUTXOs) {
    selectedUTXOs.push(utxo);
    totalAmount += utxo.amount;
    
    if (totalAmount >= targetAmount) {
      break;
    }
  }
  
  if (totalAmount < targetAmount) {
    throw new Error(`Not enough UTXOs. Need ${targetAmount} BTC, only found ${totalAmount} BTC`);
  }
  
  // Check the selected UTXOs
  for (const utxo of selectedUTXOs) {
    console.log(`Selecting UTXO: ${utxo.amount} BTC`);
    await page.locator(utxo.checkboxSelector).check();
    await page.waitForTimeout(100);
  }
  
  console.log(`Selected ${selectedUTXOs.length} UTXOs totaling ${totalAmount} BTC for target ${targetAmount} BTC`);
  
  return { selectedUTXOs, totalAmount };
}

/**
 * Gets the current fee rate from the send form
 */
export async function getCurrentFeeRate(page: Page): Promise<number> {
  const feeRateInput = page.locator('input[name="fee_rate"][type=number]');
  const feeRateValue = await feeRateInput.inputValue();
  return parseFloat(feeRateValue) || 1;
} 