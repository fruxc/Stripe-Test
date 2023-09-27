import { chromium, expect, test } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { lessonSignUp, serverRequest, stripeRequest, TYPE_DELAY, VALID_CARD, TWENTY_SECONDS, FIVE_SECONDS } from '../helpers';

test.describe('Lesson signup form', () => {

  let elementsLoaded = false;

  test('Should not find any Invalid/Hardcoded PubKey in the BeforeAll Hook Check:3.0', async ({ page, request }) => {

    const pubKey = await serverRequest(request, 'GET', 'config', undefined, 2500);

    expect(pubKey.key.includes('pk_test')).toBe(true);

  });

  test('Should load Stripe Elements:3.7', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);
  
    // Click #first
    await page.locator('#first').click();
  
    // Stripe JS should exist
    await expect(page.frame('iframe[src*="https://js.stripe.com/"]')).toBeDefined();

    // CardElement should be visible
    await expect(page.frameLocator('iframe').first().locator('[placeholder="Card number"]')).toBeVisible();
    elementsLoaded = true;
  });

  test('Should allow user to change Lesson Time after Elements is shown:3.9', async ({ page }) => {
  
    const currDate = new Date();
    currDate.setDate(currDate.getDate() + 9);

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);
  
    // Click #first
    await page.locator('#first').click();
  
    const firstSummaryTable = await page.locator('#summary-table').textContent({timeout:1000});
    await expect(firstSummaryTable).toContain(currDate.toLocaleString('default', { day: '2-digit'}));
  
    // Stripe JS should exist
    await expect(page.frameLocator('iframe').first().locator('[placeholder="Card number"]')).toBeVisible();

    currDate.setDate(currDate.getDate() + 5);

    // Click #second
    await page.locator('#second').click();
  
    const secondSummaryTable = await page.locator('#summary-table').textContent();
    await expect(secondSummaryTable).toContain(currDate.toLocaleString('default', { day: '2-digit'}));
  
  });


  test('Should collect necessary Inputs from User:3.10', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    // Get Stripe iframe
    await expect(page.locator('.__PrivateStripeElement')).toBeVisible({timeout: 2500});

  });

  test('Should have Email and Name as Mandatory Fields:3.11', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    // Make sure button is disabled
    await expect(page.locator('#submit')).toBeDisabled({timeout: 1000});

    // Click [placeholder="Name"]
    await page.locator('[placeholder="Name"]').click();

    // Fill [placeholder="Name"]
    await page.locator('[placeholder="Name"]').type(faker.name.findName(), {delay: TYPE_DELAY});

    // Make sure button is disabled
    await expect(page.locator('#submit')).toBeDisabled();

    // Press Tab
    await page.locator('[placeholder="Name"]').press('Tab');

    // Fill [placeholder="Email"]
    await page.locator('[placeholder="Email"]').type(faker.internet.email(), {delay: TYPE_DELAY});

    // Make sure button is disabled
    await expect(page.locator('#submit')).toBeDisabled();

    // Press Tab
    await page.locator('[placeholder="Email"]').press('Tab');

    // Make sure Elements are loaded before trying to use them
    await expect(elementsLoaded).toBeTruthy();

    // Fill [placeholder="Card number"]
    await page.frameLocator('iframe').first().locator('[placeholder="Card number"]').type(VALID_CARD, {delay: TYPE_DELAY});

    // Fill [placeholder="MM \/ YY"]
    await page.frameLocator('iframe').first().locator('[placeholder="MM \\/ YY"]').type('04 / 30', {delay: TYPE_DELAY});

    // Fill [placeholder="CVC"]
    await page.frameLocator('iframe').first().locator('[placeholder="CVC"]').type('242', {delay: TYPE_DELAY});

      // Fill [placeholder="ZIP"]
    await page.frameLocator('iframe').first().locator('[placeholder="ZIP"]').type('42424', {delay: TYPE_DELAY});

    // Make sure button is enabled
    await expect(page.locator('#submit')).toBeEnabled();

  });

});

