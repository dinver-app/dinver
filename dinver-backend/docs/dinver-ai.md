# Dinver AI documentation

Ideja je napraviti GPT bota koji ce odgovorati korisnicima, pretrazivati i slicno tako sto cu mu ja sve namjestiti sta ima omoguceno sta moze gledati i stogod moze izvuc iz toga i odgovoriti to treba. Ne smije odgovarati na pitanja van Dinver-a, samo ono sto zna od mojih podataka, za sve ostalo kaze da ne moze to i moze predloziti neki odgovor.

Zelim napraviti chat kao sto je recimo na OpenTable, gdje sam pitao "Dokad radi X restoran nedjeljom" on je odgovorio: "SOI Fusion Bar je zatvoren nedjeljom - tako da nedjeljom nije moguće uživati u njihovim fusion delicijama. Ako planiras posjetu, restoranu su vrata otvorena od ponedjeljka do subote." Zatim sam ja nastavio, "Kada onda otvaraju ponedjeljkom?", bot odgovara: "SOI Fusion Bar otvara u ponedjeljka u 12:00 sati i radi do 22:00. Ovo je izvrsno mjesto za rucak ili veceru s modernim azijskim jelima. Ako planiras pohod na ramen, tuna poke ili neko od fusion predjela vec potekom tjedna, znas gdje mozes navratiti", zatim sam testirao s pitanjem "Jel trava zelena?" on je odgovorio "Ova informacija nije dostupna jer mogu odgovarati samo na pitanja vezana uz restorane.." Ugl. to je ideja i da ja napravim da korisnik moze bilo sta pitati a da gpt s kombinacijom baze ili cega vec dodje do informacija i lijepo korisniku odgovori, cak nesto mozda ponudi ili slicno i da ne moze odgovarati na ostala pitanja. Bez brige ja cu staviti gore da AI moze pogrijesiti, ali ako cu mu vracati jednostavne jsone, onda su premale sanse da ce on pogrijesiti.

Odgovarat mora na jeziku na kojem ga pita 99% da ce sada u pocetku biti samo hr ili en

u .env ima OPENAI_API_KEY, gdje je API key za GPT

Prvo i ono najbitnije je da pretrazuje samo informacije Restorana partnera, kako znat tko je partner. Postoji API:

restaurantController.js -> getPartners()

Tu ce dobiti listu partnera i po tome gleda, ako korisnik pita nešto kao "Ima li neki restoran blizu mene?", uvijek ako će sta searchat to ce biti partneri, takodjer partnere moze dobiti direktno iz SQL tako sto ce dohvatiti restorane i gledati isClaimed: true, jer su to partneri.

Model restaurant mozes pogledati pod models/restaurant.js

To je prvo i najvaznije pravilo. Sada ću proci detaljnije sta sve skupljamo vezano za jedan restoran, da znas koje sve potencijalne "intents" moras kreirati, ili funkcije kako god.

