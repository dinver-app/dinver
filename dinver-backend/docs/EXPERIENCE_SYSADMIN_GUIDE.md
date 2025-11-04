# Dinver Experience - Sysadmin Guide

## 🔐 Sysadmin Endpoints za Experience Moderation

Svi endpointi zahtijevaju **sysadmin autentifikaciju**.

---

## 📊 Moderation Queue

### Get Moderation Queue
```
GET /api/sysadmin/experiences/moderation/queue
```

**Query Parameters:**
- `state` - PENDING, IN_REVIEW, DECIDED, ESCALATED (default: PENDING)
- `priority` - LOW, NORMAL, HIGH, URGENT
- `page`, `limit`

**Response:**
```json
{
  "data": {
    "queue": [
      {
        "id": "queue_uuid",
        "experienceId": "exp_uuid",
        "state": "PENDING",
        "priority": "NORMAL",
        "slaDeadline": "2025-11-05T18:00:00Z",
        "experience": {
          "id": "exp_uuid",
          "title": "...",
          "author": {...},
          "restaurant": {...},
          "media": [...]
        }
      }
    ]
  }
}
```

---

### Approve Experience
```
POST /api/sysadmin/experiences/moderation/:id/approve
```

**Body:**
```json
{
  "notes": "Odlična objava, sve u redu"
}
```

---

### Reject Experience
```
POST /api/sysadmin/experiences/moderation/:id/reject
```

**Body:**
```json
{
  "reason": "Neprikladan sadržaj koji krši pravila zajednice",
  "notes": "NSFW sadržaj"
}
```

---

## 📈 Detaljne Statistike

### Get Experience Details (SVE STATISTIKE)
```
GET /api/sysadmin/experiences/:id/details
```

**Vraća:**
- Experience podatke (title, description, ratings, media)
- Autora (ime, email, profil)
- Restoran info
- **Moderation status** (tko je assign, kad odobren/odbijen)
- **View statistike:**
  - Ukupno viewova
  - Unique useri
  - Anonymous viewova
  - Prosječno trajanje gledanja (ms)
  - Prosječna completion rate
  - Breakdown po source-u (EXPLORE_FEED, TRENDING_FEED, etc.)
- **Zadnjih 20 viewova** sa:
  - User info (ako je logiran)
  - Duration
  - Completion rate
  - Source
  - Device ID
  - IP adresa
- **Svi likes** sa:
  - User info
  - Cycle info
  - Device ID, IP
  - Timestamp
- **Svi saves** sa:
  - User info
  - Device ID, IP
  - Timestamp
- **Reports** (ako postoje)

**Response primjer:**
```json
{
  "data": {
    "experience": {...},
    "moderation": {
      "state": "DECIDED",
      "decision": "APPROVED",
      "decidedBy": {...},
      "decidedAt": "..."
    },
    "viewStats": {
      "totalViews": 1250,
      "uniqueUsers": 890,
      "anonymousViews": 360,
      "avgDuration": 4500,
      "avgCompletionRate": 0.78,
      "sourceBreakdown": {
        "EXPLORE_FEED": 800,
        "TRENDING_FEED": 300,
        "USER_PROFILE": 100,
        "RESTAURANT_PAGE": 50
      }
    },
    "recentViews": [...],
    "likes": [...],
    "saves": [...],
    "reports": [...]
  }
}
```

---

### Get User Experience Stats
```
GET /api/sysadmin/experiences/users/:userId/stats
```

**Vraća:**
- User info
- **Ukupne statistike:**
  - Ukupno experiences
  - Approved
  - Rejected
  - Pending
  - Approval rate (%)
- **Engagement:**
  - Total likes
  - Total saves
  - Total views
  - Avg likes per experience
  - Avg views per experience
- **Top 5 experiences** (po engagement score)
- **Zadnjih 10 experiences**

---

## 📋 Reports

### Get Reports
```
GET /api/sysadmin/experiences/reports
```

**Query:**
- `state` - OPEN, IN_REVIEW, RESOLVED, DISMISSED

---

### Review Report
```
POST /api/sysadmin/experiences/reports/:id/review
```

