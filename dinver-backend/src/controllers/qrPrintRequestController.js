const { QRPrintRequest, User, Restaurant } = require('../../models');
const { createEmailTemplate } = require('../../utils/emailService');
const mailgun = require('mailgun-js');
const mg = process.env.MAILGUN_API_KEY
  ? mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    })
  : null;

const ADMIN_EMAILS = ['info@dinver.eu', 'ivankikic49@gmail.com'];

const createQRPrintRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.id;
    const {
      showDinverLogo,
      showRestaurantName,
      showScanText,
      textPosition,
      qrTextColor,
      qrBackgroundColor,
      qrBorderColor,
      qrBorderWidth,
      padding,
      quantity,
      customText,
    } = req.body;

    // Validacija
    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ error: 'Quantity is required and must be greater than 0.' });
    }

    // Kreiraj zahtjev
    const request = await QRPrintRequest.create({
      userId,
      restaurantId,
      showDinverLogo,
      showRestaurantName,
      showScanText,
      textPosition,
      qrTextColor,
      qrBackgroundColor,
      qrBorderColor,
      qrBorderWidth,
      padding,
      quantity,
      customText,
      status: 'pending',
    });

    // Dohvati korisnika i restoran
    const user = await User.findByPk(userId);
    const restaurant = await Restaurant.findByPk(restaurantId);

    // Pripremi email
    const htmlContent = `
      <h2>Novi zahtjev za QR naljepnice</h2>
      <h3>Restoran: ${restaurant?.name || ''}</h3>
      <p><strong>Korisnik:</strong> ${user?.firstName} ${user?.lastName} (${user?.email})</p>
      <p><strong>Količina:</strong> ${quantity}</p>
      ${customText ? `<p><strong>Custom tekst:</strong> ${customText}</p>` : ''}
      <ul>
        <li>Prikaži Dinver logo: ${showDinverLogo ? 'DA' : 'NE'}</li>
        <li>Prikaži ime restorana: ${showRestaurantName ? 'DA' : 'NE'}</li>
        <li>Prikaži scan tekst: ${showScanText ? 'DA' : 'NE'}</li>
        <li>Pozicija teksta: ${textPosition}</li>
        <li>Boja teksta: ${qrTextColor}</li>
        <li>Boja pozadine: ${qrBackgroundColor}</li>
        <li>Boja okvira: ${qrBorderColor}</li>
        <li>Debljina okvira: ${qrBorderWidth}px</li>
        <li>Padding: ${padding}px</li>
      </ul>
      <p>Zahtjev kreiran: ${new Date().toLocaleString('hr-HR')}</p>
    `;

    const textContent = `Novi zahtjev za QR naljepnice\nRestoran: ${restaurant?.name || ''}\nKorisnik: ${user?.firstName} ${user?.lastName} (${user?.email})\nKoličina: ${quantity}${customText ? `\nCustom tekst: ${customText}` : ''}`;

    // Slanje maila (dev mode samo log)
    const data = {
      from: 'Dinver <noreply@dinver.eu>',
      to: ADMIN_EMAILS.join(', '),
      subject: `QR print zahtjev - ${restaurant?.name || ''}`,
      text: textContent,
      html: createEmailTemplate(htmlContent),
    };
    if (process.env.NODE_ENV === 'development' || !mg) {
      console.log('DEV: QR print zahtjev mail', data);
    } else {
      try {
        await mg.messages().send(data);
      } catch (err) {
        console.error('Greška kod slanja maila za QR print zahtjev:', err);
        // Nije fatalno za korisnika, ali možeš logirati ili javiti adminu
      }
    }

    return res
      .status(201)
      .json({ message: 'Zahtjev uspješno poslan', request });
  } catch (error) {
    console.error('Greška kod QR print zahtjeva:', error);
    return res.status(500).json({ error: 'Greška kod slanja zahtjeva' });
  }
};

const getQRPrintRequests = async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const requests = await QRPrintRequest.findAll({
      where: { restaurantId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    return res.json({ requests });
  } catch (error) {
    console.error('Greška kod dohvata QR print zahtjeva:', error);
    return res.status(500).json({ error: 'Greška kod dohvata zahtjeva' });
  }
};

// Dohvati sve QR print zahtjeve (sa filtrima)
const getAllQRPrintRequests = async (req, res) => {
  try {
    const {
      status,
      restaurantId,
      userId,
      search,
      limit = 50,
      offset = 0,
    } = req.query;
    const where = {};
    if (status) where.status = status;
    if (restaurantId) where.restaurantId = restaurantId;
    if (userId) where.userId = userId;

    // Search po imenu restorana ili korisnika
    const include = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        where: search
          ? {
              [Sequelize.Op.or]: [
                { firstName: { [Sequelize.Op.iLike]: `%${search}%` } },
                { lastName: { [Sequelize.Op.iLike]: `%${search}%` } },
                { email: { [Sequelize.Op.iLike]: `%${search}%` } },
              ],
            }
          : undefined,
        required: !!search,
      },
      {
        model: Restaurant,
        as: 'restaurant',
        attributes: ['id', 'name'],
        where: search
          ? {
              name: { [Sequelize.Op.iLike]: `%${search}%` },
            }
          : undefined,
        required: !!search,
      },
    ];

    const requests = await QRPrintRequest.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ requests });
  } catch (error) {
    console.error('Greška kod dohvata svih QR print zahtjeva:', error);
    res.status(500).json({ error: 'Greška kod dohvata zahtjeva' });
  }
};

// Promijeni status QR print zahtjeva
const updateQRPrintRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'approved', 'printed', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Neispravan status' });
    }
    const request = await QRPrintRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Zahtjev nije pronađen' });
    }
    request.status = status;
    await request.save();
    res.json({ message: 'Status ažuriran', request });
  } catch (error) {
    console.error('Greška kod ažuriranja statusa QR print zahtjeva:', error);
    res.status(500).json({ error: 'Greška kod ažuriranja statusa' });
  }
};

const deleteQRPrintRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await QRPrintRequest.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'QR print request not found' });
    }
    await request.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting QR print request:', error);
    return res.status(500).json({ error: 'Failed to delete QR print request' });
  }
};

module.exports = {
  createQRPrintRequest,
  getQRPrintRequests,
  getAllQRPrintRequests,
  updateQRPrintRequestStatus,
  deleteQRPrintRequest,
};
