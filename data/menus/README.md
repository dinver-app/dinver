# JSON Menu Import System

Ovaj sistem omogućava import menija iz JSON fajlova direktno u bazu podataka.

## Struktura foldera

```
data/menus/
├── restaurant-slug-1/
│   ├── food-menu.json
│   ├── drink-menu.json
│   └── special-menu.json
├── restaurant-slug-2/
│   ├── food-menu.json
│   └── drink-menu.json
└── README.md
```

## Format JSON fajla

### Kategorije
```json
{
  "name": {
    "hr": "Naziv na hrvatskom",
    "en": "Name in English"
  },
  "description": {
    "hr": "Opis na hrvatskom",
    "en": "Description in English"
  }
}
```

### Stavke menija
```json
{
  "name": {
    "hr": "Naziv stavke na hrvatskom",
    "en": "Item name in English"
  },
  "description": {
    "hr": "Opis stavke na hrvatskom",
    "en": "Item description in English"
  },
  "price": 15.50,
  "categoryName": "Naziv kategorije (mora se podudarati s postojećom)",
  "hasSizes": false,
  "defaultSizeName": null,
  "sizes": []
}
```

### Stavke s različitim veličinama
```json
{
  "name": {
    "hr": "Pizza margherita",
    "en": "Pizza margherita"
  },
  "description": {
    "hr": "Opis pizze",
    "en": "Pizza description"
  },
  "price": 15.00,
  "categoryName": "Pizza",
  "hasSizes": true,
  "defaultSizeName": "Standardna",
  "sizes": [
    {
      "name": "Mala",
      "price": 12.00
    },
    {
      "name": "Velika",
      "price": 18.00
    }
  ]
}
```

## Kako koristiti

### 1. Kreirajte folder za restoran
- Folder mora imati isti naziv kao `slug` restorana u bazi
- Npr. ako je slug `taverna-alinea`, folder se zove `taverna-alinea`

### 2. Dodajte JSON fajlove
- Možete imati više JSON fajlova u istom folderu
- Sistem će obraditi sve `.json` fajlove

### 3. Import kroz API
```bash
# Lista dostupnih menija
GET /api/sysadmin/json-menu-import/list

# Import menija za određeni restoran
POST /api/sysadmin/json-menu-import/taverna-alinea/import
{
  "menuType": "food"  // ili "drink"
}
```

## Napomene

- **Kategorije**: Ako kategorija već postoji, koristit će se postojeća
- **Stavke**: Ako stavka već postoji, preskočit će se (duplicate prevention)
- **Prevod**: Automatski se prevodi na engleski ako nije naveden
- **Audit**: Sve promjene se bilježe u audit log
- **Pozicije**: Automatski se dodjeljuju pozicije za kategorije i stavke

## Primjer korištenja

1. Kreirajte folder `data/menus/taverna-alinea/`
2. Dodajte `food-menu.json` s kategorijama i stavkama
3. Pozovite API: `POST /api/sysadmin/json-menu-import/taverna-alinea/import`
4. Sistem će importati sve kategorije i stavke u bazu

## Troubleshooting

- **Restoran nije pronađen**: Provjerite da slug postoji u bazi
- **Folder nije pronađen**: Provjerite putanju `data/menus/restaurant-slug/`
- **JSON greška**: Provjerite format JSON fajla
- **Kategorija nije pronađena**: Provjerite da `categoryName` odgovara nazivu kategorije u JSON-u
