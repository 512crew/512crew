const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// CORS setup for your domain
const corsOptions = {
  origin: 'https://blastoffcarwash.com',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// NXT Wash API endpoints
const NXT_AUTH_URL = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const NXT_COUPON_URL = 'https://api.nxtwash.com:300/api/coupons/create';
const ADMIN_EMAIL = process.env.NXT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.NXT_ADMIN_PASSWORD;

// Notion client setup
const notion = new Client({ auth: process.env.NOTION_SECRET });
const NOTION_DB_ID = process.env.NOTION_DB_ID;

// Authenticate with NXT Wash
async function authenticateWithNXT() {
  const resp = await axios.post(NXT_AUTH_URL, {
    emailOrPhone: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, { headers: { 'Content-Type': 'application/json' } });
  return resp.data.data; // { accessToken, key }
}

// Create coupon via NXT API
async function createCoupon(accessToken, key) {
  const resp = await axios.post(NXT_COUPON_URL,
    { key, couponPackageId: 4 },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const item = resp.data.data?.[0];
  return { couponCode: item.couponCode, barcodeUrl: `https://barcode.tec-it.com/barcode.ashx?data=${item.couponCode}&code=Code128&dpi=96` };
}

// Check if phone has already been used
async function hasUsedPhone(phoneNumber) {
  const res = await notion.databases.query({
    database_id: NOTION_DB_ID,
    filter: {
      property: 'Phone',
      phone_number: { equals: phoneNumber }
    }
  });
  return res.results.length > 0;
}

// Check if email has already been used
async function hasUsedEmail(userEmail) {
  const res = await notion.databases.query({
    database_id: NOTION_DB_ID,
    filter: {
      property: 'Email',
      email: { equals: userEmail }
    }
  });
  return res.results.length > 0;
}

// Save submission to Notion
async function saveToNotion(data) {
  await notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    properties: {
      'First Name': { title: [{ text: { content: data.firstName } }] },
      'Last Name': { rich_text: [{ text: { content: data.lastName } }] },
      'Email': { email: data.userEmail },
      'Phone': { phone_number: data.phoneNumber },
      'Zip Code': { rich_text: [{ text: { content: data.zipCode } }] },
      'Coupon Code': { rich_text: [{ text: { content: data.couponCode } }] },
      'Submitted At': { date: { start: new Date().toISOString() } }
    }
  });
}

app.post('/generate-coupon', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;
  if (!firstName || !lastName || !userEmail || !phoneNumber || !zipCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Prevent duplicate phone or email submissions
    if (await hasUsedPhone(phoneNumber)) {
      return res.status(400).json({ message: 'A coupon has already been requested with this phone number.' });
    }
    if (await hasUsedEmail(userEmail)) {
      return res.status(400).json({ message: 'A coupon has already been requested with this email address.' });
    }

    // Generate coupon
    const { accessToken, key } = await authenticateWithNXT();
    const coupon = await createCoupon(accessToken, key);

    // Save to Notion
    const notionData = { firstName, lastName, userEmail, phoneNumber, zipCode, couponCode: coupon.couponCode };
    await saveToNotion(notionData);

    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error in /generate-coupon:', error.message || error);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
