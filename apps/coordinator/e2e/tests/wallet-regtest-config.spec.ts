//things to do here
//1. get that downloaded file
//2. parse it, get the wallet file from process.env and 
// fill the fingerprint and the path for each one
// then after updating, go on that pg wallet page, 
// then click on import config and connect there
// get the address

import {test,expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { error } from "console";

test.describe("Wallet Regtest Configuration",() => {
    const downloadFile = process.env.DOWNLOADED_WALLET_FILE;
    const testFile: any;


    test.beforeAll(()=>{
        if(!fs.existsSync(downloadFile!)){
            throw new Error("Downloaded Config JSON file not found.")
        }

        testFile = JSON.parse(fs.readFileSync(downloadFile!, "utf-8"));

        console.log("Test File imported from download file")
    })

    test("Modify wallet configuration for regtest and missing fingerprint & path", async()=>{
        try {

            console.log('Starting wallet config modification');
            console.log("testfile",testFile)
            
        } catch (error) {
            console.log("error",error)
        }

    })


})