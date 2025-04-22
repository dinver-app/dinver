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

const sendVerificationEmail = async (email, verificationLink) => {
  const data = {
    from: 'Dinver <noreply@dinverapp.com>',
    to: email,
    subject: 'Verify your email address',
    text: `Please verify your email address by clicking on the following link: ${verificationLink}`,
    html: `
      <h2>Welcome to Dinver!</h2>
      <p>Please verify your email address by clicking on the button below:</p>
      <p>
        <a href="${verificationLink}" 
           style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p>${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
    `,
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
  let html;

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

      html = `
        <h2>Rezervacija potvrđena</h2>
        <p>Vaša rezervacija u restoranu "${reservation.restaurant.name}" je potvrđena.</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
          <h3>Detalji rezervacije:</h3>
          <p><strong>Restoran:</strong> "${reservation.restaurant.name}"</p>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Vrijeme:</strong> ${formattedTime}</p>
          <p><strong>Broj gostiju:</strong> ${reservation.guests}</p>
          ${reservation.noteFromOwner ? `<p><strong>Poruka od restorana:</strong> ${reservation.noteFromOwner}</p>` : ''}
        </div>
      `;
      break;

    case 'decline':
      subject = 'Rezervacija odbijena';
      text =
        `Nažalost, vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je odbijena.\n` +
        (reservation.noteFromOwner
          ? `\nRazlog: ${reservation.noteFromOwner}`
          : '');

      html = `
        <h2>Rezervacija odbijena</h2>
        <p>Nažalost, vaša rezervacija u restoranu "${reservation.restaurant.name}" je odbijena.</p>
        ${reservation.noteFromOwner ? `<p><strong>Razlog:</strong> ${reservation.noteFromOwner}</p>` : ''}
      `;
      break;

    case 'alternative':
      subject = 'Prijedlog alternativnog termina rezervacije';
      text =
        `Restoran "${reservation.restaurant.name}" predlaže alternativni termin za vašu rezervaciju:\n` +
        `Novi datum: ${formattedSuggestedDate}\n` +
        `Novo vrijeme: ${formattedSuggestedTime}\n\n` +
        `Molimo vas da potvrdite ili odbijete ovaj prijedlog kroz aplikaciju.`;

      html = `
        <h2>Prijedlog alternativnog termina</h2>
        <p>Restoran "${reservation.restaurant.name}" predlaže alternativni termin za vašu rezervaciju:</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
          <p><strong>Novi datum:</strong> ${formattedSuggestedDate}</p>
          <p><strong>Novo vrijeme:</strong> ${formattedSuggestedTime}</p>
        </div>
        <p>Molimo vas da potvrdite ili odbijete ovaj prijedlog kroz aplikaciju.</p>
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

      html = `
        <h2>Potvrđen alternativni termin</h2>
        <p>Uspješno ste prihvatili alternativni termin za rezervaciju u restoranu "${reservation.restaurant.name}".</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
          <h3>Novi detalji rezervacije:</h3>
          <p><strong>Restoran:</strong> "${reservation.restaurant.name}"</p>
          <p><strong>Datum:</strong> ${formattedDate}</p>
          <p><strong>Vrijeme:</strong> ${formattedTime}</p>
          <p><strong>Broj gostiju:</strong> ${reservation.guests}</p>
        </div>
      `;
      break;

    case 'cancellation':
      subject = 'Rezervacija otkazana';
      text = `Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana.`;

      html = `
        <h2>Rezervacija otkazana</h2>
        <p>Vaša rezervacija u restoranu "${reservation.restaurant.name}" za ${formattedDate} u ${formattedTime} je otkazana.</p>
      `;
      break;

    default:
      throw new Error('Invalid email type');
  }

  const data = {
    from: 'Dinver <noreply@dinverapp.com>',
    to,
    subject,
    text,
    html,
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

module.exports = {
  sendVerificationEmail,
  sendReservationEmail,
};
