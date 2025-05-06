const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const NXT_API_URL = 'https://api.nxtwash.com:300';
const ADMIN_EMAIL = '512crews@gmail.com';
const ADMIN_PASSWORD = 'blastoff123$';

let accessToken = '';
let userKey = '';

// Authenticate when server starts
const authenticate = async () => {
  try {
    const response = await axios.post(`${NXT_API_URL}/api/User/AuthenticateUser`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    accessToken = response.data.accessToken;
    userKey = response.data.key;
    console.log('✅ Authenticated with NXT Wash');
  } catch (error) {
    console.error('❌ Error authenticating:', error.message);
  }
};

app.post('/create-coupon', async (req, res) => {
  const { firstName, lastName, phoneNumber, email, zipCode } = req.body;

  try {
    const response = await axios.post(`${NXT_API_URL}/api/coupons/create`, {
      couponPackageId: 4,
      phoneNumber,
      email,
      key: userKey,
      name: `${firstName} ${lastName}`,
      zipCode
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const coupon = response.data;
    res.json({ success: true, coupon });
  } catch (error) {
    console.error('❌ Coupon creation error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Coupon creation failed' });
  }
});

app.get('/', (req, res) => {
  res.send('Middleware is running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await authenticate();
  console.log(`Server running on port ${PORT}`);
});
