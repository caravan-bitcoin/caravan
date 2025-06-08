import {test,expect } from '@playwright/test'
import bitcoinClient from '../utils/bitcoinClient'

const client = bitcoinClient();

test("testing title", async ({page})=>{
    const res = await client?.getBlockchainInfo();

    console.log("res",res)

})