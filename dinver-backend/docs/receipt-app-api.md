# Receipt App API Documentation

Dokumentacija za mobilne app rute za upravljanje računima (receipts).

## Autentifikacija

Sve rute zahtijevaju:

- **API Key**: `appApiKeyAuth` middleware
- **JWT Token**: `appAuthenticateToken` middleware (korisnik mora biti prijavljen)

---

## POST `/receipts`

Upload slike računa i kreiranje zapisa za provjeru.

### Svrha

Korisnici šalju fotografiju računa koja se automatski obrađuje OCR-om, kompresira i sprema u S3. Račun se kreira sa statusom `pending` i čeka na provjeru od strane sysadmina.

### Request

**Method**: `POST`  
**Content-Type**: `multipart/form-data`

**Body Parameters**:

- `image` (file, **required**): Slika računa
  - Maksimalna veličina: **10MB**
  - Podržani formati: JPG, JPEG, PNG, WEBP, HEIC, HEIF
- `locationLat` (number, optional): Geografska širina gdje je račun poslan
- `locationLng` (number, optional): Geografska dužina gdje je račun poslan

### Response

**Success (201 Created)**:

```json
{
  "message": "Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.",
  "receiptId": 123
}
```

**Error Responses**:

| Status Code | Error Message                                                        | Opis                                  |
| ----------- | -------------------------------------------------------------------- | ------------------------------------- |
| 400         | `No image provided`                                                  | Nije poslana slika u requestu         |
| 400         | `Slika je prevelika. Maksimalna veličina je 10MB.`                   | Prekoračena maksimalna veličina       |
| 400         | `Nepodržan format slike. Molimo koristite: JPG, PNG, WEBP ili HEIC.` | Format slike nije podržan             |
| 400         | `Ovaj račun je već poslan na provjeru`                               | Duplikat računa (isti image hash)     |
| 400         | `NOT_RECEIPT`                                                        | OCR je detektirao da slika nije račun |
| 403         | `Morate verificirati email i broj mobitela prije slanja računa`      | Korisnik nije verificiran             |
| 500         | `Failed to upload receipt`                                           | Greška na serveru                     |

**NOT_RECEIPT Error Response**:

```json
{
  "error": "NOT_RECEIPT",
  "message": "Detaljna poruka o zašto nije račun",
  "reason": "Razlog zašto OCR nije prepoznao račun",
  "confidence": 0.85
}
```

### Dodatne informacije

- **Image Processing**: Slika se automatski kompresira ako je šira od 1600px (JPEG, quality 80)
- **OCR Extraction**: Automatski se pokušava izvući OIB, JIR, ZKI, totalAmount, issueDate, issueTime
- **Duplicate Detection**: Provjerava se MD5 hash slike da spriječi duplikate
- **Image Storage**: Slika se sprema u S3 pod `receipts/{userId}/`
- **Auto-rotation**: Slika se automatski rotira prema EXIF podacima

---

## GET `/receipts`

Dohvaćanje liste računa za trenutnog korisnika.

### Svrha

Vraća paginiranu listu svih računa koje je korisnik poslao, sortirane po datumu slanja (najnoviji prvo).

### Request

**Method**: `GET`

**Query Parameters**:

- `page` (number, optional): Broj stranice (default: `1`)
- `limit` (number, optional): Broj rezultata po stranici (default: `20`)

### Response

**Success (200 OK)**:

```json
{
  "receipts": [
    {
      "id": 123,
      "userId": 456,
      "imageUrl": "https://cdn.example.com/receipts/456/abc123.jpg",
      "status": "pending",
      "totalAmount": 45.5,
      "oib": "12345678901",
      "jir": "ABC123DEF456",
      "zki": "XYZ789",
      "issueDate": "2024-01-15",
      "issueTime": "14:30:00",
      "locationLat": 45.1234,
      "locationLng": 15.5678,
      "pointsAwarded": null,
      "submittedAt": "2024-01-15T14:35:00.000Z",
      "verifiedAt": null,
      "restaurant": {
        "id": 789,
        "name": "Restoran Ime"
      }
    }
  ],
  "totalCount": 50,
  "totalPages": 3,
  "currentPage": 1
}
```

**Receipt Object Fields**:

- `id`: ID računa
- `userId`: ID korisnika koji je poslao račun
- `imageUrl`: Signed URL za sliku (expira nakon određenog vremena)
- `status`: Status računa (`pending`, `approved`, `rejected`)
- `totalAmount`: Ukupan iznos računa (null ako još nije verificiran)
- `oib`: OIB restorana (može biti null)
- `jir`: JIR računa (može biti null)
- `zki`: ZKI računa (može biti null)
- `issueDate`: Datum izdavanja računa (YYYY-MM-DD format)
- `issueTime`: Vrijeme izdavanja računa (HH:mm:ss format)
- `locationLat`: Geografska širina (može biti null)
- `locationLng`: Geografska dužina (može biti null)
- `pointsAwarded`: Broj bodova dodijeljenih (null dok je pending)
- `submittedAt`: Datum i vrijeme slanja računa
- `verifiedAt`: Datum i vrijeme provjere (null dok je pending)
- `restaurant`: Objekt restorana (null ako još nije povezan)

**Error Responses**:

| Status Code | Error Message            | Opis              |
| ----------- | ------------------------ | ----------------- |
| 500         | `Failed to get receipts` | Greška na serveru |

### Dodatne informacije

- **Pagination**: Rezultati su paginirani, default 20 po stranici
- **Sorting**: Računi su sortirani po `submittedAt` DESC (najnoviji prvo)
- **Image URLs**: Sve `imageUrl` vrijednosti su signed URLs koje se generiraju dinamički
- **Restaurant Association**: Restoran se može automatski povezati na temelju OIB-a

---

## Statusi Računa

- **`pending`**: Račun je poslan i čeka na provjeru od strane sysadmina
- **`approved`**: Račun je odobren i korisnik je dobio bodove
- **`rejected`**: Račun je odbijen (sadrži `rejectionReason`)

---

## Napomene

1. **Verifikacija korisnika**: Korisnik mora imati verificiran email i telefon prije slanja računa
2. **OCR Processing**: OCR se pokreće automatski, ali ne blokira request ako ne uspije
3. **Image Compression**: Veće slike se automatski kompresiraju prije uploada
4. **Duplicate Prevention**: Sistem automatski detektira duplikate na temelju MD5 hasha slike
5. **Points Award**: Bodovi se dodjeljuju tek nakon što sysadmin odobri račun (status `approved`)
