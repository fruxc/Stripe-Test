/* eslint-disable no-console */
const express = require("express");

const app = express();
const { resolve } = require("path");
// Replace if using a different env file or config
require("dotenv").config({ path: "./.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const allItems = {};

// const MIN_ITEMS_FOR_DISCOUNT = 2;
app.use(express.static(process.env.STATIC_DIR));

app.use(
  express.json({
    // Should use middleware or a function to compute it only when
    // hitting the Stripe webhook endpoint.
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);
app.use(cors({ origin: true }));

// load config file
const fs = require("fs");

const configFile = fs.readFileSync("../config.json");
const config = JSON.parse(configFile);

// load items file for video courses
const file = require("../items.json");

file.forEach((item) => {
  const initializedItem = item;
  initializedItem.selected = false;
  allItems[item.itemId] = initializedItem;
});

// const asyncMiddleware = fn => (req, res, next) => {
//   Promise.resolve(fn(req, res, next)).catch(next);
// };

const ordinal_suffix_of = async (month, d) => {
  const i = d < 10 ? parseInt(d.replace("0", "")) : d;
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return `${month} ${i}st`;
  }
  if (j == 2 && k != 12) {
    return `${month} ${i}nd`;
  }
  if (j == 3 && k != 13) {
    return `${month} ${i}rd`;
  }
  return `${month} ${i}th`;
};

app.post("/webhook", async (req, res) => {
  const event = req.body;
  if (event.type.includes("charge.")) {
    const charge = await stripe.charges.update(event.data.object.id, {
      metadata: event.data.object.metadata,
    });
  }
  if (event.type === "charge.captured") {
    console.log(event.data.object);
    console.log("charge captured");
  }
  res.json({ msg: event });
});

// Routes
app.get("/", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/index.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

// Fetch the Stripe publishable key
//
// Example call:
// curl -X GET http://localhost:4242/config \
//
// Returns: a JSON response of the publishable key
//   {
//        key: <STRIPE_PUBLISHABLE_KEY>
//   }
app.get("/config", (req, res) => {
  return res.json({
    key: process.env.STRIPE_PUBLISHABLE_KEY,
    status: 200,
    success: true,
  });
});

app.get("/concert", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/concert.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/setup-concert-page", (req, res) => {
  res.send({
    basePrice: config.checkout_base_price,
    currency: config.checkout_currency,
  });
});

// Show success page, after user buy concert tickets
app.get("/concert-success", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/concert-success.html`);
    console.log(path);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/videos", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/videos.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

app.get("/setup-video-page", (req, res) => {
  res.send({
    discountFactor: config.video_discount_factor,
    minItemsForDiscount: config.video_min_items_for_discount,
    items: allItems,
  });
});

// Milestone 1: Signing up
// Shows the lesson sign up page.
app.get("/lessons", (req, res) => {
  try {
    const path = resolve(`${process.env.STATIC_DIR}/lessons.html`);
    if (!fs.existsSync(path)) throw Error();
    res.sendFile(path);
  } catch (error) {
    const path = resolve("./public/static-file-error.html");
    res.sendFile(path);
  }
});

// post method for lesson sign up
app.post("/lessons", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name;
    const email = body.email;
    const paymentMethodId = body.paymentMethodId;
    const lessonData = body.lessonData;
    const metadataCustomer = {
      first_lesson: JSON.stringify({
        lessonDate: lessonData.date,
        time: lessonData.time,
      }),
    };
    const cardData = body.cardData;
    let customer = {};
    const customerExist = await stripe.customers.list({
      email: `${email}`,
    });
    if (customerExist.data.length > 0) {
      customer = customerExist.data[0];
      // const paymentMethodsExisted = await stripe.customers.listPaymentMethods(
      //   customer.id,
      //   {type: 'card'}
      // );
      // const paymentMethodDetach = await stripe.paymentMethods.detach(
      //   paymentMethodsExisted.data[0].id
      // );
    } else {
      customer = await stripe.customers.create({
        name: name,
        email: email,
        metadata: metadataCustomer,
        payment_method: paymentMethodId,
      });
    }

    //attach payment method
    // const paymentMethod = await stripe.paymentMethods.attach(
    //   paymentMethodId,
    //   {customer:customer.id}
    // );

    //update payment method
    // const paymentMethods = await stripe.customers.listPaymentMethods(
    //   customer.id,
    //   {type: 'card',limit:1}
    // );
    // const paymentMethodUpdate = await stripe.paymentMethods.update(
    //   paymentMethods.data[0].id,
    //   {billing_details: {name: null,email: null}}
    // );

    // const paymentMethodUpdateOld = await stripe.paymentMethods.update(
    //   paymentMethodId,
    //   {billing_details: {name: null,email: null,}}
    // );

    //console.log('payment update',paymentMethodUpdate)
    //console.log('old payment ',paymentMethodUpdateOld)

    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: [cardData.type],
      payment_method: paymentMethodId,
      customer: customer.id,
      // confirm: true,
      payment_method_options: { card: { request_three_d_secure: "automatic" } },
    });
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: 1000,
    //   currency: "usd",
    //   // payment_method_types: ["card"],
    //   // confirm:true,
    //   payment_method: paymentMethodId,
    //   // confirmation_method:'automatic',
    //   // payment_method_options: { card: { request_three_d_secure: "automatic" } },
    //   metadata: {
    //     name: name,
    //   },
    //   customer: customer.id,
    //   description: "test payment",
    //   // shipping: {
    //   //   address: {
    //   //     line1: "",
    //   //     postal_code: "",
    //   //     city: "",
    //   //     state: "",
    //   //     country: "",
    //   //   },
    //   //   name: name,
    //   // },
    //   capture_method:"manual",
    //   confirm: true,
    // });
    const updatedCustomer = await stripe.customers.update(customer.id, {
      metadata: { setupIntentId: setupIntent.id },
      //invoice_settings:{default_payment_method:paymentMethod.id},
    });
    res.json({
      data: {
        ...updatedCustomer,
        card: cardData,
        setupIntent: setupIntent,
        payment_intent: "",
      },
      status: 200,
      success: true,
      error: "",
    });
  } catch (error) {
    const msg = error.message.includes("Your card was declined.")
      ? "Your card has been declined."
      : error.message;
    res.json({ data: error, status: 200, success: false, error: msg });
  }
});

//create sample charge
app.get("/getKey", async (req, res) => {
  return res.json({
    data: process.env.STRIPE_PUBLISHABLE_KEY,
    status: 200,
    success: true,
  });
});

// Milestone 2: '/schedule-lesson'
// Authorize a payment for a lesson
//
// Parameters:
// customer_id: id of the customer
// amount: amount of the lesson in cents
// description: a description of this lesson
//
// Example call:
// curl -X POST http://localhost:4242/schdeule-lesson \
//  -d customer_id=cus_GlY8vzEaWTFmps \
//  -d amount=4500 \
//  -d description='Lesson on Feb 25th'
//
// Returns: a JSON response of one of the following forms:
// For a successful payment, return the Payment Intent:
//   {
//        payment: <payment_intent>
//    }
//
// For errors:
//  {
//    error:
//       code: the code returned from the Stripe error if there was one
//       message: the message returned from the Stripe error. if no payment method was
//         found for that customer return an msg 'no payment methods found for <customer_id>'
//    payment_intent_id: if a payment intent was created but not successfully authorized
// }
app.post("/schedule-lesson", async (req, res) => {
  const body = req.body;
  const customer_id = body.customer_id;
  const amount = body.amount ? body.amount : 0;
  const description = body.description;
  try {
    const customer = await stripe.customers.retrieve(customer_id);
    let splittedLesson = JSON.parse(
      customer.metadata.first_lesson
    ).lessonDate.split(" ");
    let payment_description = await ordinal_suffix_of(
      splittedLesson[1],
      splittedLesson[0]
    );

    const paymentMethods = await stripe.customers.listPaymentMethods(
      customer.id,
      { type: "card" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      confirm: true,
      payment_method_types: ["card"],
      payment_method: paymentMethods.data[0].id,
      capture_method: "manual",
      customer: customer.id,
      description: `Lesson on ${payment_description}`,
      metadata: { type: "lessons-payment" },
    });
    // const paymentIntentConfirm = await stripe.paymentIntents.confirm(
    //   paymentIntent.id,
    //   { payment_method: paymentMethods.data[0].id }
    // );
    // console.log(paymentIntentConfirm);
    // let paymentIntentCapture = {};
    // if (amount) {
    //   paymentIntentCapture = await stripe.paymentIntents.capture(
    //     paymentIntent.id,
    //     { amount_to_capture: amount }
    //   );
    // } else {
    //   paymentIntentCapture = await stripe.paymentIntents.capture(
    //     paymentIntent.id,
    //     { amount_to_capture: 123 }
    //   );
    // }
    // console.log(paymentIntentCapture);

    const lessonDate = splittedLesson[0].replace(/\D/g, "");
    const d = new Date();
    const paymentDate = d.getDate();
    let paymentIntentCapture;
    let charged = false;
    if (lessonDate === paymentDate) {
      paymentIntentCapture = await stripe.paymentIntents.charge(
        paymentIntent.id,
        {
          amount_to_capture: amount,
        }
      );
      charged = true;
    } else if (lessonDate - 2 === paymentDate) {
      paymentIntentCapture = await stripe.paymentIntents.charge(
        paymentIntent.id,
        {
          amount_to_capture: amount / 2,
        }
      );
      charged = true;
    } else {
      charged = false;
    }
    let data = [{ captured: charged }];
    paymentIntent.charges = { data };
    res.json({ payment: paymentIntent, success: true });
  } catch (error) {
    console.log(error.message);
    res.status(400);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

// Milestone 2: '/complete-lesson-payment'
// Capture a payment for a lesson.
//
// Parameters:
// amount: (optional) amount to capture if different than the original amount authorized
//
// Example call:
// curl -X POST http://localhost:4242/complete_lesson_payment \
//  -d payment_intent_id=pi_XXX \
//  -d amount=4500
//
// Returns: a JSON response of one of the following forms:
//
// For a successful payment, return the payment intent:
//   {
//        payment: <payment_intent>
//    }
//
// for errors:
//  {
//    error:
//       code: the code returned from the error
//       message: the message returned from the error from Stripe
// }
//
app.post("/complete-lesson-payment", async (req, res) => {
  const body = req.body;
  const payment_intent_id = body.payment_intent_id;
  const amount = body.amount ? body.amount : 0;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );
    const paymentIntentCapture = await stripe.paymentIntents.capture(
      paymentIntent.id,
      { amount_to_capture: amount }
    );
    //const deleted = await stripe.customers.del(paymentIntentCapture.customer);
    let charged = true;
    let data = [{ captured: charged }];
    paymentIntentCapture.charges = { data };
    setTimeout(() => {
      res.json({ payment: paymentIntentCapture, success: true });
    }, 6000);
  } catch (error) {
    console.log(error.message);
    res.status(400);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

// Milestone 2: '/refund-lesson'
// Refunds a lesson payment.  Refund the payment from the customer (or cancel the auth
// if a payment hasn't occurred).
// Sets the refund reason to 'requested_by_customer'
//
// Parameters:
// payment_intent_id: the payment intent to refund
// amount: (optional) amount to refund if different than the original payment
//
// Example call:
// curl -X POST http://localhost:4242/refund-lesson \
//   -d payment_intent_id=pi_XXX \
//   -d amount=2500
//
// Returns
// If the refund is successfully created returns a JSON response of the format:
//
// {
//   refund: refund.id
// }
//
// If there was an error:
//  {
//    error: {
//        code: e.error.code,
//        message: e.error.message
//      }
//  }
app.post("/refund-lesson", async (req, res) => {
  const body = req.body;
  const payment_intent_id = body.payment_intent_id;
  const amount = body.amount ? body.amount : 0;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment_intent_id
    );
    const amountRefund =
      paymentIntent?.charges?.data[0]?.amount_captured !== amount ? amount : 0;
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: amount,
    });
    res.json({ refund: refund.id });
  } catch (error) {
    res.status(400);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

app.get("/refunds/:refundId", async (req, res) => {
  const refundId = req.params.refundId;
  try {
    const refundDetails = await stripe.refunds.retrieve(refundId);
    res.json({ refundDetails });
  } catch (error) {
    res.status(400);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

const allPromises = async (promises) => {
  return Promise.all(promises).then((data) => {
    return data.every((d) => (Object.keys(d).length > 0 ? true : false));
  });
};

app.post("/email-exist", async (req, res) => {
  try {
    const body = req.body;
    const customerId = body.customerId;
    const email = body.email;
    const customer = await stripe.customers.search({
      query: `email:\'${email}\'`,
    });
    // console.log(customer)
    if (Object.keys(customer).length > 0) {
      const exist = customer.data.filter((c) => c.id !== customerId);
      // console.log(exist)
      res.json({ data: exist.length, status: 200, success: true, error: "" });
    } else {
      res.json({
        data: 0,
        status: 200,
        success: false,
        error: "something wrong in query",
      });
    }
  } catch (error) {
    res.json({
      data: error,
      status: 200,
      success: false,
      error: error.message,
    });
  }
});

