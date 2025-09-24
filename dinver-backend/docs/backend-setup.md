# Dinver Backend - Setup

## Preduvjeti

### 1. Instaliraj potrebne alate

**Node.js (verzija 18 ili novija):**

```bash
# Preuzmi s https://nodejs.org/ ili koristi nvm
nvm install 18
nvm use 18
```

**PostgreSQL (verzija 13 ili novija):**

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Redis (za session management):**

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Git (za kloniranje):**

```bash
# Već vjerojatno imaš, ali ako ne:
# macOS: brew install git
# Ubuntu: sudo apt install git
```

## 2. Kloniranje i osnovna postavka

```bash
# Kloniraj repo
git clone <repo-url>
cd dinver-app/dinver-backend

# Instaliraj dependencies
npm install

# Instaliraj Sequelize CLI globalno (potrebno za migracije)
npm install -g sequelize-cli
```

## 3. Baza podataka (PostgreSQL)

### Kreiraj bazu i korisnika

```bash
# Poveži se na PostgreSQL kao superuser
psql -U postgres

# U PostgreSQL konzoli:
CREATE DATABASE dinver;
CREATE USER dinver_user WITH PASSWORD '4W3:ix91N7TB';
GRANT ALL PRIVILEGES ON DATABASE dinver TO dinver_user;
\q
```

### Pokreni migracije

```bash
# U dinver-backend direktoriju
npx sequelize-cli db:migrate
```

**Napomena:** Ovo će pokrenuti 197 migracija, može potrajati nekoliko minuta.

## 🔐 Environment varijable (.env datoteka)

Kreiraj `.env` datoteku u `dinver-backend` direktoriju:

```env
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_URL=postgres://dinver_user:tI2b894e5q9e@localhost:5432/dinver

# ===========================================
# JWT & AUTHENTICATION
# ===========================================
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_here_minimum_32_characters

# ===========================================
# SESSION MANAGEMENT
# ===========================================
SESSION_SECRET=your_session_secret_here_minimum_32_characters

# ===========================================
# API KEYS
# ===========================================
MOBILE_APP_API_KEY=your_mobile_app_api_key_here
LANDING_API_KEY=your_landing_api_key_here

# ===========================================
# EXTERNAL SERVICES
# ===========================================

# OpenAI (za AI funkcionalnosti)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Google Services
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_PROJECT_ID=your_google_project_id_here
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"your_project_id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# Google Places API (za skripte)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# ===========================================
# EMAIL SERVICES (Mailgun)
# ===========================================
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_mailgun_domain_here

# ===========================================
# AWS S3 STORAGE
# ===========================================
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=eu-central-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name_here
AWS_S3_BACKUP_BUCKET_NAME=your_backup_bucket_name_here

# ===========================================
# REDIS (Session Storage)
# ===========================================
REDIS_URL=redis://localhost:6379

# ===========================================
# OPTIONAL FEATURES
# ===========================================
POSTGRES_SIMILARITY_ENABLED=false
NODE_ENV=development
PORT=3000
```

## 5. Pokretanje aplikacije

### Development mode (preporučeno)

```bash
# U dinver-backend direktoriju
npm run dev
```

### Production mode

```bash
# U dinver-backend direktoriju
npm start
```

**Aplikacija će biti dostupna na:** `http://localhost:3000`

## 6. Testiranje da li sve radi

### Testiraj bazu podataka

```bash
# Provjeri status migracija
npx sequelize-cli db:migrate:status

# Pokreni seedere (opcionalno - dodaje početne podatke)
npx sequelize-cli db:seed:all
```

### Pregled API dokumentacije

Idi na: `http://localhost:3000/api-docs` - Swagger UI dokumentacija

## 7. Dodatne postavke

### Redis server

```bash
# Provjeri da li Redis radi
redis-cli ping
# Trebao bi vratiti: PONG

# Ako ne radi, pokreni ga:
# macOS
brew services start redis

# Ubuntu
sudo systemctl start redis-server
```

### PostgreSQL servis

