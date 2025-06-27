const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const handleClaimRequest = async (req, res) => {
  try {
    const { fullName, email, message, restaurantName } = req.body;

    if (!fullName || !email || !message || !restaurantName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const emailContent = `
Novi zahtjev za preuzimanje restorana:

Restoran: ${restaurantName}
Ime i prezime: ${fullName}
Email: ${email}
Poruka: ${message}
    `;

    await resend.emails.send({
      from: 'Dinver <info@dinverapp.com>',
      to: ['info@dinver.eu', 'ivankikic49@gmail.com'],
      subject: `Novi zahtjev za preuzimanje restorana: ${restaurantName}`,
      text: emailContent,
    });

    return res.status(200).json({ message: 'Zahtjev uspješno poslan' });
  } catch (error) {
    console.error('Error sending claim request email:', error);
    return res.status(500).json({ error: 'Failed to send claim request' });
  }
};

module.exports = {
  handleClaimRequest,
};