app.get("/currentUser/:customer_id", async (req, res) => {
  const customerId = req.params.customer_id;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    console.log(customerId, customer);
    const card = await stripe.customers.listPaymentMethods(customerId, {
      type: "card",
    });
    customer.card = card?.data[0];
    res.json({
      data: customer,
      status: 200,
      success: true,
      error: "",
    });
  } catch (error) {
    console.log(error);
    const msg = error.message.includes("Your card was declined.")
      ? "Your card has been declined."
      : error.message;
    res.json({ data: error, status: 200, success: false, error: msg });
  }
});
app.post("/account-update/:customer_id", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name;
    const email = body.email;
    const paymentMethodId = body.paymentMethodId;
    const cardData = body.cardData;
    const customerId = req.params.customer_id;
    console.log(req.params);

    const customer = await stripe.customers.retrieve(customerId);

    if (cardData && paymentMethodId) {
      const paymentMethods = await stripe.customers.listPaymentMethods(
        customer.id,
        { type: "card" }
      );

      const promiseArr = [];
      if (paymentMethods.data.length > 0) {
        paymentMethods.data.forEach((pd) =>
          promiseArr.push(stripe.paymentMethods.detach(pd.id))
        );
      }

      const allDetachMethod = await allPromises(promiseArr);

      if (allDetachMethod) {
        const paymentMethod = await stripe.paymentMethods.attach(
          paymentMethodId,
          { customer: customer.id }
        );

        const setupIntent = await stripe.setupIntents.create({
          payment_method_types: [cardData.type],
          payment_method: paymentMethod.id,
          customer: customer.id,
          confirm: true,
          payment_method_options: {
            card: { request_three_d_secure: "automatic" },
          },
        });

        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000,
          currency: "usd",
          payment_method: paymentMethod.id,
          metadata: {
            name: name,
          },
          customer: customer.id,
          description: "test payment",
        });

        const updatedCustomer = await stripe.customers.update(customer.id, {
          email: email,
          metadata: { setupIntentId: setupIntent.id },
        });

        res.json({
          data: {
            ...updatedCustomer,
            card: cardData,
            setupIntent: setupIntent,
            payment_intent: paymentIntent,
            paymentMethod,
          },
          status: 200,
          success: true,
          error: "",
        });
      } else {
        res.json({
          data: "",
          status: 200,
          success: false,
          error: "unable to detach",
        });
      }
    } else {
      const updatedCustomer = await stripe.customers.update(customer.id, {
        email: email,
        name: name,
      });
      res.json({
        data: {
          ...updatedCustomer,
        },
        status: 200,
        success: true,
        error: "",
      });
    }

    // const paymentMethod = await stripe.paymentMethods.detach(
    //   'pm_1LybuyCA2fYGLWY3d6E0G5qt'
    // );
  } catch (error) {
    console.log(error);
    const msg = error.message.includes("Your card was declined.")
      ? "Your card has been declined."
      : error.message;
    res.json({ data: error, status: 200, success: false, error: msg });
  }
});