```bash
# Provjeri da li PostgreSQL radi
psql -U dinver_user -d dinver -c "SELECT 1;"

# Ako ne radi, pokreni ga:
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql
```

## 8. Rješavanje problema

### Problem: "Database connection failed"

```bash
# Provjeri da li je PostgreSQL pokrenut
brew services list | grep postgresql
# ili
sudo systemctl status postgresql

# Provjeri da li baza postoji
psql -U postgres -c "\l" | grep dinver

# Ako ne postoji, kreiraj je ponovno:
psql -U postgres -c "CREATE DATABASE dinver;"
psql -U postgres -c "CREATE USER dinver_user WITH PASSWORD 'tI2b894e5q9e';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE dinver TO dinver_user;"
```

### Problem: "Redis connection failed"

```bash
# Provjeri Redis status
brew services list | grep redis
# ili
sudo systemctl status redis-server

# Pokreni Redis
brew services start redis
# ili
sudo systemctl start redis-server
```

### Problem: "Migration failed"

```bash
# Provjeri status migracija
npx sequelize-cli db:migrate:status

# Ako su neke migracije neuspješne, pokreni ih ponovno
npx sequelize-cli db:migrate

# Ako trebaš rollback
npx sequelize-cli db:migrate:undo
```

### Problem: "API key invalid"

- Provjeri sve API ključeve u `.env` datoteci
- Neki servisi možda neće raditi bez valjanih ključeva
- Za osnovni development, aplikacija će raditi i bez njih

## 9. Korisne komande

```bash
# Pregled migracija
npx sequelize-cli db:migrate:status

# Rollback zadnje migracije
npx sequelize-cli db:migrate:undo

# Kreiranje nove migracije
npx sequelize-cli migration:generate --name naziv-migracije

# Kreiranje novog modela
npx sequelize-cli model:generate --name ModelName --attributes field:string

# Pokretanje seedera
npx sequelize-cli db:seed:all

# Linting
npm run lint

# Testiranje
npm test

# Pregled logova
npm run dev
# ili
npm start
```

## 10. Struktura projekta

```
dinver-backend/
├── src/
│   ├── controllers/     # API kontroleri
│   │   ├── restaurantController.js
│   │   ├── authController.js
│   │   └── ...
│   ├── routes/         # API rute
│   │   ├── appRoutes/
│   │   │   ├── restaurantRoutes.js
│   │   │   └── ...
│   │   └── ...
│   ├── models/         # Sequelize modeli
│   │   ├── restaurant.js
│   │   ├── user.js
│   │   └── ...
│   ├── middleware/     # Custom middleware
│   ├── dinver-ai/      # AI funkcionalnosti
│   └── utils/          # Utility funkcije
├── migrations/         # Database migracije (197 datoteka)
├── seeders/           # Početni podaci
├── scripts/           # Utility skripte
├── config/            # Konfiguracija baze
├── data/              # JSON podaci
├── docs/              # Dokumentacija
├── .env               # Environment varijable (KREIRAJ OVU!)
├── package.json       # Dependencies
└── server.js          # Entry point
```

## 11. Prvi koraci nakon setup-a

1. **Pokreni aplikaciju:**

   ```bash
   npm run dev
   ```

2. **Pogledaj Swagger dokumentaciju:**
   - Idi na `http://localhost:3000/api-docs`

## 12. Sigurnosne napomene

- **NIKAD** ne commitaj `.env` datoteku u git
- Koristi različite API ključeve za development i production
- Redovito ažuriraj dependencies: `npm audit` i `npm update`
- JWT secreti moraju biti minimum 32 karaktera

Ako imaš problema:

1. **Provjeri logove** - aplikacija ispisuje detaljne error poruke
2. **Provjeri da li su svi servisi pokrenuti** - PostgreSQL, Redis
3. **Provjeri `.env` datoteku** - svi potrebni ključevi moraju biti postavljeni
4. **Provjeri migracije** - `npx sequelize-cli db:migrate:status`

---
