require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const twilio = require('twilio');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());

// Twilio configuration
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Google Sheets configuration
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

// Authenticate with Google Sheets
async function accessSpreadsheet() {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  return doc.sheetsByIndex[0]; // Assuming the first sheet
}

// Helper function to format phone numbers to E.164
function formatPhoneNumber(phone) {
  // Remove non-digit characters
  const cleaned = ('' + phone).replace(/\D/g, '');
  // Check if the number has 10 digits
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('+')) {
    return cleaned;
  } else {
    throw new Error('Invalid phone number format');
  }
}

// Route to handle coupon generation
app.post('/generate-coupon', async (req, res) => {
  try {
    const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Step 1: Authenticate with external API to get accessToken and userKey
    const authResponse = await axios.post(
      'https://api.nxtwash.com:300/api/User/AuthenticateUser',
      {
        emailOrPhone: process.env.NXT_ADMIN_EMAIL,
        password: process.env.NXT_ADMIN_PASSWORD,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const { accessToken, key: userKey } = authResponse.data.data;

    // Step 2: Create coupon
    const couponResponse = await axios.post(
      'https://api.nxtwash.com:300/api/coupons/create',
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

    const couponData = couponResponse.data?.data?.[0];
    if (!couponData || !couponData.couponCode) {
      throw new Error('Failed to generate coupon code');
    }

    const couponCode = couponData.couponCode;

    // Step 3: Generate barcode URL
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${couponCode}&code=Code128&dpi=96`;

    // Step 4: Send SMS with coupon code and barcode link
    const smsBody = `🚀 Blast Off to a Better Shine!\nYour $9.99 First Month starts now.\nCode: ${couponCode}\nScan & redeem: ${barcodeUrl}\n- From Houston's Shine Experts ✨`;

    const message = await twilioClient.messages.create({
      body: smsBody,
      from: twilioNumber,
      to: formattedPhone,
    });

    console.log('✅ SMS sent:', message.sid);

    // Step 5: Store data in Google Sheet
    const sheet = await accessSpreadsheet();
    await sheet.addRow({
      Timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      'First Name': firstName,
      'Last Name': lastName,
      Email: userEmail,
      Phone: formattedPhone,
      'Zip Code': zipCode,
      'Coupon Code': couponCode,
    });

    console.log('✅ Row added to Google Sheet');

    // Step 6: Respond with coupon code and barcode URL
    res.json({ couponCode, barcodeUrl });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
