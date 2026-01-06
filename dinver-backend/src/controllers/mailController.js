const { sendEmail, createEmailTemplate } = require('../../utils/emailService');
const { User } = require('../../models');

const handleClaimRequest = async (req, res) => {
  try {
    const { fullName, email, message, restaurantName, userId } = req.body;

    if (!fullName || !email || !message) {
      return res
        .status(400)
        .json({ error: 'Name, email and message are required' });
    }

    // Dohvati dodatne informacije o korisniku ako je poslan userId
    let userDetails = '';
    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        userDetails = `
          <h3>Detalji korisnika iz sustava</h3>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>Ime:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Telefon:</strong> ${user.phone || 'Nije unesen'}</p>
          <p><strong>Registriran:</strong> ${new Date(user.createdAt).toLocaleDateString('hr-HR')}</p>
        `;
      }
    }

    const htmlContent = `
      <h2>Novi zahtjev za preuzimanje restorana</h2>
      <div class="claim-request-details">
        <h3>Detalji zahtjeva</h3>
        ${restaurantName ? `<p><strong>Restoran:</strong> ${restaurantName}</p>` : ''}
        <p><strong>Ime i prezime:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Poruka:</strong> ${message}</p>
      </div>
      ${userDetails}
    `;

    // Pripremi text verziju emaila
    const textContent = `
Novi zahtjev za preuzimanje restorana:

Detalji zahtjeva:
${restaurantName ? `Restoran: ${restaurantName}\n` : ''}
Ime i prezime: ${fullName}
Email: ${email}
Poruka: ${message}

${userId ? `\nKorisnik postoji u sustavu (ID: ${userId})` : ''}
    `.trim();

    const data = {
      from: 'Dinver <noreply@dinver.eu>',
      to: ['info@dinver.eu', 'ivankikic49@gmail.com'].join(', '),
      subject: restaurantName
        ? `Novi zahtjev za preuzimanje restorana: ${restaurantName}`
        : 'Novi zahtjev za preuzimanje restorana',
      text: textContent,
      html: createEmailTemplate(htmlContent),
    };

    await sendEmail(data);
    return res.status(200).json({ message: 'Zahtjev uspješno poslan' });
  } catch (error) {
    console.error('Error sending claim request email:', error);
    return res.status(500).json({ error: 'Failed to send claim request' });
  }
};

module.exports = {
  handleClaimRequest,
};
