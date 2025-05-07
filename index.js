const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// ✅ CORS config to allow only your domain
const corsOptions = {
  origin: 'https://blastoffcarwash.net',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

// NXT Wash API Credentials
const NXT_API_URL = 'https://api.nxtwash.com/api/users/authenticate';
const COUPON_API_URL = 'https://api.nxtwash.com/api/coupons/create';
const ADMIN_EMAIL = process.env.NXT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.NXT_ADMIN_PASSWORD;

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

app.post('/generate-coupon', async (req, res) => {
  const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;

  if (!firstName || !lastName || !userEmail || !phoneNumber || !zipCode) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const authData = await authenticateWithNXT();
    const { accessToken, key } = authData;

    const coupon = await createCoupon(accessToken, key);

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