test.describe('Using different test cards', () => {

  // Using this boolean to automatically bail out of tests if the
  // baseline "schedule lesson" functionality isn't behaving
  let scheduleLessonWorking = false;

  test('Should disable the Request Lesson Button while Payment Intents are created/used:3.12', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    // Make sure spinner is disabled
    await expect(page.locator('#spinner.spinner')).toBeVisible();
    await expect(page.locator('#spinner.spinner')).toBeDisabled();

  });

  test('Should schedule a Lesson using a non 3DS Card:3.21', async ({ page, request }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    // Expect success
    await expect(page.locator('text=Woohoo! They are going to call you the shredder')).toBeVisible();

    scheduleLessonWorking = true;

  });

  test('Should schedule a Lesson using a 3DS Card:3.22', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), '4000 0027 6000 3184');

    await page.waitForResponse((res) => {
      return res.url().includes('https://stripe.com');
    }, { timeout: 6 * FIVE_SECONDS });

    // Click text=Complete authentication
    await page.frame({name: 'acsFrame'})?.locator('text=Complete authentication').click();

    // Expect success
    await expect(page.locator('text=Woohoo! They are going to call you the shredder')).toBeVisible();
  
  });

  test('Should show Last 4 Card Digits after Successful Payment:3.23', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    await expect(page.locator('#spinner.spinner')).not.toBeVisible();

    const last4 = await page.locator('#last4').textContent();
    await expect(last4).toBe('4242');

  });

  test('Should not allow Customer to use same Email Twice for Lesson Registration:3.24', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    const email = faker.internet.email();

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), email, VALID_CARD);

    await page.locator('text=Sign up again under a different email address').click();

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), email, VALID_CARD);

    await expect(page.locator('text=A customer with that email address already exists. If you\'d like to update the c')).toBeVisible();

  });

  test('Should Display Card Declined Error Message when Invalid Card is used:3.25', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    const email = faker.internet.email();

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), email, '4000 0000 0000 0002');

    // Click text=Your card has been declined.
    await expect(page.locator('text=Your card has been declined.')).toBeVisible();

  });

  test('Should Display Card Declined Error Message when Invalid 3DS Card is used:3.26', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), '4000 0027 6000 3184');

    await page.waitForResponse((res) => {
      return res.url().includes('https://stripe.com');
    }, { timeout: TWENTY_SECONDS });

    // Click text=Fail authentication
    await page.frame({ name: 'acsFrame' })?.locator('text=Fail authentication').click();

    // Click text=We are unable to authenticate your payment method. Please choose a different pay
    await page.locator('text=We are unable to authenticate your payment method. Please choose a different pay').click();

  });

  test('Should allow Customer to Successfully Update and Make a Payment after Card Decline:3.27', async ({ page }) => {

    test.skip(!scheduleLessonWorking, "If success card fails, other cards won't work either")

    const email = faker.internet.email();

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), email, '4000 0000 0000 0002');

    // Click text=Your card has been declined.
    await expect(page.locator('text=Your card has been declined.')).toBeVisible();

    // Fill [placeholder="Card number"]
    await page.frameLocator('iframe').first().locator('[placeholder="Card number"]').type(VALID_CARD, {delay: TYPE_DELAY});

    // Fill [placeholder="MM \/ YY"]
    await page.frameLocator('iframe').first().locator('[placeholder="MM \\/ YY"]').type('04 / 30', {delay: TYPE_DELAY});

    // Fill [placeholder="CVC"]
    await page.frameLocator('iframe').first().locator('[placeholder="CVC"]').type('242', {delay: TYPE_DELAY});

      // Fill [placeholder="ZIP"]
    await page.frameLocator('iframe').first().locator('[placeholder="ZIP"]').type('42424', {delay: TYPE_DELAY});

    // Click #submit
    await page.locator('#submit').click();

    // Expect success
    await expect(page.locator('text=Woohoo! They are going to call you the shredder')).toBeVisible();

  });

});

test.describe('Validating saved card and customer', () => {

  const name = faker.name.findName();
  const email = faker.internet.email();

  let customerResponse;
  let paymentMethodResponse;

  test.beforeAll(async ({ request }) => {

    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, name, email, VALID_CARD);

    await expect(page.locator('#spinner.spinner')).not.toBeVisible();

    const customerId = await page.locator('#customer-id').textContent();

    customerResponse = await stripeRequest(request, 'GET', `customers/${customerId}`)
    paymentMethodResponse = await stripeRequest(request, 'GET', `customers/${customerId}/payment_methods?type=card`)

    browser.close();

  });

  test('Should attach only one Payment Method per Customer:3.28', async () => {

    expect(paymentMethodResponse.has_more).toBe(false);

  }); 

  test('Should set Name and Email on both the Customer and the Payment Method Objects:3.29', () => {

    expect(customerResponse.name).toBeTruthy()
    expect(customerResponse.email).toBeTruthy();
    expect(customerResponse.name).toBe(name);
    expect(customerResponse.email).toBe(email);

    expect(paymentMethodResponse.data[0].billing_details.name).toBeTruthy();
    expect(paymentMethodResponse.data[0].billing_details.email).toBeTruthy();
    expect(paymentMethodResponse.data[0].billing_details.name).toBe(name);
    expect(paymentMethodResponse.data[0].billing_details.email).toBe(email);

  });

  test('Should add the Metadata about the First Lesson to the Customer Object:3.30', () => {
      
    const currDate = new Date();
    currDate.setDate(currDate.getDate() + 9);

    const lessonDateMonth = `${currDate.toLocaleString('default', { day: '2-digit'})} ${currDate.toLocaleString('default', { month: 'short'})}`;

    expect(customerResponse.metadata.first_lesson).toBeTruthy();
    expect(customerResponse.metadata.first_lesson).toContain(lessonDateMonth);

  });

});