// File: index.js (Node.js backend for Render/GitHub)
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({ origin: 'https://blastoffcarwash.com' }));
app.use(bodyParser.json());

// NXT Wash API endpoints
const NXT_AUTH_URL = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const NXT_COUPON_URL = 'https://api.nxtwash.com:300/api/coupons/create';
const ADMIN_EMAIL = process.env.NXT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.NXT_ADMIN_PASSWORD;

// Notion client setup
const notion = new Client({ auth: process.env.NOTION_SECRET });
const NOTION_DB_ID = process.env.NOTION_DB_ID;

async function authenticateWithNXT() {
  const resp = await axios.post(NXT_AUTH_URL, {
    emailOrPhone: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  }, { headers: { 'Content-Type': 'application/json' } });
  return resp.data.data;
}

async function createCoupon(accessToken, key) {
  const resp = await axios.post(NXT_COUPON_URL,
    { key, couponPackageId: 5 },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const item = resp.data.data?.[0];
  return {
    couponCode: item.couponCode,
    barcodeUrl: `https://barcode.tec-it.com/barcode.ashx?data=${item.couponCode}&code=Code128&dpi=96`  
  };
}

async function saveToNotion(data) {
  await notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    properties: {
      'First Name': { title: [{ text: { content: data.firstName } }] },
      'Last Name': { rich_text: [{ text: { content: data.lastName } }] },
      'Phone': { phone_number: data.phoneNumber },
      'Email': { email: data.userEmail },
      'Birthday': { date: { start: data.birthday } },
      'Zip Code': { rich_text: [{ text: { content: data.zipCode } }] },
      'School you work at': { rich_text: [{ text: { content: data.school } }] },
      'Coupon Code': { rich_text: [{ text: { content: data.couponCode } }] },
      'Submitted At': { date: { start: new Date().toISOString() } }
    }
  });
}

app.post('/generate-coupon', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, birthday, zipCode, school } = req.body;
  if (!firstName || !lastName || !userEmail || !phoneNumber || !birthday || !zipCode || !school) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const { accessToken, key } = await authenticateWithNXT();
    const coupon = await createCoupon(accessToken, key);
    const notionData = { firstName, lastName, userEmail, phoneNumber, birthday, zipCode, school, couponCode: coupon.couponCode };
    await saveToNotion(notionData);
    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error in /generate-coupon:', error);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

