const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// ✅ Enable CORS for your frontend origin
app.use(cors({
  origin: 'https://blastoffcarwash.net',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// NXT Wash API
const NXT_API_URL = 'https://api.nxtwash.com/api/users/authenticate';
const COUPON_API_URL = 'https://api.nxtwash.com/api/coupons/create';
const ADMIN_EMAIL = '512crews@gmail.com';
const ADMIN_PASSWORD = 'blastoff123$';

// Google Sheets Setup
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

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

const saveToGoogleSheet = async (userData, couponCode) => {
  try {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toISOString(),
      'First Name': userData.firstName,
      'Last Name': userData.lastName,
      Email: userData.userEmail,
      Phone: userData.phoneNumber,
      'Zip Code': userData.zipCode,
      'Coupon Code': couponCode
    });
    console.log('✅ Row added to Google Sheet');
  } catch (err) {
    console.error('❌ Error writing to Google Sheet:', err);
    throw new Error('Google Sheet error');
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
    await saveToGoogleSheet({ firstName, lastName, userEmail, phoneNumber, zipCode }, coupon.couponCode);

    res.json({ couponCode: coupon.couponCode, barcodeUrl: coupon.barcodeUrl });
  } catch (err) {
    console.error('❌ Error in /generate-coupon:', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});