**Body:**
```json
{
  "state": "RESOLVED",
  "resolution": "Sadržaj uklonjen, korisnik upozoren",
  "actionTaken": "CONTENT_REMOVED"
}
```

**Action Taken opcije:**
- NONE
- CONTENT_REMOVED
- USER_WARNED
- USER_SUSPENDED
- FALSE_REPORT

---

## 📊 Dashboard Statistike

### Get Overall Stats
```
GET /api/sysadmin/experiences/moderation/stats
```

**Response:**
```json
{
  "data": {
    "queue": {
      "pending": 12,
      "inReview": 3,
      "slaViolated": 1
    },
    "experiences": {
      "totalApproved": 1523,
      "totalRejected": 87
    },
    "reports": {
      "open": 5
    }
  }
}
```

---

## ⚠️ Važna pravila

### Receipt Validation
**Korisnici mogu objaviti experience SAMO ako:**
- Imaju **approved** ili **auto_approved** račun
- Račun je iz **tog restorana**
- Račun je iz **zadnjih 14 dana**

Ako ne ispunjavaju uvjete, dobivaju error:
```json
{
  "error": "Ne možete objaviti experience u ovom restoranu. Potreban je odobren račun iz zadnjih 14 dana.",
  "errorCode": "NO_VALID_RECEIPT"
}
```

### SLA (24 sata)
- Svaki experience ima **slaDeadline** (24h od kreiranja)
- Ako prođe deadline bez odluke → `slaViolated: true`
- Cron job provjerava svaki sat

### Auto-eskalacija
- Ako experience dobije **3+ reporta** → automatski se eskalira na **URGENT** priority

---

## 🚀 S3 Optimizacija

### Storage struktura:
```
experiences/{YYYY-MM}/{userId}/{kind}/{fileId}.ext
```

Primjer:
```
experiences/2025-11/user123/image/abc-def-123.jpg
experiences/2025-11/user456/video/xyz-789.mp4
```

**Prednosti:**
- Brže učitavanje (organizirano po datumu)
- Lako cleanup starih fileova
- Cache headers: `public, max-age=31536000, immutable` (1 godina)

---

## 🎯 Workflow

### 1. Korisnik kreira Experience
- Upload media → S3 (pre-signed URL)
- Kreiranje experience → status: **PENDING**
- Automatski ulazi u **ModerationQueue**

### 2. Sysadmin moderira
- Vidi u queue (prikazano po priority)
- Može assignati sebi ili drugom moderatoru
- Pregleda media, title, description
- **APPROVE** ili **REJECT**

### 3. Nakon odluke
- **Approved** → pojavljuje se u feedu, korisnik dobiva notifikaciju
- **Rejected** → ne pojavljuje se, korisnik dobiva notifikaciju s razlogom

### 4. Praćenje
- Detaljno praćenje svakog posta (viewovi, likes, saves)
- Praćenje po useru (koliko objava, approval rate, engagement)

---

## 💡 Korisni Queryi za Debugging

### Provjeri račune usera
```sql
SELECT * FROM "Receipts"
WHERE "userId" = 'user_uuid'
  AND "restaurantId" = 'rest_uuid'
  AND status IN ('approved', 'auto_approved')
  AND "createdAt" >= NOW() - INTERVAL '14 days'
ORDER BY "createdAt" DESC;
```

### Provjeri pending experiences
```sql
SELECT e.id, e.title, u."firstName", u."lastName", r.name as restaurant, e."createdAt"
FROM "Experiences" e
JOIN "Users" u ON e."userId" = u.id
JOIN "Restaurants" r ON e."restaurantId" = r.id
WHERE e.status = 'PENDING'
ORDER BY e."createdAt" ASC;
```

### Provjeri SLA violations
```sql
SELECT * FROM "ExperienceModerationQueues"
WHERE "slaViolated" = true
  AND state != 'DECIDED';
```

---

## 📞 Support

Za pitanja ili probleme, kontaktirajte Dinver backend tim.

**Verzija**: 1.0.0
**Datum**: 2025-11-04
