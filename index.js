// File: index.js
require('dotenv').config();
const express       = require('express');
const axios         = require('axios');
const bodyParser    = require('body-parser');
const cors          = require('cors');
const { Client }    = require('@notionhq/client');

const app = express();
const port = process.env.PORT || 10000;

// Allow requests from your front-end
app.use(cors({ origin: 'https://blastoffcarwash.com' }));
app.use(bodyParser.json());

// NXT Wash API endpoints
const NXT_AUTH_URL   = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const NXT_COUPON_URL = 'https://api.nxtwash.com:300/api/coupons/create';
const ADMIN_EMAIL    = process.env.NXT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.NXT_ADMIN_PASSWORD;

// Notion client setup
const notion    = new Client({ auth: process.env.NOTION_SECRET });
const NOTION_DB = process.env.NOTION_DB_ID;

// 1) Authenticate with NXT Wash
async function authenticateWithNXT() {
  const resp = await axios.post(NXT_AUTH_URL, {
    emailOrPhone: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
  return resp.data.data; // { accessToken, key }
}

// 2) Create coupon (package 5 = 50% off)
async function createCoupon(accessToken, key) {
  const resp = await axios.post(
    NXT_COUPON_URL,
    { key, couponPackageId: 5 },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const item = resp.data.data?.[0];
  return {
    couponCode: item.couponCode,
    barcodeUrl: `https://barcode.tec-it.com/barcode.ashx?data=${item.couponCode}&code=Code128&dpi=96`
  };
}

// 3) Save lead to Notion
async function saveToNotion(pageData) {
  await notion.pages.create({
    parent: { database_id: NOTION_DB },
    properties: {
      'First Name':      { title:     [{ text: { content: pageData.firstName } }] },
      'Last Name':       { rich_text: [{ text: { content: pageData.lastName  } }] },
      'Email':           { email:       pageData.userEmail },
      'Phone':           { phone_number: pageData.phoneNumber },
      'Zip Code':        { rich_text: [{ text: { content: pageData.zipCode } }] },
      'Submitted At':    { date:       { start: new Date().toISOString() } },
      // for generate-coupon route we include coupon:
      ...(pageData.couponCode && {
        'Coupon Code': { rich_text: [{ text: { content: pageData.couponCode } }] }
      })
    }
  });
}

// Endpoint A: generate coupon + log
app.post('/generate-coupon', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, zipCode, school, birthday } = req.body;
  if (!firstName || !lastName || !userEmail || !phoneNumber || !zipCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    // 1. NXT Auth & coupon
    const { accessToken, key } = await authenticateWithNXT();
    const coupon = await createCoupon(accessToken, key);

    // 2. Save to Notion (include couponCode)
    await saveToNotion({ firstName, lastName, userEmail, phoneNumber, zipCode, couponCode: coupon.couponCode });

    // 3. Return to frontend
    res.status(200).json(coupon);
  } catch (err) {
    console.error('Error in /generate-coupon:', err.message || err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Endpoint B: pure lead capture
app.post('/submit-lead', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;
  if (!firstName || !lastName || !userEmail || !phoneNumber || !zipCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    // Save only lead info to Notion
    await saveToNotion({ firstName, lastName, userEmail, phoneNumber, zipCode });
    res.status(200).json({ message: 'Lead saved!' });
  } catch (err) {
    console.error('Error in /submit-lead:', err.body || err);
    res.status(500).json({ message: 'Could not save lead.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
