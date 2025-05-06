const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const Twilio = require('twilio');
const moment = require('moment');

// Twilio config
const twilioClient = new Twilio(
  'AC2c9a12203f28cd08ad15476f4e1bc977',
  'edbd37f0c932ee31f764a43f19a7e1f8'
);
const twilioNumber = '+18665804414';

// Google Sheets config
const doc = new GoogleSpreadsheet('14le_2RbNzWorWl4nlLCDk73zMwg-HkDpPHaaYQU7PIA');
const GOOGLE_SERVICE_ACCOUNT_EMAIL = 'blastoffcrm@valued-module-459020-s1.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/kZ9agFiq2W24\natN3ibmGC9+G1KvecV7KSycaE3oGSjA2t7VsrXwkxapru0EJOEwyN3pVVqbUZmIQ\nFmU71fDPIbWUwKjBVt7lp3sNFh2b3LbaAxX2RhR3MZomcRxDC5CRCjweXMiOYyY3\nPI27KEPZZ9PcRiXHpsdjiZnSM72JvZCY2wRQjC31DFVtDLRYd1x/hoe+zc4EaSFN\naYcum2K+RaTALsCuN7LPC1KP1xNHHivtqo9pnpU8yOWOvy9v2uCjW1Jk6faXAdA/\n8dKhIkoqkNoT7NtmOeBuGwOw1odcT8Te3BdZe4okS492pR42tzA/d9fsOlfRSo9I\npaDoJbgTAgMBAAECggEAQ/qQ6bSRwk7VuJNv5wNgakjcUSQ2uQDR+kcg4Qf4TTMW\nWNRn9OC7JPFfwEr6kSMBJvC44H+XQ9fxBHRuCAWrJlV38glL2Q/SmPwNll86soxn\n9oURzgqgSIu5f9qzhLcd3dob60pRgPV+IivCv59SNFu7unbKAUcViiTSCN2DbNTR\n4NL7TOl6pPclXpgoI/D6+v4v/iAnbVYYm4t/Vwuoo/O9cA0OCEjhmb1q1OFSiMsl\nzrVSiXsRdi2+lYjHmNjnGP+Cfx8yiWdiMDAuisPqMZV6iHP8meFIwkDMwBUzt5it\nXnaFYXJWrKr0brkyyqnYdj/kPeq37dfQJFXj7ViVgQKBgQD2ee5P3Wr1t893mpk/\nQyBbpftiQXD2XIk0AA4qG0yv5LhAJf7TLBwcsQZaFtHlLTALTOpXfaRy45/uRD68\nuhdoH5YoKZTAQhnr1jiRt883tDvOKAO5+H+w2I+rfGhUJRlVmh/Go0Gma+vFrhyl\nl6FgRqIHOCMxkRtVepKcU1CaWwKBgQDG+JBH9Phzhd7KCF97HVdeEKiG1xj4+Kfw\n+5bGSHbyb5BfME7FYXK/kPPsjxQRuLvb1H9j4OhQIKHTD5grL0kQOhOXROnBuq+U\ni1Z15KFOSOUpLmos/QeQgL6FMggBOyCKUDqk0Agh52HNMwcW6q43Ll+x58uG2Zf0\niqOz98QWqQKBgQCc8t+xs4jclwNhYeybwB7mvTbqRkmsVxh3KGHcpi2bA8Xf81Hl\nHn14N7GXxFg72x5w07WVqMgC8LdyfbqFaupkv1hakr/J/U2MQ4kaITWufvJmQEy/\nK2IENqKlzD6S9ly/ibkaP/MaCjbEVi6fs4JrUA71EeY3NfN15utc6CC3aQKBgE7W\nztS0TH353X1QNAUkaynqj9xd/pcob+MczXFj5T3K1vngulWbd0xQs1ZYmysqd8Vz\nPcblpyeYxoZK95Ck+95iJMEbnUQWJNxHGcs8/G14lNTsf0W0PPsVCGjemi1isFId\n2B7WD2Lfu/EC9xwtgTp8NY7YudyE+6D6DkOROTGBAoGBANr032U2nYYC2aVIB+Ax\n7AVpm5u1Q5dIkRRYfZqYnffxcvSUvAEfYnJ0kKRaLJnKG2W45StIniZL0J7pFVW6\nVJohkjrEcnPNvP90rd6vPWs3fr6SBxYguq0zxK0/zh8YER9+MhKraHNIV9OTJWR1\nZEEHYgahBOhaLfrUvnwpwZwJ\n-----END PRIVATE KEY-----\n`;

// NXT Wash API config
const apiUrl = 'https://api.nxtwash.com:300/api/User/AuthenticateUser';
const couponUrl = 'https://api.nxtwash.com:300/api/coupons/create';
const adminEmail = '512crews@gmail.com';
const adminPassword = 'blastoff123$';

// Express setup
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

const sendSMS = async (phoneNumber, couponCode) => {
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${couponCode}&code=Code128&dpi=96`;
  await twilioClient.messages.create({
    to: phoneNumber,
    from: twilioNumber,
    body: `Your NXT Wash coupon code is: ${couponCode}\nScan your barcode: ${barcodeUrl}`
  });
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
    res.status(500).json({ message: 'Failed to process coupon' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
