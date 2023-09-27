import { Page } from '@playwright/test';
import { TYPE_DELAY } from "./constants";

export const lessonSignUp = async (page:Page, name, email, card) => {
    
    await fillPersonalDetails(page, name, email);

    await fillCardDetails(page, card);

    return await submitForm(page);
    
}

export const fillPersonalDetails = async (page:Page, name, email) => {

    // Fill [placeholder="Name"]
    await page.locator('[placeholder="Name"]').type(name);

    // Fill [placeholder="Email"]
    return await page.locator('[placeholder="Email"]').type(email);

}

export const fillCardDetails = async (page:Page, card) => {

    // Fill [placeholder="Card number"]
    await page.frameLocator('iframe').first().locator('[placeholder="Card number"]').type(card, {delay: TYPE_DELAY, timeout: 1500});

    // Fill [placeholder="MM \/ YY"]
    await page.frameLocator('iframe').first().locator('[placeholder="MM \\/ YY"]').type('04 / 30', {delay: TYPE_DELAY});

    // Fill [placeholder="CVC"]
    await page.frameLocator('iframe').first().locator('[placeholder="CVC"]').type('242', {delay: TYPE_DELAY});

    // Fill [placeholder="ZIP"]
    return await page.frameLocator('iframe').first().locator('[placeholder="ZIP"]').type('42424', {delay: TYPE_DELAY});

}

export const submitForm = async (page:Page) => {

    return await page.locator('#submit').click({timeout:1000});

}