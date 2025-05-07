const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// ✅ Allow CORS from your live site
app.use(cors({
  origin: 'https://blastoffcarwash.net',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// NXT Wash API Credentials
const NXT_API_URL = 'https://api.nxtwash.com/api/users/authenticate';
const COUPON_API_URL = 'https://api.nxtwash.com/api/coupons/create';
const ADMIN_EMAIL = '512crews@gmail.com';
const ADMIN_PASSWORD = 'blastoff123$';

// Notion Setup
const notion = new Client({ auth: process.env.NOTION_SECRET });
const NOTION_DB_ID = process.env.NOTION_DB_ID;

const authenticateWithNXT = async () => {
  try {
    const response = await axios.post(NXT_API_URL, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    console.log('✅ Authenticated with NXT Wash');
    return response.data;
  } catch (error) {
    console.error('❌ Error authenticating with NXT:', error.response?.data || error.message);
    throw new Error('NXT Authentication Failed');
  }
};

const createCoupon = async (accessToken, key) => {
  try {
    const response = await axios.post(
      COUPON_API_URL,
      {
        key: key,
        couponPackageId: 4
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log('🎉 Full Coupon API Raw Response:', response.data);
    const coupon = response.data?.data?.[0];

    if (!coupon?.couponCode) {
      throw new Error('Coupon not returned');
    }

    return {
      couponCode: coupon.couponCode,
      barcodeUrl: `https://barcode.tec-it.com/barcode.ashx?data=${coupon.couponCode}&code=Code128&dpi=96`
    };
  } catch (error) {
    console.error('❌ Error creating coupon:', error.response?.data || error.message);
    throw new Error('Coupon creation failed');
  }
};

const saveToNotion = async (userData, couponCode) => {
  try {
    await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        'First Name': { title: [{ text: { content: userData.firstName } }] },
        'Last Name': { rich_text: [{ text: { content: userData.lastName } }] },
        'Email': { email: userData.userEmail },
        'Phone': { phone_number: userData.phoneNumber },
        'Zip Code': { rich_text: [{ text: { content: userData.zipCode } }] },
        'Coupon Code': { rich_text: [{ text: { content: couponCode } }] },
        'Submitted At': { date: { start: new Date().toISOString() } }
      }
    });
    console.log('✅ Entry saved to Notion');
  } catch (err) {
    console.error('❌ Error saving to Notion:', err.message);
    throw new Error('Notion save failed');
  }
};

app.post('/generate-coupon', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;

  if (!firstName || !lastName || !userEmail || !phoneNumber || !zipCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const authData = await authenticateWithNXT();
    const { accessToken, key } = authData;

    const coupon = await createCoupon(accessToken, key);
    await saveToNotion({ firstName, lastName, userEmail, phoneNumber, zipCode }, coupon.couponCode);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ couponCode: coupon.couponCode, barcodeUrl: coupon.barcodeUrl });
  } catch (err) {
    console.error('❌ Error in /generate-coupon:', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

