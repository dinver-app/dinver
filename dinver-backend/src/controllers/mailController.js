const mailgun = require('mailgun-js');
const { createEmailTemplate } = require('../../utils/emailService');

const mg = process.env.MAILGUN_API_KEY
  ? mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    })
  : null;

const handleClaimRequest = async (req, res) => {
  try {
    const { fullName, email, message, restaurantName } = req.body;

    if (!fullName || !email || !message || !restaurantName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const htmlContent = `
      <h2>Novi zahtjev za preuzimanje restorana</h2>
      <div class="reservation-details">
        <h3>Detalji zahtjeva</h3>
        <p><strong>Restoran:</strong> ${restaurantName}</p>
        <p><strong>Ime i prezime:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Poruka:</strong> ${message}</p>
      </div>
    `;

    const data = {
      from: 'Dinver <noreply@dinver.eu>',
      to: ['info@dinver.eu', 'ivankikic49@gmail.com'].join(', '),
      subject: `Novi zahtjev za preuzimanje restorana: ${restaurantName}`,
      text: `Novi zahtjev za preuzimanje restorana:\n\nRestoran: ${restaurantName}\nIme i prezime: ${fullName}\nEmail: ${email}\nPoruka: ${message}`,
      html: createEmailTemplate(htmlContent),
    };

    if (process.env.NODE_ENV === 'development' || !mg) {
      console.log('Development mode: Email would be sent');
      console.log('Data:', data);
      return res
        .status(200)
        .json({ message: 'Zahtjev uspješno poslan (dev mode)' });
    }

    await mg.messages().send(data);
    return res.status(200).json({ message: 'Zahtjev uspješno poslan' });
  } catch (error) {
    console.error('Error sending claim request email:', error);
    return res.status(500).json({ error: 'Failed to send claim request' });
  }
};

module.exports = {
  handleClaimRequest,
};
