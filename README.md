# dinver-app

## Kreiranje novog entiteta i migriranje baze

1. **Kreiraj model:**

   Koristi Sequelize CLI za generiranje novog modela. Na primjer, za kreiranje modela `Product` s atributima `name` i `price`:

   ```bash
   npx sequelize-cli model:generate --name Product --attributes name:string,price:decimal
   ```

2. **Pregledaj i prilagodi model:**

   Otvori generiranu datoteku u `src/models` i prilagodi model prema potrebama.

3. **Kreiraj migraciju:**

   Nakon generiranja modela, automatski će se kreirati i migracijska datoteka u `migrations` direktoriju. Pregledaj i prilagodi migraciju ako je potrebno.

4. **Pokreni migracije:**

   Pokreni migracije kako bi primijenio promjene u bazi podataka:

   ```bash
   npx sequelize-cli db:migrate
   ```

5. **Kreiraj seeder (opcionalno):**

   Ako želiš dodati početne podatke u bazu, generiraj seeder:

   ```bash
   npx sequelize-cli seed:generate --name demo-product
   ```

   Uredi generiranu seeder datoteku u `seeders` direktoriju i dodaj željene podatke.

6. **Pokreni seedere (opcionalno):**

   Pokreni seedere kako bi dodao početne podatke u bazu:

   ```bash
   npx sequelize-cli db:seed:all
   ```

   Pokreni jednog seeder:

   ```bash
   npx sequelize-cli db:seed --seed 20241127175719-demo-user
   ```

## Kreiranje i korištenje seedera

1. **Kreiraj seeder:**

   Kada želiš dodati početne podatke za novi entitet, generiraj seeder pomoću Sequelize CLI. Na primjer, za entitet `Product`:

   ```bash
   npx sequelize-cli seed:generate --name demo-product
   ```

2. **Uredi seeder datoteku:**

   Otvori generiranu seeder datoteku u `seeders` direktoriju. Dodaj podatke koje želiš unijeti u bazu. Na primjer:

   ```javascript
   "use strict";

   module.exports = {
     up: async (queryInterface, Sequelize) => {
       return queryInterface.bulkInsert(
         "Products",
         [
           {
             name: "Example Product",
             price: 19.99,
             createdAt: new Date(),
             updatedAt: new Date(),
           },
         ],
         {}
       );
     },

     down: async (queryInterface, Sequelize) => {
       return queryInterface.bulkDelete("Products", null, {});
     },
   };
   ```

3. **Pokreni seedere:**

   Nakon što si uredio seeder datoteku, pokreni seedere kako bi dodao podatke u bazu:

   ```bash
   npx sequelize-cli db:seed:all
   ```

4. **Uklanjanje seed podataka (opcionalno):**

   Ako želiš ukloniti seed podatke, možeš pokrenuti:

   ```bash
   npx sequelize-cli db:seed:undo
   ```
