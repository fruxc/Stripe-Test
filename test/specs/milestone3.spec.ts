import { expect, test } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { fillCardDetails, lessonSignUp, submitForm, serverRequest, stripeRequest, FIVE_SECONDS, TYPE_DELAY, VALID_3DS, VALID_CARD, TWENTY_SECONDS } from '../helpers';

test.describe('Updating account details', () => {

  let customerId;
  let emailIdTest;
  let oldPaymentMethod;
  let newPaymentMethod;

  test('Should Load and Display the Account Details:5.1.1', async ({ page, request }) => {

    emailIdTest = faker.internet.email();

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), emailIdTest, VALID_CARD);

    // Wait for success
    await expect(page.locator('text=Woohoo! They are going to call you the shredder')).toBeVisible();

    customerId = await page.locator('#customer-id').textContent();

    oldPaymentMethod = await stripeRequest(request, 'GET', `customers/${customerId}/payment_methods?type=card`);

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await expect(page.locator('#billing-email')).not.toBeEmpty();

    const billingEmail = await page.locator('#billing-email').textContent();
    const cardExpMonth = await page.locator('#card-exp-month').textContent();
    const cardExpYear = await page.locator('#card-exp-year').textContent();
    const cardLast4 = await page.locator('#card-last4').textContent();
    await expect(billingEmail).toContain(emailIdTest);
    await expect(cardExpMonth).toContain('4');
    await expect(cardExpYear).toContain('2030');
    await expect(cardLast4).toContain('4242');

  });


  test('Should allow Customer to Update Card Data without filling Name and EmailId:5.1.3', async ({ page }) => {

    const newCardNumber = '5555 5555 5555 4444';
    const newLast4 = newCardNumber.slice(-4);

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');
    
    // Fill [placeholder="Card number"]
    await page.frameLocator('iframe').first().locator('[placeholder="Card number"]').type(newCardNumber, {delay: TYPE_DELAY});

    // Fill [placeholder="MM \/ YY"]
    await page.frameLocator('iframe').first().locator('[placeholder="MM \\/ YY"]').type('04 / 30', {delay: TYPE_DELAY});

    // Fill [placeholder="CVC"]
    await page.frameLocator('iframe').first().locator('[placeholder="CVC"]').type('242', {delay: TYPE_DELAY});

        // Fill [placeholder="ZIP"]
    await page.frameLocator('iframe').first().locator('[placeholder="ZIP"]').type('42424', {delay: TYPE_DELAY});

    // Click #submit
    await page.locator('#submit').click();

    await page.waitForSelector(`text=Card last 4: 4444`);
    const cardLast4 = await page.locator('#card-last4').textContent();

    await expect(cardLast4).toContain(newLast4);

  });

  test('Should not allow usage of existing Customer Email ID while Updating Account Info:5.1.4', async ({ page }) => {

    const email = faker.internet.email();

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), email, VALID_CARD);

    // Wait for success
    await expect(page.locator('text=Woohoo! They are going to call you the shredder')).toBeVisible();

    const customerId = await page.locator('#customer-id').textContent();

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');

    await expect(page.locator('[placeholder="Email"]')).not.toBeEmpty();

    // wait for Elements to be loaded
    await expect(page.frameLocator('iframe').first().locator('[placeholder="Card number"]')).toBeVisible();

    await page.locator('[placeholder="Email"]').click();
    await page.locator('[placeholder="Email"]').fill('');

    // Fill [placeholder="Name"]
    await page.locator('[placeholder="Email"]').type(emailIdTest, {delay: TYPE_DELAY});

    // Click #submit
    await page.locator('#submit').click();

    await page.waitForSelector('text=Customer email already exists!');
    await expect(page.locator('text=Customer email already exists!')).toBeVisible();

  });

  test('Should attach new Payment Method and Delete old one after Card Update:5.1.5', async ({ request }) => {

    newPaymentMethod = await stripeRequest(request, 'GET', `customers/${customerId}/payment_methods?type=card`);

    expect(newPaymentMethod.has_more).toBe(false)
    expect(newPaymentMethod.data[0].id !== oldPaymentMethod.data[0].id);
    expect(newPaymentMethod.data[0].card.brand !== oldPaymentMethod.data[0].card.brand);
    expect(newPaymentMethod.data[0].card.last4 !== oldPaymentMethod.data[0].card.last4);

  });

  test('Should show Error Message if Invalid Card is used while Updating Account Info:5.1.6', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    await expect(page.locator('#customer-id')).not.toBeEmpty();

    const customerId = await page.locator('#customer-id').textContent();

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');;
    await expect(page.locator('[placeholder="Email"]')).not.toBeEmpty();

    await fillCardDetails(page, '4000 0000 0000 0002');
    await submitForm(page);

    await expect(page.locator('text=Your card has been declined.')).toBeVisible({ timeout: FIVE_SECONDS });

  });

  test('Should show Error Message if Invalid 3DS Card is used while Updating Account Info:5.1.7', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    await expect(page.locator('#customer-id')).not.toBeEmpty();

    const customerId = await page.locator('#customer-id').textContent();

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');;
    await expect(page.locator('[placeholder="Email"]')).not.toBeEmpty();

    await fillCardDetails(page, VALID_3DS);
    await submitForm(page);

    await page.waitForResponse((res) => {
      return res.url().includes('https://stripe.com');
    }, { timeout: TWENTY_SECONDS });

    // Click text=Fail authentication
    await page.frame({name: 'acsFrame'})?.locator('text=Fail authentication').click();

    await expect(page.locator('text=We are unable to authenticate your payment method. Please choose a different payment method and try again.')).toBeVisible();

  });

  test('Should allow Customer to Successfully Update Payment after Card Decline:5.1.8', async ({ page }) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    await expect(page.locator('#customer-id')).not.toBeEmpty({ timeout: 2 * FIVE_SECONDS });

    const customerId = await page.locator('#customer-id').textContent();

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');;
    await expect(page.locator('[placeholder="Email"]')).not.toBeEmpty();

    await fillCardDetails(page, '4000 0000 0000 0002');
    await submitForm(page);

    await expect(page.locator('text=Your card has been declined.')).toBeVisible();

    await fillCardDetails(page, '5555 5555 5555 4444');
    await submitForm(page);

    await page.waitForSelector(`text=Card last 4: 4444`);
    const cardLast4 = await page.locator('#card-last4').textContent();
    await expect(cardLast4).toContain('4444');

  });

});

