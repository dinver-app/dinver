import { useTheme } from "@/context/ThemeContext";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowBack } from "@/assets/icons/icons";

const TermsOfServiceScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentLanguage } = useLanguage();

  const termsOfServiceContentEn = `
Last updated: May 5, 2025

1. AGREEMENT TO TERMS

These Terms of Service constitute a legally binding agreement made between you and Dinver, concerning your access to and use of the Dinver application.

By accessing or using the application, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the application.

2. INTELLECTUAL PROPERTY RIGHTS

Unless otherwise indicated, the application is our proprietary property, and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the application (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.

3. USER REPRESENTATIONS

By using the application, you represent and warrant that:

• You have the legal capacity to accept these Terms of Service;
• You are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the application;
• You will not access the application through automated or non-human means, whether through a bot, script, or otherwise;
• You will not use the application for any illegal or unauthorized purpose;
• Your use of the application will not violate any applicable law or regulation.

4. USER REGISTRATION

You may need to register to use the application. You agree to keep your password confidential and will be responsible for all use of your account and password.

5. PRODUCTS

We make every effort to display as accurately as possible the colors, features, specifications, and details of the products available on the application. However, we do not guarantee that the colors, features, specifications, and details of the products will be accurate, complete, reliable, current, or free of other errors.

6. PURCHASES AND PAYMENT

We accept the following forms of payment:
• Credit Cards
• PayPal

All payments are processed through secure third-party payment processors.

7. FREE TRIAL

We may offer a free trial of our premium services. The duration of the free trial period and all other details will be set out at the time you sign up for the trial.

8. CANCELLATION

You can cancel your subscription at any time by logging into your account settings. Your cancellation will take effect at the end of the current paid term.

9. PROHIBITED ACTIVITIES

You may not access or use the application for any purpose other than that for which we make the application available. The application may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.

10. MOBILE APPLICATION LICENSE

Use License
If you access the application via a mobile application, then we grant you a revocable, non-exclusive, non-transferable, limited right to install and use the mobile application on wireless electronic devices owned or controlled by you, and to access and use the mobile application on such devices strictly in accordance with the terms and conditions of this mobile application license contained in these Terms of Service.

11. TERM AND TERMINATION

These Terms of Service shall remain in full force and effect while you use the application. We may terminate or suspend your account and bar access to the application immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms of Service.

12. MODIFICATIONS AND INTERRUPTIONS

We reserve the right to change, modify, or remove the contents of the application at any time or for any reason at our sole discretion without notice. We also reserve the right to modify or discontinue all or part of the application without notice at any time.

13. GOVERNING LAW

These conditions are governed by and interpreted following the laws of Croatia, and the use of the United Nations Convention of Contracts for the International Sale of Goods is expressly excluded. If your habitual residence is in the EU, and you are a consumer, you additionally possess the protection provided to you by obligatory provisions of the law of your country of residence.

14. DISPUTE RESOLUTION

The European Commission provides an online dispute resolution platform, which you can access here: https://ec.europa.eu/consumers/odr. If you would like to bring this subject to our attention, please contact us.

15. CORRECTIONS

There may be information on the application that contains typographical errors, inaccuracies, or omissions. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the application at any time, without prior notice.

16. DISCLAIMER

THE APPLICATION IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE APPLICATION WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE APPLICATION.

17. LIMITATIONS OF LIABILITY

IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE APPLICATION.

18. USER DATA

We will maintain certain data that you transmit to the application for the purpose of managing the performance of the application, as well as data relating to your use of the application. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the application.

19. CONTACT US

In order to resolve a complaint regarding the application or to receive further information regarding use of the application, please contact us at:

Dinver
Email: terms@dinver.com
Phone: +385 1 234 5678


`;

  const termsOfServiceContentHr = `
Zadnje ažuriranje: 5. svibnja 2025.

1. PRIHVAĆANJE UVJETA

Ovi Uvjeti korištenja predstavljaju pravno obvezujući ugovor između vas i Dinver, koji se odnosi na vaš pristup i korištenje aplikacije Dinver.

Pristupanjem ili korištenjem aplikacije, pristajete biti vezani ovim Uvjetima korištenja. Ako se ne slažete s bilo kojim dijelom uvjeta, ne smijete pristupiti aplikaciji.

2. PRAVA INTELEKTUALNOG VLASNIŠTVA

Osim ako nije drugačije naznačeno, aplikacija je naše vlasništvo, a sav izvorni kod, baze podataka, funkcionalnost, softver, dizajn web stranica, audio, video, tekst, fotografije i grafika na aplikaciji (skupno "Sadržaj") te zaštitni znakovi, servisne oznake i logotipi sadržani u njima ("Oznake") su u našem vlasništvu ili pod našom kontrolom ili su nam licencirani, te su zaštićeni zakonima o autorskim pravima i zaštitnim znakovima.

3. IZJAVE KORISNIKA

Korištenjem aplikacije, izjavljujete i jamčite da:

• Imate pravnu sposobnost prihvatiti ove Uvjete korištenja;
• Niste maloljetni u nadležnosti u kojoj prebivate, ili ako ste maloljetni, dobili ste roditeljsko dopuštenje za korištenje aplikacije;
• Nećete pristupati aplikaciji putem automatiziranih ili neljudskih sredstava, bilo putem bota, skripte ili na drugi način;
• Nećete koristiti aplikaciju za bilo kakvu ilegalnu ili neovlaštenu svrhu;
• Vaše korištenje aplikacije neće kršiti bilo koji primjenjivi zakon ili propis.

4. REGISTRACIJA KORISNIKA

Možda ćete se morati registrirati za korištenje aplikacije. Pristajete čuvati svoju lozinku kao povjerljivu i bit ćete odgovorni za svu upotrebu svog računa i lozinke.

5. PROIZVODI

Činimo sve napore da što točnije prikažemo boje, značajke, specifikacije i detalje proizvoda dostupnih u aplikaciji. Međutim, ne jamčimo da će boje, značajke, specifikacije i detalji proizvoda biti točni, potpuni, pouzdani, ažurni ili bez drugih pogrešaka.

6. KUPNJE I PLAĆANJE

Prihvaćamo sljedeće oblike plaćanja:
• Kreditne kartice
• PayPal

Sva plaćanja se obrađuju putem sigurnih obrađivača plaćanja treće strane.

7. BESPLATNO PROBNO RAZDOBLJE

Možemo ponuditi besplatno probno razdoblje naših premium usluga. Trajanje besplatnog probnog razdoblja i svi ostali detalji bit će navedeni u trenutku kada se prijavite za probu.

8. OTKAZIVANJE

Možete otkazati svoju pretplatu u bilo kojem trenutku prijavom u postavke računa. Vaše otkazivanje stupit će na snagu na kraju trenutnog plaćenog razdoblja.

9. ZABRANJENE AKTIVNOSTI

Ne smijete pristupati ili koristiti aplikaciju u bilo koju svrhu osim one za koju mi činimo aplikaciju dostupnom. Aplikacija se ne smije koristiti u vezi s bilo kakvim komercijalnim pothvatima osim onih koje smo posebno podržali ili odobrili.

10. LICENCA ZA MOBILNU APLIKACIJU

Licenca za korištenje
Ako pristupate aplikaciji putem mobilne aplikacije, onda vam dodjeljujemo opozivo, neisključivo, neprenosivo, ograničeno pravo instaliranja i korištenja mobilne aplikacije na bežičnim elektroničkim uređajima u vašem vlasništvu ili pod vašom kontrolom, te pristupa i korištenja mobilne aplikacije na takvim uređajima strogo u skladu s uvjetima ove licence za mobilnu aplikaciju sadržane u ovim Uvjetima korištenja.

11. TRAJANJE I RASKID

Ovi Uvjeti korištenja ostat će na snazi dok koristite aplikaciju. Možemo raskinuti ili suspendirati vaš račun i zabraniti pristup aplikaciji odmah, bez prethodne obavijesti ili odgovornosti, iz bilo kojeg razloga, uključujući bez ograničenja ako prekršite ove Uvjete korištenja.

12. IZMJENE I PREKIDI

Zadržavamo pravo promjene, izmjene ili uklanjanja sadržaja aplikacije u bilo kojem trenutku ili iz bilo kojeg razloga prema našoj diskreciji bez obavijesti. Također zadržavamo pravo izmjene ili prekida svih ili dijela aplikacije bez obavijesti u bilo kojem trenutku.

13. MJERODAVNO PRAVO

Ovi uvjeti su uređeni i tumače se u skladu sa zakonima Hrvatske, a upotreba Konvencije Ujedinjenih naroda o ugovorima o međunarodnoj prodaji robe izričito je isključena. Ako je vaše uobičajeno prebivalište u EU, i vi ste potrošač, dodatno imate zaštitu koju vam pružaju obvezne odredbe zakona vaše zemlje prebivališta.

14. RJEŠAVANJE SPOROVA

Europska komisija pruža platformu za online rješavanje sporova, kojoj možete pristupiti ovdje: https://ec.europa.eu/consumers/odr. Ako biste htjeli skrenuti našu pažnju na ovu temu, molimo kontaktirajte nas.

15. ISPRAVKE

Na aplikaciji mogu postojati informacije koje sadrže tipografske pogreške, netočnosti ili propuste. Zadržavamo pravo ispraviti bilo koje pogreške, netočnosti ili propuste te promijeniti ili ažurirati informacije na aplikaciji u bilo kojem trenutku, bez prethodne obavijesti.

16. ODRICANJE ODGOVORNOSTI

APLIKACIJA SE PRUŽA "KAKVA JEST" I "KAKO JE DOSTUPNA". PRISTAJETE DA ĆE VAŠE KORIŠTENJE APLIKACIJE BITI NA VAŠ VLASTITI RIZIK. U NAJVEĆOJ MJERI DOPUŠTENOJ ZAKONOM, ODRIČEMO SE SVIH JAMSTAVA, IZRIČITIH ILI IMPLICIRANIH, U VEZI S APLIKACIJOM.

17. OGRANIČENJA ODGOVORNOSTI

NI U KOJEM SLUČAJU MI ILI NAŠI DIREKTORI, ZAPOSLENICI ILI AGENTI NEĆE BITI ODGOVORNI VAMA ILI BILO KOJOJ TREĆOJ STRANI ZA BILO KAKVE IZRAVNE, NEIZRAVNE, POSLJEDIČNE, PRIMJERNE, SLUČAJNE, POSEBNE ILI KAZNENE ŠTETE, UKLJUČUJUĆI IZGUBLJENU DOBIT, IZGUBLJENI PRIHOD, GUBITAK PODATAKA ILI DRUGE ŠTETE KOJE PROIZLAZE IZ VAŠEG KORIŠTENJA APLIKACIJE.

18. KORISNIČKI PODACI

Održavat ćemo određene podatke koje prenosite na aplikaciju u svrhu upravljanja performansama aplikacije, kao i podatke koji se odnose na vaše korištenje aplikacije. Iako redovito radimo rutinske sigurnosne kopije podataka, vi ste isključivo odgovorni za sve podatke koje prenosite ili koji se odnose na bilo koju aktivnost koju ste poduzeli koristeći aplikaciju.

19. KONTAKTIRAJTE NAS

Kako biste riješili pritužbu u vezi s aplikacijom ili dobili dodatne informacije o korištenju aplikacije, molimo kontaktirajte nas na:

Dinver
Email: terms@dinver.com
Telefon: +385 1 234 5678


`;

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
      <View
        style={{ borderBottomColor: colors.border }}
        className="p-[22px] border-b-[1px]"
      >
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => router.back()}
        >
          <ArrowBack color={colors.textPrimary} />
          <Text
            style={{ color: colors.textPrimary }}
            className="text-[18px] font-degular-semibold ml-[18px]"
          >
            {t("settings.termsOfService", "Terms of Service")}
          </Text>
        </TouchableOpacity>
      </View>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
        }}
      />

      <ScrollView className="flex-1 px-4 py-4">
        <Text
          style={{ color: colors.textPrimary, fontFamily: "Degular" }}
          className="whitespace-pre-wrap"
        >
          {currentLanguage === "en"
            ? termsOfServiceContentEn
            : termsOfServiceContentHr}
        </Text>
      </ScrollView>
    </View>
  );
};

export default TermsOfServiceScreen;
