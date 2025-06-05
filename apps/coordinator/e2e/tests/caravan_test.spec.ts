import {test,expect } from '@playwright/test'


test("testing title", async ({page})=>{
    await page.goto("/")

    console.log("url", page.url())

})