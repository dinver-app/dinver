# Push Notifikacije - Dokumentacija

## Pregled

Backend je konfiguriran za slanje push notifikacija korisnicima kroz Expo Server SDK. Sve notifikacije se šalju s backenda zbog sigurnosti i kontrole.

## Instalacija

```bash
npm install expo-server-sdk
```

## Baza podataka

### Migracija

Dodana je migracija `20250805152454-add-push-token-to-users.js` koja dodaje `pushToken` field u `Users` tablicu.

### User Model

```javascript
pushToken: {
  type: DataTypes.STRING,
  allowNull: true,
  unique: true,
}
```

## API Endpoints

### POST /users/:id/push-token

Ažurira push token za određenog korisnika.

**Request:**

```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response:**

```json
{
  "message": "Push token updated successfully",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

## Servis funkcije

### `sendPushNotification(pushTokens, message)`

Slanje notifikacija na listu push tokena.

**Parametri:**

- `pushTokens` (Array): Lista push tokena
- `message` (Object): Objekt s porukom
  - `title` (string): Naslov notifikacije
  - `body` (string): Sadržaj notifikacije
  - `data` (Object): Dodatni podaci (opcionalno)
  - `sound` (string): Zvuk notifikacije (opcionalno)
  - `badge` (number): Badge broj (opcionalno)

### `sendPushNotificationToUser(pushToken, message)`

Slanje notifikacije jednom korisniku.

### `sendPushNotificationToUsers(userIds, message)`

Slanje notifikacije više korisnika preko user ID-jeva.

### `sendPushNotificationToAllUsers(message)`

Slanje notifikacije svim korisnicima s push tokenom.

## Primjeri korištenja

### 1. Slanje notifikacije o novom restoranu

```javascript
await sendPushNotificationToAllUsers({
  title: 'Novi restoran dodan! 🍽️',
  body: `Restoran "${restaurantName}" je dodan u Dinver aplikaciju.`,
  data: {
    type: 'new_restaurant',
    restaurantId: restaurantId,
    restaurantName: restaurantName,
  },
});
```

### 2. Slanje notifikacije o novom achievementu

```javascript
await sendPushNotificationToUser(userPushToken, {
  title: 'Novi achievement! 🏆',
  body: `Osvojili ste "${achievementName}" achievement!`,
  data: {
    type: 'achievement',
    achievementId: achievementId,
  },
});
```

### 3. Slanje notifikacije o ažuriranju menija

```javascript
await sendPushNotificationToUsers(restaurantUserIds, {
  title: 'Novi meni! 📋',
  body: `Restoran "${restaurantName}" je ažurirao svoj meni.`,
  data: {
    type: 'menu_update',
    restaurantId: restaurantId,
  },
});
```

## Sigurnost

- Sve notifikacije se šalju s backenda
- Push tokeni se validiraju prije slanja
- Nevažeći tokeni se logiraju i preskaču
- Error handling osigurava da neuspjele notifikacije ne prekidaju glavni flow

## Logiranje

Sve notifikacije se logiraju s informacijama o:

- Broju uspješno poslanih notifikacija
- Broju neuspješnih notifikacija
- Detaljima o greškama

## Frontend integracija

Frontend (React Native) treba:

1. Zatražiti dozvolu za notifikacije
2. Generirati Expo push token
3. Poslati token na backend endpoint
4. Obraditi notifikacije kada stignu

## Troubleshooting

### Česti problemi:

1. **Invalid push tokens**: Provjerite da li su tokeni u ispravnom formatu
2. **No valid tokens**: Provjerite da li korisnici imaju spremljene push tokene
3. **Network errors**: Provjerite internet vezu i Expo servis status

### Debugging:

```javascript
// Provjeri validnost tokena
const isValid = Expo.isExpoPushToken(token);

// Logiraj rezultate slanja
const result = await sendPushNotification(tokens, message);
console.log('Success:', result.success, 'Failure:', result.failure);
```
