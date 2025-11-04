# Dinver Experience - Update Summary

## 🎯 Napravljene izmjene prema zahtjevima

### 1. ✅ S3 Optimizacija za brzo učitavanje

**Promjene u** `utils/experienceMediaUpload.js`:

- **Nova folder struktura**: `experiences/{YYYY-MM}/{userId}/{kind}/{fileId}.ext`
  - Organizirano po datumu za lakše održavanje
  - Brže pretraživanje i cleanup

- **Cache headers**:
  ```javascript
  CacheControl: 'public, max-age=31536000, immutable'
  ```
  - Files se cachiraju 1 godinu (immutable content)
  - Brže učitavanje u feedu

- **Optimalan extension extraction**: Koristi funkciju umjesto split

**Rezultat**: Drastično brže učitavanje media u feedu, optimalna struktura za CDN.

---

### 2. ✅ Receipt Validation (samo approved korisnici zadnjih 14 dana)

**Promjene u** `src/controllers/experienceController.js`:

Dodana **KRITIČNA provjera** prije kreiranja experience:

```javascript
// Korisnik MORA imati:
// 1. Approved ili auto_approved račun
// 2. U TOM restoranu
// 3. Iz zadnjih 14 dana

const validReceipt = await Receipt.findOne({
  where: {
    userId,
    restaurantId,
    status: { [Op.in]: ['approved', 'auto_approved'] },
    createdAt: { [Op.gte]: fourteenDaysAgo }
  }
});

if (!validReceipt) {
  return res.status(403).json({
    error: 'Ne možete objaviti experience...',
    errorCode: 'NO_VALID_RECEIPT'
  });
}
```

**Rezultat**:
- Samo verificirani posjetitelji mogu objavljivati
- Sprječava fake experiences
- Osigurava kvalitetu sadržaja

---

### 3. ✅ Moderation premještena u Sysadmin (umjesto Admin)

**STARI NAČIN** (pogrešan):
- ❌ Bilo u `adminRoutes` → restorani bi mogli moderirati
- ❌ `checkAdmin()` middleware

**NOVI NAČIN** (ispravan):
- ✅ Premješteno u `sysadminRoutes`
- ✅ `sysadminAuthenticateToken` middleware
- ✅ Samo ti i tvoj tim možete moderirati

**Nove datoteke:**
- `src/routes/sysadminRoutes/experienceRoutes.js` - sve moderation rute
- Registrirano u `src/routes/sysadminRoutes.js`
- Obrisano iz adminRoutes

**Rezultat**: Vlasnici restorana ne mogu moderirati, samo sysadmin tim.

---

### 4. ✅ Detaljno praćenje objava (za sysadmin dashboard)

**Novi endpointi u** `experienceModerationController.js`:

#### A) Get Experience Details
```
GET /api/sysadmin/experiences/:id/details
```

Vraća **SVE**:
- Experience podatke (title, media, ratings)
- Autor info (ime, email, phone)
- Restoran info
- Moderation status (tko assign, tko odobri, kad)
- **View statistike:**
  - Total viewova
  - Unique useri
  - Anonymous viewovi
  - Avg duration (koliko dugo gledaju)
  - Avg completion rate
  - Source breakdown (odkud dolaze: EXPLORE_FEED, TRENDING_FEED, etc.)
- **Zadnjih 20 viewova** sa:
  - User info
  - Duration, completion
  - Device ID, IP adresa
- **Svi likes** sa:
  - User koji je lajkao
  - Cycle info
  - Device ID, IP
- **Svi saves** sa user info
- **Reports** (ako postoje)

#### B) Get User Experience Stats
```
GET /api/sysadmin/experiences/users/:userId/stats
```

Vraća:
- User info
- Ukupne statistike (total, approved, rejected, pending)
- Approval rate (%)
- Engagement metrics (total likes, saves, views)
- Avg likes i views per experience
- Top 5 best experiences
- Zadnjih 10 experiences

**Rezultat**: Kompletan uvid u svaku objavu i svakog usera.

---

## 📊 Svi Sysadmin Endpoints

### Moderation
- `GET /api/sysadmin/experiences/moderation/queue` - Queue po priority
- `GET /api/sysadmin/experiences/moderation/stats` - Dashboard stats
- `POST /api/sysadmin/experiences/moderation/:id/assign` - Assign moderator
- `POST /api/sysadmin/experiences/moderation/:id/approve` - Approve
- `POST /api/sysadmin/experiences/moderation/:id/reject` - Reject

