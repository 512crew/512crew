const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize Express server
const app = express();
const port = 8080;
app.use(cors());
app.use(bodyParser.json());

// NXT Wash API credentials and endpoint
const apiUrl = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const couponUrl = 'https://api.nxtwash.com:300/api/coupons/create';
const adminEmail = '512crews@gmail.com';
const adminPassword = 'blastoff123$';

// Authentication function
const authenticateUser = async () => {
  try {
    const response = await axios.post(
      apiUrl,
      {
        emailOrPhone: adminEmail,
        password: adminPassword,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data.data;

    console.log('✅ Authenticated with NXT Wash');
    return {
      accessToken: data.accessToken,
      userKey: data.key,
    };
  } catch (error) {
    console.error('❌ Error authenticating:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
};

// Coupon creation function
const createCoupon = async (accessToken, userKey, userEmail) => {
  try {
    const response = await axios.post(
      couponUrl,
      {
        couponPackageId: 4,
        key: userKey,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('🎉 Coupon Created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating coupon:', error.response?.data || error.message);
    throw new Error('Coupon creation failed');
  }
};

// API route to handle the coupon generation
app.post('/generate-coupon', async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const { accessToken, userKey } = await authenticateUser();
    const couponData = await createCoupon(accessToken, userKey, userEmail);

    res.json({
      couponCode: couponData?.data?.couponCode || 'No code returned',
      barcodeText: couponData?.data?.couponCode || '', // Use couponCode as barcode fallback
    });
  } catch (error) {
    console.error('🚨 Error during coupon generation:', error.message);
    res.status(500).json({ message: 'Error during coupon generation' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
