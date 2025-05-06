const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

// Your NXT API details
const NXT_API_URL = 'https://api.nxtwash.com:300';
const ADMIN_EMAIL = '512crews@gmail.com';
const ADMIN_PASSWORD = 'blastoff123$';

let accessToken = '';
let userKey = '';

const app = express();
app.use(bodyParser.json());

// Function to authenticate and get the access token and key
const authenticate = async () => {
  try {
    const response = await axios.post(
      `${NXT_API_URL}/api/User/AuthenticateUser`,
      {
        EmailOrPhone: ADMIN_EMAIL,  // Use "EmailOrPhone" as per NXT API
        Password: ADMIN_PASSWORD    // Correct field names: EmailOrPhone and Password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    accessToken = response.data.accessToken;
    userKey = response.data.key;
    console.log('✅ Authenticated with NXT Wash');
  } catch (error) {
    console.error('❌ Error authenticating:', error.response?.data || error.message);
  }
};

// Call the authenticate function when the server starts
authenticate();

// Endpoint to create a coupon
app.post('/create-coupon', async (req, res) => {
  const { firstName, lastName, phone, email, zipCode } = req.body;

  if (!accessToken || !userKey) {
    return res.status(400).json({ error: 'Not authenticated yet' });
  }

  try {
    // Creating the coupon using NXT API
    const couponResponse = await axios.post(
      `${NXT_API_URL}/api/coupons/create`,
      {
        couponPackageId: 4,  // Your specific coupon package ID
        firstName,
        lastName,
        phone,
        email,
        zipCode
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const couponCode = couponResponse.data.couponCode;
    const barcode = couponResponse.data.barcode;

    // Send the coupon code and barcode as the response
    return res.json({ couponCode, barcode });
  } catch (error) {
    console.error('❌ Error creating coupon:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error creating coupon' });
  }
});

// Start the server on port 8080
app.listen(8080, () => {
  console.log('Server running on port 8080');
});