// Milestone 3: Managing account info
// Displays the account update page for a given customer
app.get("/account-update/:customer_id", async (req, res) => {
  try {
    const customerId = req.params.customer_id;
    const customer = await stripe.customers.retrieve(customerId);
    const paymentMethods = await stripe.customers.listPaymentMethods(
      customer.id,
      { type: "card" }
    );

    res.json({
      data: paymentMethods,
      status: 200,
      success: true,
      error: "",
    });
  } catch (error) {
    console.log(error);
    const msg = error.message.includes("Your card was declined.")
      ? "Your card has been declined."
      : error.message;
    res.json({ data: error, status: 200, success: false, error: msg });
  }
});

app.post("/update-payment-intent", async (req, res) => {
  const body = req.body;
  const paymentIntentId = body.paymentIntentId;
  const customerId = body.customerId;
  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      customer: customerId,
    });
    res.json({ payment: paymentIntent, success: true });
  } catch (error) {
    res.json({ error: { code: error.code, message: error.message } });
  }
});

// Milestone 3: '/delete-account'
// Deletes a customer object if there are no uncaptured payment intents for them.
//
// Parameters:
//   customer_id: the id of the customer to delete
//
// Example request
//   curl -X POST http://localhost:4242/delete-account/:customer_id \
//
// Returns 1 of 3 responses:
// If the customer had no uncaptured charges and was successfully deleted returns the response:
//   {
//        deleted: true
//   }
//
// If the customer had uncaptured payment intents, return a list of the payment intent ids:
//   {
//     uncaptured_payments: ids of any uncaptured payment intents
//   }
//
// If there was an error:
//  {
//    error: {
//        code: e.error.code,
//        message: e.error.message
//      }
//  }
//

