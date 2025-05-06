const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

// Initialize Express server
const app = express();
const port = 8080;
app.use(bodyParser.json());

// NXT Wash API credentials and endpoint
const apiUrl = 'https://api.nxtwash.com/api/users/authenticate';
const couponUrl = 'https://api.nxtwash.com/api/coupons/create';
const adminEmail = '512crews@gmail.com';  // Your admin email
const adminPassword = 'blastoff123$'; // Your admin password

// Authentication function
const authenticateUser = async () => {
  try {
    const response = await axios.post(apiUrl, {
      email: adminEmail,
      password: adminPassword,
    });
    console.log('Authenticated with NXT Wash');
    return response.data.accessToken; // This returns the access token for further requests
  } catch (error) {
    console.error('Error authenticating:', error.response ? error.response.data : error.message);
    throw new Error('Authentication failed');
  }
};

// Coupon creation function
const createCoupon = async (accessToken, userEmail) => {
  try {
    const response = await axios.post(
      couponUrl,
      {
        couponPackageId: 4, // Example coupon package ID
        userEmail: userEmail, // User email to associate the coupon with
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Attach the access token to the request header
        },
      }
    );

    console.log('Coupon Created:', response.data);

    // Return the coupon data which can include the code and barcode
    return response.data; // This might include coupon code, barcode, etc.
  } catch (error) {
    console.error('Error creating coupon:', error.response ? error.response.data : error.message);
    throw new Error('Coupon creation failed');
  }
};

// API route to handle the coupon generation
app.post('/generate-coupon', async (req, res) => {
  try {
    const { userEmail } = req.body;  // Get user email from the request body
    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Authenticate user and get access token
    const accessToken = await authenticateUser();

    // Create coupon for the user
    const couponData = await createCoupon(accessToken, userEmail);

    // Send the coupon data to the frontend
    res.json({
      couponCode: couponData.couponCode,  // Assuming coupon code is part of the response
      barcodeText: couponData.barcode,    // Assuming barcode text is part of the response
    });
  } catch (error) {
    console.error('Error during coupon generation:', error.message);
    res.status(500).json({ message: 'Error during coupon generation' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

