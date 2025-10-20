# Dinver Email DNS Setup (Mailgun)

Ovaj dokument vodi kroz konfiguraciju DNS zapisa kako bi se značajno smanjila vjerojatnost da emailovi završe u spam.

## 1) SPF (Sender Policy Framework)

Dodajte TXT zapis na root domenu `dinver.eu`:

```
Name/Host: dinver.eu
Type: TXT
Value: v=spf1 include:mailgun.org ~all
TTL: 300
```

Ako već imate SPF, spojite ih u jedan (ne smiju postojati 2 SPF zapisa).

## 2) DKIM (DomainKeys Identified Mail)

U Mailgun dashboardu (Sending > Domains > dinver.eu) dobit ćete 2 DKIM CNAME zapisa. Dodajte ih točno kako je prikazano:

```
Type: CNAME
Name: krs._domainkey.dinver.eu   (primjer, vaš selector može biti drukčiji)
Value: krs.domainkey.dinver.eu.mailgun.org
TTL: 300
```

Ponovite za drugi DKIM zapis ako postoji. Pričekajte propagaciju (obično do 30 min).

## 3) DMARC (Domain-based Message Authentication, Reporting & Conformance)

Dodajte TXT zapis za `_dmarc.dinver.eu`:

```
Name/Host: _dmarc.dinver.eu
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:postmaster@dinver.eu; sp=none; adkim=s; aspf=s
TTL: 300
```

Nakon što sve prođe validacije i reputacija bude stabilna, promijenite `p=none` u `p=quarantine` ili `p=reject`.

## 4) Tracking i Click/Opens (Mailgun)

U Mailgunu omogućite opens/clicks tracking (ako želite). U kodu smo uključili `o:tracking`, `o:tracking-opens`, `o:tracking-clicks`.

## 5) Provjera konfiguracije

- U Mailgun dashboardu pri domeni provjerite da su svi zapisi Verified/Active
- Testirajte slanjem emaila na `mail-tester.com` i ciljajte score 8+/10
- Provjerite header `DKIM-Signature` u primljenom mailu i SPF rezultat (pass)

## 6) Savjeti

- From adresa neka bude s vlastite domene: `noreply@dinver.eu`
- Budite konzistentni s `From` i `Reply-To`
- Nemojte slati bulk sa iste domene dok reputacija ne bude dobra

## 7) Troubleshooting

- Ako SPF fail-a: provjerite da postoji samo jedan SPF TXT zapis za root domenu
- Ako DKIM fail-a: provjerite CNAME točnost, bez dodatnih sufixa (.dinver.eu)
- Ako DMARC fail-a: provjerite točan hostname `_dmarc.dinver.eu`

Nakon ovih koraka, deliverability bi trebala biti značajno bolja, a spam incidence drastično manja.
