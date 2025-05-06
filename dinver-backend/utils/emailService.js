const mailgun = require('mailgun-js');
const { format } = require('date-fns');

// Mailgun konfiguracija
const mg = process.env.MAILGUN_API_KEY
  ? mailgun({
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    })
  : null;

const formatDate = (dateStr) => {
  return format(new Date(dateStr), 'dd.MM.yyyy.');
};

const formatTime = (timeStr) => {
  return timeStr.substring(0, 5); // Format HH:mm from HH:mm:ss
};

// Common HTML email template
const createEmailTemplate = (content) => {
  return `
    <!DOCTYPE html>
    <html lang="hr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dinver</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #4CAF50 !important;
          color: white !important;
          padding: 20px;
          text-align: center;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 1px;
          color: white !important;
        }
        .content {
          padding: 30px;
        }
        .reservation-details {
          background-color: #f8f9fa;
          border-left: 4px solid #4CAF50;
          border-radius: 4px;
          padding: 20px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background-color: #4CAF50 !important;
          color: white !important;
          padding: 14px 24px;
          text-decoration: none !important;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
          border: 0;
        }
        a.button {
          color: white !important;
          text-decoration: none !important;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eaeaea;
        }
        h2 {
          color: #4CAF50;
          margin-top: 0;
        }
        h3 {
          color: #4CAF50;
          margin-bottom: 15px;
        }
        p {
          margin: 0 0 15px;
        }
        .link-container {
          word-break: break-all;
          margin: 15px 0;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
            border-radius: 0;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Dinver</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Dinver. Sva prava pridržana.</p>
          <p>Dinver je moderna platforma za pronalazak i odabir restorana.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendVerificationEmail = async (email, verificationLink) => {
  const htmlContent = `
    <h2>Dobrodošli u Dinver!</h2>
    <p>Molimo potvrdite Vašu e-mail adresu klikom na gumb ispod:</p>
    <div style="text-align: center;">
      <a href="${verificationLink}" class="button" style="display: inline-block; background-color: #4CAF50 !important; color: white !important; padding: 14px 24px; text-decoration: none !important; border-radius: 4px; font-weight: bold; margin: 20px 0; text-align: center; border: 0;">Potvrdi Email</a>
    </div>
    <p>Ili kopirajte i zalijepite ovaj link u Vaš preglednik:</p>
    <div class="link-container">
      ${verificationLink}
    </div>
    <p>Ovaj link će isteći za 24 sata.</p>
  `;

  const data = {
    from: 'Dinver <noreply@dinver.eu>',
    to: email,
    subject: 'Potvrda vaše e-mail adrese',
    text: `Dobrodošli u Dinver! Molimo potvrdite Vašu e-mail adresu klikom na sljedeći link: ${verificationLink}. Ovaj link će isteći za 24 sata.`,
    html: createEmailTemplate(htmlContent),
  };

  if (process.env.NODE_ENV === 'development' || !mg) {
    console.log('Development mode: Email would be sent');
    console.log('To:', email);
    console.log('Verification Link:', verificationLink);
    return;
  }

  try {
    await mg.messages().send(data);
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendReservationEmail = async ({ to, type, reservation }) => {
  let subject;
  let text;
  let htmlContent;

  const formattedDate = formatDate(reservation.date);
  const formattedTime = formatTime(reservation.time);
  const formattedSuggestedDate = reservation.suggestedDate
    ? formatDate(reservation.suggestedDate)
    : null;
  const formattedSuggestedTime = reservation.suggestedTime
    ? formatTime(reservation.suggestedTime)
    : null;

  switch (type) {
    case 'confirmation':
      subject = 'Rezervacija potvrđena';
      text =
        `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je potvrđena.\n\n` +
        `Detalji rezervacije:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}\n` +
        (reservation.noteFromOwner
          ? `Poruka od restorana: ${reservation.noteFromOwner}\n`
          : '');

      htmlContent = `
        <h2>Rezervacija potvrđena</h2>
        <p>Vaša rezervacija u restoranu <strong>"${reservation.restaurant.name}"</strong> je potvrđena.</p>
        <div class="reservation-details">
          <h3>Detalji rezervacije</h3>
          <p><strong>Restoran:</strong> "${reservation.restaurant.name}"</p>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Vrijeme:</strong> ${formattedTime}</p>
          <p><strong>Broj gostiju:</strong> ${reservation.guests}</p>
          ${reservation.noteFromOwner ? `<p><strong>Poruka od restorana:</strong> ${reservation.noteFromOwner}</p>` : ''}
        </div>
        <p>Veselimo se Vašem dolasku!</p>
      `;
      break;

    case 'decline':
      subject = 'Rezervacija odbijena';
      text =
        `Nažalost, vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je odbijena.\n` +
        (reservation.noteFromOwner
          ? `\nRazlog: ${reservation.noteFromOwner}`
          : '');

      htmlContent = `
        <h2>Rezervacija odbijena</h2>
        <p>Nažalost, Vaša rezervacija u restoranu <strong>"${reservation.restaurant.name}"</strong> za ${formattedDate} u ${formattedTime} je odbijena.</p>
        ${
          reservation.noteFromOwner
            ? `
        <div class="reservation-details">
          <p><strong>Razlog:</strong> ${reservation.noteFromOwner}</p>
        </div>
        `
            : ''
        }
        <p>Pozivamo Vas da pokušate rezervirati drugi termin ili drugi restoran putem Dinver platforme.</p>
      `;
      break;

    case 'alternative':
      subject = 'Prijedlog alternativnog termina rezervacije';
      text =
        `Restoran "${reservation.restaurant.name}" predlaže alternativni termin za vašu rezervaciju:\n` +
        `Novi datum: ${formattedSuggestedDate}\n` +
        `Novo vrijeme: ${formattedSuggestedTime}\n\n` +
        `Molimo vas da potvrdite ili odbijete ovaj prijedlog kroz aplikaciju.`;

      htmlContent = `
        <h2>Prijedlog alternativnog termina</h2>
        <p>Restoran <strong>"${reservation.restaurant.name}"</strong> predlaže alternativni termin za Vašu rezervaciju:</p>
        <div class="reservation-details">
          <h3>Predloženi termin</h3>
          <p><strong>Novi datum:</strong> ${formattedSuggestedDate}</p>
          <p><strong>Novo vrijeme:</strong> ${formattedSuggestedTime}</p>
          <p><strong>Broj gostiju:</strong> ${reservation.guests}</p>
        </div>
        <p>Molimo Vas da potvrdite ili odbijete ovaj prijedlog kroz Dinver aplikaciju.</p>
      `;
      break;

    case 'accepted_alternative':
      subject = 'Potvrđen alternativni termin rezervacije';
      text =
        `Uspješno ste prihvatili alternativni termin za rezervaciju u restoranu "${reservation.restaurant.name}".\n\n` +
        `Novi detalji rezervacije:\n` +
        `Restoran: "${reservation.restaurant.name}"\n` +
        `Datum: ${formattedDate}\n` +
        `Vrijeme: ${formattedTime}\n` +
        `Broj gostiju: ${reservation.guests}`;

      htmlContent = `
        <h2>Potvrđen alternativni termin</h2>
        <p>Uspješno ste prihvatili alternativni termin za rezervaciju u restoranu <strong>"${reservation.restaurant.name}"</strong>.</p>
        <div class="reservation-details">
          <h3>Novi detalji rezervacije</h3>
          <p><strong>Restoran:</strong> "${reservation.restaurant.name}"</p>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Vrijeme:</strong> ${formattedTime}</p>
          <p><strong>Broj gostiju:</strong> ${reservation.guests}</p>
        </div>
        <p>Veselimo se Vašem dolasku!</p>
      `;
      break;

    case 'cancellation':
      subject = 'Rezervacija otkazana';
      text = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana.`;

      htmlContent = `
        <h2>Rezervacija otkazana</h2>
        <p>Vaša rezervacija u restoranu <strong>"${reservation.restaurant.name}"</strong> za ${formattedDate} u ${formattedTime} je otkazana.</p>
        <p>Uvijek možete napraviti novu rezervaciju putem Dinver platforme.</p>
      `;
      break;

    default:
      throw new Error('Invalid email type');
  }

  const data = {
    from: 'Dinver <noreply@dinver.eu>',
    to,
    subject,
    text,
    html: createEmailTemplate(htmlContent),
  };

  if (process.env.NODE_ENV === 'development' || !mg) {
    console.log('Development mode: Email would be sent');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    return;
  }

  try {
    await mg.messages().send(data);
    console.log('Reservation email sent successfully');
  } catch (error) {
    console.error('Error sending reservation email:', error);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const htmlContent = `
    <h2>Zahtjev za resetiranje lozinke</h2>
    <p>Zatražili ste resetiranje lozinke. Kliknite na gumb ispod za postavljanje nove lozinke:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="button" style="display: inline-block; background-color: #4CAF50 !important; color: white !important; padding: 14px 24px; text-decoration: none !important; border-radius: 4px; font-weight: bold; margin: 20px 0; text-align: center; border: 0;">Resetiraj Lozinku</a>
    </div>
    <p>Ili kopirajte i zalijepite ovaj link u Vaš preglednik:</p>
    <div class="link-container">
      ${resetLink}
    </div>
    <p>Ovaj link će isteći za 1 sat.</p>
    <p>Ako niste zatražili resetiranje lozinke, molimo ignorirajte ovaj e-mail.</p>
  `;

  const data = {
    from: 'Dinver <noreply@dinver.eu>',
    to: email,
    subject: 'Resetiranje lozinke',
    text: `Zatražili ste resetiranje lozinke. Kliknite na sljedeći link za resetiranje lozinke: ${resetLink}. Ovaj link će isteći za 1 sat. Ako niste zatražili resetiranje lozinke, molimo ignorirajte ovaj e-mail.`,
    html: createEmailTemplate(htmlContent),
  };

  if (process.env.NODE_ENV === 'development' || !mg) {
    console.log('Development mode: Password reset email would be sent');
    console.log('To:', email);
    console.log('Reset Link:', resetLink);
    return;
  }

  try {
    await mg.messages().send(data);
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendReservationEmail,
  sendPasswordResetEmail,
};
