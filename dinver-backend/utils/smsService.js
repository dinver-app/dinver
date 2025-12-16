const https = require('follow-redirects').https;

// Infobip konfiguracija
const infobipApiKey = process.env.INFOBIP_API_KEY;
const infobipBaseUrl = process.env.INFOBIP_API_BASE_URL; // npr. 2m66ez.api.infobip.com
const infobipSender = process.env.INFOBIP_SENDER || '447491163443'; // Default sender iz dokumentacije

const sendVerificationSMS = async (phone, code) => {
  // Check if Infobip is configured
  if (!infobipApiKey || !infobipBaseUrl) {
    console.log('Infobip not configured - SMS would be sent');
    console.log('To:', phone);
    console.log('Verification Code:', code);
    // In development, you might want to just log instead of throwing error
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    throw new Error('SMS service not configured');
  }

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: infobipBaseUrl,
      path: '/sms/2/text/advanced',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const response = JSON.parse(body.toString());

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Verification SMS sent successfully to ${phone}`);
          resolve(response);
        } else {
          console.error('Error sending SMS via Infobip:', response);
          reject(new Error(`Infobip API error: ${response.requestError?.serviceException?.text || 'Unknown error'}`));
        }
      });

      res.on('error', (error) => {
        console.error('Error sending verification SMS:', error);
        reject(error);
      });
    });

    // Remove leading + from phone number if present (Infobip expects without +)
    const cleanPhoneNumber = phone.startsWith('+') ? phone.substring(1) : phone;

    const postData = JSON.stringify({
      messages: [
        {
          destinations: [{ to: cleanPhoneNumber }],
          from: infobipSender,
          text: `Your Dinver verification code is: ${code}. This code will expire in 10 minutes.`
        }
      ]
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = {
  sendVerificationSMS,
};