{
"id": "e4a35d75-511d-4b5c-a6a5-2b624788690a",
"name": "Taverna Alinea",
"address": "Glagoljaška ulica 54",
"place": "Vinkovci",
"latitude": 45.29236390000001,
"longitude": 18.8033662,
"phone": "032 540 231",
"rating": 5,
"userRatingsTotal": 1,
"priceLevel": 2,
"thumbnailUrl": "https://d1l99nqkusml7l.cloudfront.net/restaurant_thumbnails/fe4ed201-3ad1-4302-b79c-733423c32770.jpg?Expires=1757600789&Key-Pair-Id=K3PYRDMRTY538S&Signature=OEYb93W-TRWDlgxilFugIz1dklIV-JenTanSUrlAx7CzmWsJ5-X48jVsRqMfj~VoPczdvrD4CCPD4tAtD0BnhVNRoS-4r6N1z8Q8MFXHR~ds-zs3wvsm84EQTaz~hIRMBvMByR6tyDUdFs-LklllmKbBDu87XFi30C~EuVROnulmhG-Z7ho8hs1tz3beIHFIsfVG4NA8EhSmbeIjKcwkN6M48zLJldp-nGMwkdwIVilRI5xeS3Bv1jY6Bqg-yKS8msREj8-H9tjgaRYwM8GaL9hPKGsQGBQp1RMhlEt3l3ijuyhNr7URFjHXBkj0xAB2qCRoOyAyU4nscvrI8315Hw__",
"slug": "taverna-alinea",
"isClaimed": true,
"foodTypes": [
{
"id": 47,
"nameEn": "Pizza",
"nameHr": "Pizza",
"icon": "🍕"
},
{
"id": 49,
"nameEn": "Burgers",
"nameHr": "Burgeri",
"icon": "🍔"
},
{
"id": 50,
"nameEn": "Meat",
"nameHr": "Meso",
"icon": "🥩"
},
{
"id": 52,
"nameEn": "Pasta",
"nameHr": "Tjestenina",
"icon": "🍝"
},
{
"id": 53,
"nameEn": "Salads",
"nameHr": "Salate",
"icon": "🥗"
},
{
"id": 54,
"nameEn": "Rice Dishes",
"nameHr": "Jela od riže",
"icon": "🍚"
},
{
"id": 55,
"nameEn": "Seafood",
"nameHr": "Morski plodovi",
"icon": "🍤"
},
{
"id": 59,
"nameEn": "Desserts & Sweets",
"nameHr": "Deserti i slastice",
"icon": "🍰"
},
{
"id": 69,
"nameEn": "Ćevapi",
"nameHr": "Ćevapi",
"icon": "🍢"
},
{
"id": 70,
"nameEn": "Chicken",
"nameHr": "Piletina",
"icon": "🍗"
},
{
"id": 71,
"nameEn": "Pancakes",
"nameHr": "Palačinke",
"icon": "🥞"
},
{
"id": 76,
"nameEn": "Lasagna",
"nameHr": "Lazanje",
"icon": "🍝"
},
{
"id": 77,
"nameEn": "Croatian Cuisine",
"nameHr": "Hrvatska kuhinja",
"icon": "🇭🇷"
},
{
"id": 89,
"nameEn": "Soups",
"nameHr": "Juhe",
"icon": "🍲"
},
{
"id": 64,
"nameEn": "BBQ & Grill",
"nameHr": "Jela s roštilja",
"icon": "🔥"
}
],
"establishmentTypes": [
{
"id": 16,
"nameEn": "Restaurant",
"nameHr": "Restoran",
"icon": "🍽"
},
{
"id": 17,
"nameEn": "Cafe",
"nameHr": "Kafić",
"icon": "☕"
}
],
"establishmentPerks": [
{
"id": 28,
"nameEn": "Outdoor Seating",
"nameHr": "Vanjska terasa",
"icon": "🌳"
},
{
"id": 38,
"nameEn": "Takeaway Available",
"nameHr": "Dostupna hrana za van",
"icon": "🏪"
},
{
"id": 39,
"nameEn": "Coffee To Go Available",
"nameHr": "Dostupna kava za van",
"icon": "☕"
},
{
"id": 41,
"nameEn": "Play Areas",
"nameHr": "Igrališta",
"icon": "🎢"
},
{
"id": 50,
"nameEn": "Signature Desserts",
"nameHr": "Prepoznatljivi deserti",
"icon": "🍰"
},
{
"id": 53,
"nameEn": "Air-Conditioned Space",
"nameHr": "Klimatiziran prostor",
"icon": "❄️"
},
{
"id": 43,
"nameEn": "High Chairs Available",
"nameHr": "Dostupne stolice za djecu",
"icon": "🍼"
}
],
"mealTypes": [
{
"id": 1,
"nameEn": "Breakfast",
"nameHr": "Doručak",
"icon": "🍳"
},
{
"id": 3,
"nameEn": "Lunch",
"nameHr": "Ručak",
"icon": "🍝"
},
{
"id": 4,
"nameEn": "Dinner",
"nameHr": "Večera",
"icon": "🍽️"
}
],
"dietaryTypes": [
{
"id": 1,
"nameEn": "Vegetarian",
"nameHr": "Vegetarijanski",
"icon": "🥬"
}
],
"priceCategoryId": 1,
"reservationEnabled": true,
"websiteUrl": "https://www.tavernaalinea.com.hr/",
"fbUrl": "https://web.facebook.com/tavernaalinea/?locale=hr_HR&_rdc=1&_rdr#",
"igUrl": "https://www.instagram.com/taverna_alinea_vk/?hl=en",
"ttUrl": "https://www.tiktok.com/@taverna.alinea",
"email": "",
"images": [
"https://d1l99nqkusml7l.cloudfront.net/restaurant_images/undefined/70da7329-de19-4dd3-9149-abcebd728a2a.jpg?Expires=1757600789&Key-Pair-Id=K3PYRDMRTY538S&Signature=SNz8NEj7JKC3qzsLT4SpO9jHPer9-NW6As3yFvmQj2ec-PiX~DWwUKtgJH0vx243HK7MSUuO-NUi-d8jrc5TpQAddGjkF9dphaBlPpKy3KEY7B~dTwKPlZuQ-XdlXIlmqCObrMIG0a~pNXgvXxq1sf8MJvB~KuBRBV2RGHJrklwzbvR-OUeRq1gMU040Nc5HeHbIvq7pq1bQFqHO7caHwyVVkOLTwrG~zlwIugz2S8lB3hCbuKfu4h~mkNU2RS1cpAoEwAWfFxiyFY3cRRlbLLQ9-K3VdfkpZht2JkMJrBbjDkA4CJ9WbZ81~U489JWDPfHITNhXc5uq~Vj5AFGMpQ__",
"https://d1l99nqkusml7l.cloudfront.net/restaurant_images/undefined/bc57a4de-9164-4b9d-bb8a-8d494fee1592.jpg?Expires=1757600789&Key-Pair-Id=K3PYRDMRTY538S&Signature=I-P8IvDWxMO3BQjW7g-AQhEPr8lQRNQx3pVuLwrNDx0E5lW-UHjtoxVUzvLH38xPXA1pnSNtDoch3Z88ckbP-e~F8J977BX49GfbdD3kTwV-qfrWWCAUSiLX2VOh6BmOElVVJYk5bT1zeo~eLC5CwT8zJf5iyt-EaD2Jgy7vLvUntHZwOwdV2a6W~8~6pue9thUhLKSeUANwuNaWfKdBjxllGJzfWMe-z65OpjUf-pa64qZuCkUL8b0ShhKlyiyz5QEoLnpZPb6CYP4qB41UPag7tOkvIncKjYSvo61jimGOo9-B6Mm88U8EBqnqVSGe9U6Sd6eb1x0FGZbx6rTk9g__",
"https://d1l99nqkusml7l.cloudfront.net/restaurant_images/undefined/fc98c0b8-f415-49d5-bd25-9ad5934a36f6.avif?Expires=1757600789&Key-Pair-Id=K3PYRDMRTY538S&Signature=L5odWmf8c8KgbG0sUxDlIJOb4pfQ4FD-hd9KUZ-9XF~L8RKuxj836vKrWC7dsLTXNtY0agrT9RxqFQn2eNy09A182YTMzlYUr6160T28MMBo~BuSxy9MTyynm8sIgfmyE~YfGVpuE6ZiDlv3znGQOBteAYtBpWKs~MOQrSe3GBeyyJidQaJERKjWUKIr7tE5eSJVDQd3FGKCmShVaEMhYbNwZMo4OiwPlzDukqJMu~cpTs49j7dKKO1IRjCvVmPKPa6T3p9Ar88gc9R~Mms-UOSyTB6AmUIz1oz6aQIT2QyxKOntPSQQwt0Qo2~sz1uHJW2qsg5-VfLqF0ZO7pE5eg__"
],
"openingHours": {
"periods": [
{
"open": {
"day": 0,
"time": "0800"
},
"close": {
"day": 0,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 1,
"time": "0800"
},
"close": {
"day": 1,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 2,
"time": "0800"
},
"close": {
"day": 2,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 3,
"time": "0800"
},
"close": {
"day": 3,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 4,
"time": "0800"
},
"close": {
"day": 4,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 5,
"time": "0800"
},
"close": {
"day": 5,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 6,
"time": "0800"
},
"close": {
"day": 6,
"time": "2300"
},
"shifts": []
}
]
},
"customWorkingDays": {
"customWorkingDays": []
},
"subdomain": "tavernaalinea",
"virtualTourUrl": "https://kuula.co/share/collection/7D9sx?logo=-1&info=0&fs=0&vr=0&zoom=1&gyro=0&initload=0&audio=0&thumbs=3&alpha=0.60&inst=0&keys=0",
"priceCategory": {
"id": 1,
"nameEn": "Budget Friendly",
"nameHr": "Pristupačno",
"icon": "€",
"level": 1
},
"description": {
"en": "Our restaurant offers excellent delicacies for everyone's palate, from the moment it leaves the kitchen to your first bite.",
"hr": "Naš restoran nudi odlične delicije za svačije nepce. Od trenutka kad izađe iz kuhinje do vašeg prvog zalogaja."
},
"reviews": [
{
"isEdited": false,
"canEdit": true,
"id": "609b528b-b6d0-4815-b126-49ff7d90a57f",
"userId": "d94da9cb-baac-4278-8531-65c59a461b4f",
"restaurantId": "e4a35d75-511d-4b5c-a6a5-2b624788690a",
"rating": 5,
"foodQuality": 5,
"service": 5,
"atmosphere": 5,
"visitDate": "2025-06-30T22:00:00.000Z",
"text": "Izvrsna hrana, ugodna atmosfera i brza usluga. Toplo preporučujem za svaki izlazak!",
"photos": [],
"isVerifiedReviewer": false,
"isHidden": false,
"lastEditedAt": null,
"editCount": 0,
"editHistory": [],
"createdAt": "2025-07-28T13:14:31.216Z",
"updatedAt": "2025-07-28T13:14:31.216Z",
"user": {
"id": "d94da9cb-baac-4278-8531-65c59a461b4f",
"firstName": "Mihael",
"lastName": "Baivić"
}
}
],
"totalReviews": 1,
"ratings": {
"overall": 5,
"foodQuality": 5,
"service": 5,
"atmosphere": 5
}
}

