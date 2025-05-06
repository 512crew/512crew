require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const Twilio = require('twilio');
const moment = require('moment');

const twilioClient = new Twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const twilioNumber = process.env.TWILIO_NUMBER;

const doc = new GoogleSpreadsheet('14le_2RbNzWorWl4nlLCDk73zMwg-HkDpPHaaYQU7PIA');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const apiUrl = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const couponUrl = 'https://api.nxtwash.com:300/api/coupons/create';
const adminEmail = process.env.NXT_ADMIN_EMAIL;
const adminPassword = process.env.NXT_ADMIN_PASSWORD;

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());

const authenticateUser = async () => {
  const response = await axios.post(
    apiUrl,
    { emailOrPhone: adminEmail, password: adminPassword },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const data = response.data.data;
  return { accessToken: data.accessToken, userKey: data.key };
};

const createCoupon = async (accessToken, userKey) => {
  const response = await axios.post(
    couponUrl,
    { couponPackageId: 4, key: userKey },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data?.data?.[0]?.couponCode;
};

const formatPhoneNumber = (raw) => {
  if (raw.startsWith('+1')) return raw;
  if (raw.length === 10) return `+1${raw}`;
  if (raw.length === 11 && raw.startsWith('1')) return `+${raw}`;
  throw new Error('Invalid phone number format');
};

const sendSMS = async (phoneNumber, couponCode) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${couponCode}&code=Code128&dpi=96`;

    const response = await twilioClient.messages.create({
      to: formattedPhone,
      from: twilioNumber,
      body: `🚀 Blast Off to a Better Shine! Your $9.99 First Month starts now. Code: ${couponCode}\nScan & redeem: ${barcodeUrl}\n- From Houston's Shine Experts ✨`
    });

    console.log('✅ SMS sent:', response.sid);
  } catch (err) {
    console.error('❌ SMS error:', err.message);
    throw new Error('SMS delivery failed');
  }
};

const storeInGoogleSheet = async (data) => {
  await doc.useServiceAccountAuth({
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  await sheet.addRow({
    Timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
    'First Name': data.firstName,
    'Last Name': data.lastName,
    Email: data.userEmail,
    Phone: data.phoneNumber,
    'Zip Code': data.zipCode,
    'Coupon Code': data.couponCode
  });
};

app.post('/generate-coupon', async (req, res) => {
  try {
    const { firstName, lastName, userEmail, phoneNumber, zipCode } = req.body;
    const { accessToken, userKey } = await authenticateUser();
    const couponCode = await createCoupon(accessToken, userKey);

    if (!couponCode) throw new Error('Coupon code not returned');

    await sendSMS(phoneNumber, couponCode);
    await storeInGoogleSheet({ firstName, lastName, userEmail, phoneNumber, zipCode, couponCode });

    res.json({ couponCode, barcodeText: couponCode });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: error.message || 'Failed to process coupon' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});