test.describe('Deleting customers', () => {

  let customerId;
  let scheduleLessonResponse;
  let deleteUncapturedCustomerResponse;

  test('Should not Delete Customers with Uncaptured Payments:5.2.2', async ({ page, request}) => {

    // Go to http://localhost:${process.env.PORT}/lessons
    await page.goto(`http://localhost:${process.env.PORT}/lessons`);

    // Click #first
    await page.locator('#first').click();

    await lessonSignUp(page, faker.name.findName(), faker.internet.email(), VALID_CARD);

    await expect(page.locator('#customer-id')).not.toBeEmpty();

    customerId = await page.locator('#customer-id').textContent();

    await page.goto(`http://localhost:${process.env.PORT}/account-update/${customerId}`);

    await page.waitForSelector('#submit');;
    await expect(page.locator('[placeholder="Email"]')).not.toBeEmpty();

    const data = {
      customer_id: customerId,
      amount: 123,
      description: 'Schedule Lesson Route API Test',
    }
    scheduleLessonResponse = await serverRequest(request, 'POST', 'schedule-lesson', data);

    deleteUncapturedCustomerResponse = await serverRequest(request, 'POST', `delete-account/${customerId}`);

    expect(deleteUncapturedCustomerResponse.deleted === undefined);
    expect(deleteUncapturedCustomerResponse.uncaptured_payments).toBeTruthy();

  });

  test('Should list Uncaptured Payments when Deleting Customers with Uncaptured Payments:5.2.3', () => {

    expect(deleteUncapturedCustomerResponse.uncaptured_payments).toBeTruthy();
    expect(deleteUncapturedCustomerResponse.uncaptured_payments[0]).toBe(scheduleLessonResponse.payment.id);

  });

  test('Should Delete Customers with Captured Payments:5.2.1', async ({ request }) => {

    const data = {
      payment_intent_id: scheduleLessonResponse.payment.id,
      amount: '123'
    }
    await serverRequest(request, 'POST', 'complete-lesson-payment', data);

    const response = await serverRequest(request, 'POST', `delete-account/${customerId}`);

    expect(response.deleted).toBe(true);

  });

});