Ajmo redom kroz bitne stvari koje zelim da zna:

1. name - ime restorana
2. address - adresa restorana
3. place - mjesto / grad
4. latitude
5. longitude
   --- Napomena: bitno je znati da ce se uvijek moc s Frontenda slati koordinate korisnika kako bi mogao odrediti koliko je restoran blizu i to jer ako pita "Sta ima blizu mene" da mu zna reci, ali to se handlea tamo u restaurantController, mozes pogledati detalje
6. phone - broj telefona restorana
7. rating
8. priceLevel - to su kategorije skupoce, 1 je jeftino, 2 srednje, 3 fine dining, zapravo je u bazi priceCategoryId koji prikazuje koji je a onda imas PriceCategories tablicu koja ima id, nameEn, nameHr, icon i onda nadjes taj koji stoji zapisan kod tog restorana
9. isClaimed - to je sto smo pricali, prikazuje jel partner, samo za njih odgovara gpt i za njih gleda informacije, ni za koji drugi
10. foodTypes - ovo je bitno, ovo je jedan od tipova, ovaj prikazuje koje vrste hrane ima restoran i on ce sluziti za pretrazivanje takodjer,
    "foodTypes": [
    {
    "id": 47,
    "nameEn": "Pizza",
    "nameHr": "Pizza",
    "icon": "🍕"
    },
    ...
    Ovako izgleda jedan zapis i njih ima dosta mogucih a oni koji stoje kod restorana su oni koje restoran ima, bitno za primjetiti je to da je ovdje ovako vraceno jer je ovo restaurantDetails neki API koji je vratio, zapravo se u restoran foodTypes zapise array ID-eva tipa [47, 48, ...] i onda se treba dohvatiti svi foodTypeovi moguci pa vidjet koje restoran zapravo ima
11. establishmentTypes - ista prica, samo su to vrste tog objekta kao tipa Restoran, Bar, Kafić i sl. ista je prica kao sa foodTypes
12. establishmentPerks - ista prica, ovo su neke dodatne stvari koje restoran nudi, ovo je jako bitno i moglo bi se dosta searchat, neki su moguci kao recimo "Vanjska terasa" "Stolica za djecu" itd i isto je zapisao kao arrayIdeva a onda kad dohvatis bas establishmentPerks onda tamo vidis id, nameEn, nameHr i icon, to bi moglo biti cesto kod searcha tipa "Ima li restoran Taverna Alinea vanjsku terasu?" to bi moglo biti cesto pitanje pa obrati paznju
13. mealTypes - ista prica, ovo je samo koje obroke posluzuje restoran, moguci su Doručak, Rucak, Vecera, Brunch, ali je isto zapisao kao arrayIdeva i imas tablicu mealTypes gdje nadjes isto id, nameEn, nameHr, icon
14. dietaryTypes - ista prica, sve isto to su samo koje djetalne mogucnosti nudi restoran kao vegan, vegetarijanski, halal, gluten free i isto je array Ideva i isto nadje s u dietaryTypes tablici
15. reservationEnabled - to je boolean i govori jel se moze preko aplikacije rezervirat stol ili ne
    Sad slijede ove drustvene mreze i linkovi, oni su jasni, ako korisnik pita slboodno vrati websiteUrl, fbUrl, ifUrl, ttUrl, email ,stogod treba
16. openingHours - ovo je jedno od bitnijih stvari isto ovo je zapravo nacin kako se sprema radno vrijeme, unutar openingHours ima periods a on izgleda ovako:

"openingHours": {
"periods": [
{
"open": {
"day": 0,
"time": "0800"
},
"close": {
"day": 0,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 1,
"time": "0800"
},
"close": {
"day": 1,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 2,
"time": "0800"
},
"close": {
"day": 2,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 3,
"time": "0800"
},
"close": {
"day": 3,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 4,
"time": "0800"
},
"close": {
"day": 4,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 5,
"time": "0800"
},
"close": {
"day": 5,
"time": "2300"
},
"shifts": []
},
{
"open": {
"day": 6,
"time": "0800"
},
"close": {
"day": 6,
"time": "2300"
},
"shifts": []
}
]
},

Ovo je jako bitno da GPT skuzi jer su ta pitanja bitna kao recimo "Radi li restoran X nedjeljom?", "Do kada radi danas?", "Kada se otvara u pon?" itd. periods predstavlja period ima open i close i onda day: number, day: 0 predstavlja ponedjeljak kod nas, prvi dan u tjednu, day: 6 je nedjelja. Recimo u ovom primjer periods[0] je "open" -> day: 0; time: 0800 to znaci da restoran ponedjeljkom radi od 8:00 ujutro, a zatvara se u 23:00 jer je "close" -> day: 0 2300. Sada obratiti paznju da ce uvijek periods imati 7 dijelova, i uvijek je prvi ponedjeljak, zasto to kazem, moze se dogoditi da je close tipa kod periods[0] day: 1 -> 01:00 to znaci da se zatvara nakon ponoci, ali i dalje to znaci da radi ponedjeljak od 08:00 do 01:00 samo sto to zapravo bude nakon ponoci, cisto da ne bi u bazi doslo do zabune da pise tipa da radi do day: 0 -> 0100 onda bi moglo se rec da se zatvara prije nego se otvara, tako kje bitno da gleda da je periods[0] uvijek radno vrijeme ponedjeljka i periods[6] nedjelje.

{
"open": {
"day": 6,
"time": ""
},
"close": {
"day": 6,
"time": ""
},
"shifts": []
}

Kada ovako stoji to znaci da su zatvoreni taj da, ovo konkretno znaci da periods[6] odnosno da restoran ne radi nedjeljom.

17. customWorkingDays - ovo su dani ako tipa za bozic radi drukcije onda ce se 2 tjedna prije na FE prikazivat dolje ispod radnog vremena kao da za Boizic 25.12. rade drukcije tipa, ovako primjer izgleda:
    "customWorkingDays": {
    "customWorkingDays": [
    {
    "id": "19c1a2e8-2bd0-4450-aa5d-5c1c71aa4a4f",
    "date": "2025-09-26",
    "name": "Božić",
    "times": [
    {
    "open": "11:00",
    "close": "20:00"
    }
    ]
    }
    ]
    },

Ali ako je dalje od 2 tjedna onda ne pise, ali ima zapisano u bazi

18. virtualTourUrl - to znaci ako netko slucajno pita postoji li virtualna tura za taj restoran pa ako ima url onda ima dostupna ako nema url onda je nismo snimili
19. priceCategory - to sam rekao
20. description isto dosta bitan za mozda rec nesto o restoranu ako pita, tu mi unutar 150 znakova napisemo nesto jednsotavno sto predstavlja taj restoran pa dobro za znat, ima description.en i description.hr ovisi na kojem jeziku pita.
21. ratings - imaju overall, foodQuality, service, atmosphere to su prosjeci tih kategorija ocjena za odredeni restoran.

E sad nesto sto tu nema sto je mozda najbitnija stvar su meniji i piće, kako to funkcionira, tako da postoje tablice ove

MenuCategories, MenuCategoryTranslations, DrinkCategories, DrinkCategoryTranslations
MenuItems, MenuItemTranslations, DrinkItems, DrinkItemTranslations

MenuCategories i DrinkCategories su strukture da imaju id, restaurantId
MenuCategoryTranslations i DrinkCategoryTranslations imaju id, menuCategoryId, language, name, description
MenuItems i DrinkItems imaju id, categoryId, price, restaurantId
MenuItemTranslations i DrinkItemTranslations imaju id, menuItemId, language (moze biti hr ili en), name, description

I to je ideja dalje mozes skuziti konekcije i kako se slaze zapravo to, ali je jako bitno da ako korisnik pita "Ima li neki restoran u blizi mene biftek" da ces pretraziti menuItemTranslations i probat naci na bilo kojem jeziku nesto slicno tome i ako nadjes pogledat menuItemId pa naci taj item i tamo vidjet koji je to restoran. Ono sto olaksava je da ako menuItemTranslations i opcenito meni da imaju samo partner restorani pa ne moras to provjeravati, ako nadjes neki item po imenu sigurno je partner, ista logika vrijedi i za pića

To su vise manje za sada sve bitne informacije, treba napraviti jako dobar sistem koji ce napraviti te "intents" / funkcije koje ce vracat sve sto je bitno pa ce gpt prepoznat sta treba sve iz pitanja to ce mu vratiti jsone i on ce odgovoriti prirodno, napraviti dobre upute da odgovara skoro kao OpenTable-ov sto sam poslao gore primjere.

Cilj

Dinver AI je GPT agent koji odgovara na pitanja korisnika koristeći isključivo podatke dostupne iz Dinver baze i API-ja.
Agent ne smije odgovarati na pitanja nevezana uz Dinver. Ako korisnik pita nešto nevezano, AI vraća neutralan odgovor tipa “Mogu odgovarati samo na pitanja vezana uz restorane i ponudu na Dinveru.”

Odgovori moraju biti:

Na jeziku na kojem je postavljeno pitanje (hr ili en).

Prirodni i razgovorni, slično kao OpenTable AI.

Utemeljeni isključivo na JSON podacima vraćenima iz baze/API-ja.

🔑 Osnovna pravila

Samo partner restorani

isClaimed: true → partner.

API: restaurantController.js -> getPartners().

Samo za njih se dohvaćaju i koriste podaci.

Podaci dolaze iz baze / API-ja

AI nikad ne izmišlja podatke.

Ako polje ne postoji ili je prazno → koristi fallback pravilo.

Format baze

restaurant.js model sadrži osnovne informacije.

Dodatne tablice: MenuCategories, MenuItems, DrinkCategories, DrinkItems s prijevodima (hr/en).

Sve relacije detaljno opisane gore u dokumentaciji.

📂 Intents & Fallback pravila

1. Radno vrijeme

Podaci: openingHours.periods, customWorkingDays.

Posebno pravilo: day: 0 = ponedjeljak, day: 6 = nedjelja. Ako close.day prelazi u sljedeći dan, tretira se kao rad nakon ponoći.

Fallback: ako nema podataka → spomeni da nema informacija i predloži kontakt putem phone.

2. Lokacija / blizina

Podaci: latitude, longitude, place.

Pravilo: filtrirati samo isClaimed: true.

Fallback: ako nema partnera u blizini → odgovoriti da nema rezultata u tom području.

3. Meni / hrana

Podaci: MenuItemTranslations (name, description) → povezuje se s MenuItems i restaurantId.

Pravilo: pretražuje se po svim dostupnim jezicima. Ako nađe rezultat → vrati restoran i naziv jela.

Fallback: ako nema menija → navesti da restoran nema objavljen jelovnik.

4. Perks / pogodnosti

Podaci: establishmentPerks (npr. terasa, stolice za djecu).

Fallback: ako perk ne postoji → reći da restoran nema tu opciju.

5. Meal types

Podaci: mealTypes (doručak, ručak, večera, brunch).

Fallback: ako nema podataka → spomeni da restoran nema definirane tipove obroka.

6. Dietary types

Podaci: dietaryTypes (vegetarijanski, vegan, halal, gluten free).

Fallback: ako nema podataka → reći da restoran nema specificirane opcije.

7. Rezervacije

Podaci: reservationEnabled (true/false).

Fallback: ako nema → reći da se rezervacije preko Dinvera trenutno ne podržavaju.

8. Kontakt i društvene mreže

Podaci: websiteUrl, fbUrl, igUrl, ttUrl, phone, email.

Fallback: ako link/email ne postoji → reći da podatak nije dostupan.

9. Opis restorana

Podaci: description.hr ili description.en.

Fallback: ako prazno → navesti da nema unesen opis.

10. Virtualna tura

Podaci: virtualTourUrl.

Fallback: ako nema → reći da virtualna tura nije dostupna.

11. Cijene

Podaci: priceCategory (nameEn, nameHr, icon, level).

Fallback: ako prazno → ne spominjati cijenu.

12. Recenzije i ocjene

Podaci: reviews, ratings (overall, foodQuality, service, atmosphere).

Fallback: ako nema → navesti da restoran još nema recenzija.

13. Out of scope

Ako pitanje nije vezano uz Dinver/restorane → vraća neutralan odgovor (ne izmišlja ništa).