async function retrieveUncapturedIds(payment, idArr) {
  if (payment.length > 0) {
    payment.forEach((p) => idArr.push(p));
    return idArr;
  } else {
    return idArr;
  }
}

async function load_captured_payments(created_time, result_arr, page = 0) {
  try {
    const searchQuery = {
      limit: 100,
      query: `created>=${created_time} AND metadata[\'type\']:\'lessons-payment\'`,
    };
    if (page) {
      searchQuery.page = page;
    }
    const paymentIntent = await stripe.paymentIntents.search(searchQuery);
    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_captured_payments(
        created_time,
        result_arr,
        paymentIntent.next_page
        //paymentIntent.data.slice(-1)[0].id
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

const check_completed_all_payments = async (payments) => {
  const total_payments_count = payments.length;
  const success_count =
    payments.length > 0 ? payments.filter((p) => p.captured).length : 0;
  const uncaptured_payment =
    payments.length > 0
      ? payments.filter((p) => !p.captured).map((t) => t.payment_intent)
      : [];
  const resp = {
    uncaptured_payment_list: uncaptured_payment,
    is_all_payment_completed:
      success_count === total_payments_count ? true : false,
  };
  return resp;
};

async function load_uncaptured_charges(customer, result_arr, page = 0) {
  try {
    const searchQuery = {
      customer: customer,
      limit: 100,
    };
    if (page) {
      searchQuery.starting_after = page;
    }
    const paymentIntent = await stripe.charges.list(searchQuery);
    // console.log(paymentIntent)
    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_uncaptured_charges(
        customer,
        result_arr,
        paymentIntent.data.slice(-1)[0].id
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    return [];
  }
}

app.post("/delete-account/:customer_id", async (req, res) => {
  const customerId = req.params.customer_id;
  try {
    // const paymentIntent = await stripe.paymentIntents.search({
    //   query: `status:\'requires_capture\' AND customer:\'${customerId}\'`,
    // });
    const charges = await load_uncaptured_charges(customerId, []);
    // const charges=await stripe.charges.list({customer:customerId,
    //   limit: 1,})
    // res.json({charges:charges})
    // const paymentUIds = await load_uncaptured_payments(customerId, []);
    const paymentList = await check_completed_all_payments(charges);
    if (!paymentList.is_all_payment_completed) {
      res.json({ uncaptured_payments: paymentList.uncaptured_payment_list });
    } else {
      const customer = await stripe.customers.retrieve(customerId);
      const deleted = await stripe.customers.del(customer.id);
      res.json({ deleted: deleted.deleted });
    }
  } catch (error) {
    console.log(error);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

// Milestone 4: '/calculate-lesson-total'
// Returns the total amounts for payments for lessons, ignoring payments
// for videos and concert tickets.
//
// Example call: curl -X GET http://localhost:4242/calculate-lesson-total
//
// Returns a JSON response of the format:
// {
//      payment_total: total before fees and refunds (including disputes), and excluding payments
//         that haven't yet been captured.
//         This should be equivalent to net + fee totals.
//      fee_total: total amount in fees that the store has paid to Stripe
//      net_total: net amount the store has earned from the payments.
// }
//

async function processChargeAmounts(
  charges,
  allPayments,
  latestAmount = 0,
  fee
) {
  const total_lesson_amount = charges
    .filter((c) => c.status === "succeeded" && c.captured)
    .reduce((n, { amount }) => n + amount, 0);
  const latest_uncaptured = charges
    .filter((c) => (c.status = "succeeded" && !c.captured))
    .reduce((n, { amount }) => n + amount, 0);
  const total_lesson_captured_amount = charges
    .filter((c) => c.status === "succeeded" && !c.captured)
    .reduce((n, { amount }) => n + amount, 0);
  const total_intent_amount_received = allPayments
    .filter((c) => c.status === "requires_capture")
    .reduce((n, { amount }) => n + amount, 0);
  const total_stripe_fee = charges
    .filter((c) => c.captured)
    .filter((a) => a.application_fee_amount != null)
    .reduce((n, { application_fee_amount }) => n + application_fee_amount, 0);
  const full_refund_amount = allPayments
    .filter((p) => p.charges.data.length > 0 && p.charges.data[0].refunded)
    .reduce((n, { charges }) => n + charges.data[0].amount_refunded, 0);
  console.log(
    total_lesson_amount,
    full_refund_amount,
    total_intent_amount_received,
    total_lesson_captured_amount,
    latest_uncaptured
  );
  const p_total =
    total_lesson_amount +
    full_refund_amount +
    latestAmount +
    full_refund_amount -
    total_stripe_fee;
  const net_total = p_total - total_stripe_fee;
  const obj = {
    payment_total: p_total,
    fee_total: fee,
    net_total: net_total + fee,
  };
  console.log("pppp", latestAmount, obj);
  return obj;
}

async function refund_wrapper(charges) {
  const arr = [];
  for (let i = 0; i < charges.length; i++) {
    arr.push(await load_all_refund(charges[i].id, []));
  }
  return Promise.all(arr)
    .then((resp) => resp)
    .catch((error) => {
      console.log(error.message);
      return [];
    });
}

async function load_all_refund(charge_id, result_arr, page = 0) {
  try {
    const searchQuery = {
      //charge:charge_id,
      payment_intent: charge_id,
      limit: 100,
    };
    if (page) {
      searchQuery.starting_after = page;
    }
    const paymentIntent = await stripe.refunds.list(searchQuery);
    //console.log(paymentIntent)
    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_all_refund(
        charge_id,
        result_arr,
        paymentIntent.data.slice(-1)[0].id
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function load_all_charges(creationDate, result_arr, page = 0) {
  try {
    const searchQuery = {
      query: `created>=${creationDate} AND metadata[\'type\']:\'lessons-payment\'`,
      limit: 100,
    };
    if (page) {
      searchQuery.page = page;
    }
    const paymentIntent = await stripe.charges.search(searchQuery);
    //console.log(paymentIntent);

    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_all_charges(
        creationDate,
        result_arr,
        paymentIntent.next_page
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function load_all_disputes(creationDate, result_arr, page = 0) {
  try {
    const searchQuery = {
      //query: `created>=${creationDate} AND metadata[\'type\']:\'lessons-payment\'`,
      created: { gte: creationDate },
      limit: 100,
    };
    if (page) {
      searchQuery.starting_after = page;
    }
    const paymentIntent = await stripe.disputes.list(searchQuery);

    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_all_disputes(
        creationDate,
        result_arr,
        paymentIntent.data.slice(-1)[0].id
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function load_all_transactions(creationDate, result_arr, page = 0) {
  try {
    const searchQuery = {
      //query: `created>=${creationDate} AND metadata[\'type\']:\'lessons-payment\'`,
      created: { gte: creationDate },
      limit: 100,
    };
    if (page) {
      searchQuery.starting_after = page;
    }
    const paymentIntent = await stripe.balanceTransactions.list(searchQuery);

    result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    if (paymentIntent.has_more) {
      return await load_all_transactions(
        creationDate,
        result_arr,
        paymentIntent.data.slice(-1)[0].id
      );
    } else {
      return result_arr;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function process_bt(allCharges) {
  promiseArr = [];
  allCharges.forEach((a) =>
    promiseArr.push(stripe.balanceTransactions.retrieve(a.balance_transaction))
  );
  Promise.all(promiseArr)
    .then((data) => data)
    .catch((error) => {
      console.log(error);
      return [];
    });
}

async function load_latest_charge(result_arr, lastId) {
  try {
    const latestCharge = await stripe.charges.list({
      ending_before: lastId,
      limit: 10,
    });
    if (latestCharge.data.length > 0) {
      result_arr.unshift(...latestCharge.data);
    }
    return result_arr;
  } catch (error) {
    console.log(error);
    return [];
  }
}

app.get("/calculate-lesson-total", async (req, res) => {
  try {
    const now = new Date();
    //const currentDayDate=parseInt(new Date(now.getTime() - 60 * 1000).getTime()/1000);
    lastWeekDate = parseInt(
      new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).getTime() / 1000
    );

    // const allPayments = await load_captured_payments(lastWeekDate, []);
    // const full_refund_amount = allPayments
    //   .filter((p) => p.charges.data.length > 0 && p.charges.data[0].refunded)
    //   .reduce((n, { charges }) => n + charges.data[0].amount_refunded, 0);
    const allCharges = await load_all_charges(lastWeekDate, []);
    const latestChargeList = await load_latest_charge(
      allCharges,
      allCharges[0].id
    );
    const allTxnIds = latestChargeList.map((c) => c.balance_transaction);

    // const paymentIntent = await stripe.paymentIntents.search({
    //   query: 'status:\'succeeded\' AND metadata[\'type\']:\'lessons-payment\'',
    //   limit:1
    // });

    // const latestCharge = await stripe.charges.search({
    //   query: `status:\'succeeded\' AND metadata[\'type\']:\'lessons-payment\'`,
    //   limit: 1,
    // });

    const balanceTransactions = await load_all_transactions(lastWeekDate, []);
    //const fee_total=balanceTransactions.filter((b)=>b.description.includes('Lesson')).reduce((n, {fee}) => n + fee, 0)

    // const processCharge= await processChargeAmounts(allCharges,allPayments,paymentIntent.data[0].amount+latestCharge.data[0].amount_captured,fee_total);
    // res.json({...processCharge})

    //res.json({allTransaction:balanceTransactions,balanceTransactions:balanceTransactions.filter((b)=>b.description.includes('Lesson')).reduce((n, {fee}) => n + fee, 0)})
    const balanceTransaction = balanceTransactions.filter(
      (b) => allTxnIds.indexOf(b.id) > -1
    );
    const fee = balanceTransaction.reduce((n, { fee }) => n + fee, 0);
    const amount = balanceTransaction.reduce((n, { amount }) => n + amount, 0);
    const net = balanceTransaction.reduce((n, { net }) => n + net, 0);
    const obj = {
      payment_total: amount,
      fee_total: fee,
      net_total: net,
    };
    //console.log(amount, fee, net);
    //res.json({ allCharges: allCharges, balance: balanceTransaction });
    res.json({ ...obj });
  } catch (error) {
    console.log(error);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

// Milestone 4: '/find-customers-with-failed-payments'
// Returns any customer who meets the following conditions:
// The last attempt to make a payment for that customer failed.
// The payment method associated with that customer is the same payment method used
// for the failed payment, in other words, the customer has not yet supplied a new payment method.
//
// Example request: curl -X GET http://localhost:4242/find-customers-with-failed-payments
//
// Returns a JSON response with information about each customer identified and
// their associated last payment
// attempt and, info about the payment method on file.
// [
//   <customer_id>: {
//     customer: {
//       email: customer.email,
//       name: customer.name,
//     },
//     payment_intent: {
//       created: created timestamp for the payment intent
//       description: description from the payment intent
//       status: the status of the payment intent
//       error: the error returned from the payment attempt
//     },
//     payment_method: {
//       last4: last four of the card stored on the customer
//       brand: brand of the card stored on the customer
//     }
//   },
//   <customer_id>: {},
//   <customer_id>: {},
// ]

async function load_every_charges(
  creationDate,
  result_arr,
  todayDate,
  page = 0
) {
  try {
    // AND metadata[\'type\']:\'lessons-payment\'
    const searchQuery = {
      query: `created>=${creationDate} AND metadata[\'type\']:\'lessons-payment\'`,
      limit: 25,
    };
    if (page) {
      searchQuery.page = page;
    }
    const paymentIntent = await stripe.charges.search(searchQuery);
    //console.log(paymentIntent);

    paymentIntent.data.forEach((p) => result_arr.push(p));
    //result_arr = await retrieveUncapturedIds(paymentIntent.data, result_arr);

    // if (paymentIntent.has_more) {
    //   return await load_every_charges(
    //     creationDate,
    //     result_arr,
    //     todayDate,
    //     paymentIntent.next_page
    //   );
    // } else {
    return result_arr;
    // }
  } catch (error) {
    console.log(error);
    return [];
  }
}

// async function load_latest_charge(result_arr,lastId){
//   try{
//     const latestCharge = await stripe.charges.list({
//       ending_before: lastId,
//       limit: 10,
//     });
//     if(latestCharge.data.length>0){
//       result_arr.unshift(...latestCharge.data);
//     }
//     return result_arr;
//   }catch (error) {
//     console.log(error);
//     return [];
//   }
// }

function waitforme(data) {
  return new Promise((resolve) => {
    resolve(data);
  });
}

async function formatCharges(allCharges) {
  try {
    let newPromiseArr = allCharges
      .filter(
        (a) =>
          a.status !== "succeeded" ||
          a.payment_method_details.card.checks.cvc_check !== "pass"
      )
      .map(async (i) => {
        return await stripe.charges.retrieve(i.id, {
          expand: ["customer", "payment_intent"],
        });
      });
    // for (let i of allCharges) {
    //   if (
    //     i.status !== "succeeded" ||
    //     i.payment_method_details.card.checks.cvc_check !== "pass"
    //   ) {
    //     newPromiseArr.push(
    //       await stripe.charges.retrieve(i.id, {
    //         expand: ["customer", "payment_intent"],
    //       })
    //     );
    //   }
    // }
    return await Promise.all(newPromiseArr);
  } catch (error) {
    console.log(error);
    return [];
  }
}

app.get("/find-customers-with-failed-payments", async (req, res) => {
  try {
    // setTimeout(async () => {
    const now = new Date();
    console.log("--1--", now.toLocaleTimeString());
    //const currentDayDate=parseInt(new Date(now.getTime() - 60 * 1000).getTime()/1000);
    lastWeekDate = parseInt(
      new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).getTime() / 1000
    );

    // todayDate = parseInt(
    //   new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).getTime() / 1000
    // );
    let rs_Arr = new Array();

    let i = 0;

    const allCharges = await load_every_charges(lastWeekDate, [], "");
    console.log("--2--", new Date().toLocaleTimeString());

    const latestCharge = await stripe.charges.list({
      //query: `created<=${todayDate} AND created>=${lastWeekDate} AND metadata[\'type\']:\'lessons-payment\'`,
      // created:{gte:lastWeekDate,lte:todayDate},
      ending_before: allCharges[0].id,
      limit: 10,
    });
    console.log("--3--", new Date().toLocaleTimeString());

    // console.log(latestCharge.data[0].customer);
    //const latestChargeList=await load_latest_charge(allCharges,allCharges[0].id)

    if (latestCharge.data.length > 0) {
      for (l of latestCharge.data) {
        if (
          l.status !== "succeeded" ||
          l.payment_method_details.card.checks.cvc_check !== "pass"
        ) {
          // const paymentIntent = await stripe.paymentIntents.retrieve(
          //   l.payment_intent
          // );
          // const customer = await stripe.customers.retrieve(
          //   l.customer
          // );
          const chargeObj = await stripe.charges.retrieve(l.id, {
            expand: ["customer", "payment_intent"],
          });
          let t = {
            customer: {
              email: chargeObj.customer.email,
              name: chargeObj.customer.name,
              id: chargeObj.customer.id,
            },
            payment_intent: {
              created: chargeObj.payment_intent.created,
              description: chargeObj.payment_intent.description,
              status: "failed",
              error: chargeObj.payment_intent.last_payment_error
                ? chargeObj.payment_intent.last_payment_error.code.includes(
                    "card_declined"
                  )
                  ? "issuer_declined"
                  : chargeObj.payment_intent.last_payment_error.code
                : null,
            },
            payment_method: {
              last4: l.payment_method_details.card.last4,
              brand: l.payment_method_details.card.brand,
            },
          };
          rs_Arr.push(t);
          // rs_Arr[i] = {};
          // rs_Arr[i][l.customer] = ovj;
          // i++;
        }
      }
    }
    console.log("--4--", new Date().toLocaleTimeString());
    //console.log("allcharges", latestChargeList[0]);

    //let result_arr={};
    const chargesResp = await formatCharges(allCharges);
    console.log("--4.1--", new Date().toLocaleTimeString());
    //const chargesResp=await Promise.all(reformatCharge)
    //console.log(reformatCharge)
    for (chargeObj of chargesResp) {
      // const chargeObj=await stripe.charges.retrieve(a.id, {
      //   expand: ['customer', 'payment_intent'],
      // });
      // if (
      //   chargeObj.status !== "succeeded" ||
      //   chargeObj.payment_method_details.card.checks.cvc_check !== "pass"
      // ) {

      let temp = {
        customer: {
          email: chargeObj.customer.email,
          name: chargeObj.customer.name,
          id: chargeObj.customer.id,
        },
        payment_intent: {
          created: chargeObj.payment_intent.created,
          description: chargeObj.payment_intent.description,
          status: "failed",
          error: chargeObj.payment_intent.last_payment_error
            ? chargeObj.payment_intent.last_payment_error.code.includes(
                "card_declined"
              )
              ? "issuer_declined"
              : chargeObj.payment_intent.last_payment_error.code
            : null,
        },
        payment_method: {
          last4: chargeObj.payment_method_details.card.last4,
          brand: chargeObj.payment_method_details.card.brand,
        },
      };
      rs_Arr.push(temp);
      //rs_Arr[i] = temp;
      //rs_Arr[i][a.customer] = ovj;
      //i++;
      //}
    }
    console.log("--5--", new Date().toLocaleTimeString());

    res.json(rs_Arr);
    // }, 5000);
  } catch (error) {
    console.log(error);
    res.json({ error: { code: error.code, message: error.message } });
  }
});

app.post("/webhook", async (req, res) => {
  const event = req.body;
  // console.log(event.type);
  if (event.type.includes("charge.")) {
    const charge = await stripe.charges.update(event.data.object.id, {
      metadata: event.data.object.metadata,
    });
  }
  if (event.type === "charge.captured") {
    console.log(event.data.object);
    console.log("charge captured");
  }
  res.json({ msg: event });
});

function errorHandler(err, req, res, next) {
  res.status(500).send({ error: { message: err.message } });
}

app.use(errorHandler);

app.listen(4242, () =>
  console.log(`Node server listening on port http://localhost:${4242}`)
);