### Detaljno praćenje
- `GET /api/sysadmin/experiences/:id/details` - SVE o jednoj objavi
- `GET /api/sysadmin/experiences/users/:userId/stats` - Stats po useru

### Reports
- `GET /api/sysadmin/experiences/reports` - Lista reporta
- `POST /api/sysadmin/experiences/reports/:id/review` - Review report

---

## 🔐 Autentifikacija

**Svi endpointi zahtijevaju:**
```
Authorization: Bearer <sysadmin-jwt-token>
```

**Middleware**: `sysadminAuthenticateToken`

---

## 📁 Izmijenjeni/Novi Files

### Izmijenjeni:
1. `utils/experienceMediaUpload.js` - S3 optimizacija
2. `src/controllers/experienceController.js` - Receipt validation
3. `src/routes/sysadminRoutes.js` - Registracija experience ruta

### Novi:
1. `src/routes/sysadminRoutes/experienceRoutes.js` - Sysadmin rute
2. `src/controllers/experienceModerationController.js` - Dodane 2 nove metode:
   - `getExperienceDetails()`
   - `getUserExperienceStats()`
3. `docs/EXPERIENCE_SYSADMIN_GUIDE.md` - Kompletna dokumentacija

### Obrisani:
1. `src/routes/adminRoutes/experienceModerationRoutes.js` - Više ne treba

---

## 🚀 Sljedeći koraci

### Backend (gotovo) ✅
- [x] S3 optimizacija
- [x] Receipt validation
- [x] Sysadmin moderation
- [x] Detaljno praćenje

### Frontend (TODO)
- [ ] Kreirati sysadmin page za moderation queue
- [ ] Detaljni prikaz pojedine objave
- [ ] User statistics dashboard
- [ ] Report management interface

---

## 💡 Za frontend development

### Primjer poziva za queue:
```javascript
const response = await fetch('/api/sysadmin/experiences/moderation/queue?state=PENDING', {
  headers: {
    'Authorization': `Bearer ${sysadminToken}`
  }
});
```

### Primjer za detalje objave:
```javascript
const response = await fetch(`/api/sysadmin/experiences/${experienceId}/details`, {
  headers: {
    'Authorization': `Bearer ${sysadminToken}`
  }
});

// Response sadrži SVE:
// - experience data
// - moderation status
// - viewStats (total, unique, avg duration, etc.)
// - recentViews (zadnjih 20)
// - likes array (svi koji su lajkali)
// - saves array (svi koji su saveali)
// - reports array
```

---

## 📊 Testiranje

### 1. Testiraj Receipt Validation
```bash
# Pokušaj kreirati experience bez računa → treba failati
curl -X POST http://localhost:3000/api/app/experiences \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"restaurantId":"...","title":"Test","media":[...]}'

# Expected: 403 s errorCode: NO_VALID_RECEIPT
```

### 2. Testiraj Sysadmin Queue
```bash
curl http://localhost:3000/api/sysadmin/experiences/moderation/queue \
  -H "Authorization: Bearer $SYSADMIN_TOKEN"

# Expected: Lista pending experiences
```

### 3. Testiraj Details Endpoint
```bash
curl http://localhost:3000/api/sysadmin/experiences/{id}/details \
  -H "Authorization: Bearer $SYSADMIN_TOKEN"

# Expected: SVE statistike o toj objavi
```

---

## ⚠️ Važno za znati

### Receipt pravila:
- Korisnik **MORA imati approved račun** iz zadnjih 14 dana u **TOM** restoranu
- Bez toga **NE MOŽE objaviti** experience
- Frontend treba provjeriti prije nego što pokaže "Create Experience" opciju

### Moderation workflow:
1. User kreira experience → status: PENDING
2. Ulazi u ModerationQueue
3. **Sysadmin** (ne admin restorana!) odobrava ili odbija
4. Nakon odluke → notification useru

### SLA tracking:
- Svaki experience ima 24h rok za review
- Cron job svaki sat provjerava overdue items
- `slaViolated: true` ako nije reviewano na vrijeme

---

## 📞 Support

Za pitanja ili probleme:
- Provjeri `docs/EXPERIENCE_SYSADMIN_GUIDE.md` za detalje
- Provjeri `docs/EXPERIENCE_API.md` za sve endpointe

**Verzija**: 1.0.0
**Datum**: 2025-11-04
**Autor**: Dinver Backend Team
