import { useTheme } from "@/context/ThemeContext";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowBack } from "@/assets/icons/icons";

const PrivacyPolicyScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { currentLanguage } = useLanguage();

  const privacyPolicyContentEn = `
Last updated: May 5, 2025

1. Introduction

Welcome to Dinver. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our app and tell you about your privacy rights and how the law protects you.

2. The Data We Collect About You

Personal data means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped as follows:
• Identity Data: includes first name, last name, username or similar identifier.
• Contact Data: includes email address and telephone numbers.
• Technical Data: includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this app.
• Profile Data: includes your username and password, your interests, preferences, feedback, and survey responses.
• Usage Data: includes information about how you use our app and services.
• Location Data: includes your current location disclosed by GPS technology.

3. How We Use Your Personal Data

We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
• To register you as a new customer
• To process and deliver your service
• To manage our relationship with you
• To enable you to participate in features of our service
• To administer and protect our business and this app
• To deliver relevant app content to you
• To use data analytics to improve our app

4. Data Security

We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. We limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.

5. Your Legal Rights

Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
• Request access to your personal data
• Request correction of your personal data
• Request erasure of your personal data
• Object to processing of your personal data
• Request restriction of processing your personal data
• Request transfer of your personal data
• Right to withdraw consent

6. Contact Us

If you have any questions about this privacy policy or our privacy practices, please contact us at:
Email: privacy@dinver.com

Thank you for taking the time to understand our Privacy Policy.



  `;

  const privacyPolicyContentHr = `
Zadnje ažuriranje: 5. svibnja 2025.

1. Uvod

Dobrodošli u Dinver. Poštujemo vašu privatnost i predani smo zaštiti vaših osobnih podataka. Ova politika privatnosti će vas informirati o tome kako se brinemo o vašim osobnim podacima kada posjećujete našu aplikaciju i obavijestiti vas o vašim pravima na privatnost i kako vas zakon štiti.

2. Podaci koje prikupljamo o vama

Osobni podaci znače sve informacije o pojedincu iz kojih se ta osoba može identificirati. Možemo prikupljati, koristiti, pohranjivati i prenositi različite vrste osobnih podataka o vama koje smo grupirali kako slijedi:
• Podaci o identitetu: uključuju ime, prezime, korisničko ime ili sličan identifikator.
• Kontakt podaci: uključuju adresu e-pošte i telefonske brojeve.
• Tehnički podaci: uključuju internetsku protokol (IP) adresu, podatke o prijavi, vrstu i verziju preglednika, postavku vremenske zone i lokaciju, vrste i verzije dodataka preglednika, operativni sustav i platformu te drugu tehnologiju na uređajima koje koristite za pristup ovoj aplikaciji.
• Podaci o profilu: uključuju vaše korisničko ime i lozinku, vaše interese, preference, povratne informacije i odgovore na ankete.
• Podaci o korištenju: uključuju informacije o tome kako koristite našu aplikaciju i usluge.
• Podaci o lokaciji: uključuju vašu trenutnu lokaciju koju otkriva GPS tehnologija.

3. Kako koristimo vaše osobne podatke

Vaše osobne podatke koristit ćemo samo kada nam to zakon dopušta. Najčešće ćemo koristiti vaše osobne podatke u sljedećim okolnostima:
• Da vas registriramo kao novog korisnika
• Za obradu i isporuku vaše usluge
• Za upravljanje našim odnosom s vama
• Da vam omogućimo sudjelovanje u funkcijama naše usluge
• Za administriranje i zaštitu našeg poslovanja i ove aplikacije
• Za isporuku relevantnog sadržaja aplikacije
• Za korištenje analitike podataka za poboljšanje naše aplikacije

4. Sigurnost podataka

Uveli smo odgovarajuće sigurnosne mjere kako bismo spriječili da vaši osobni podaci budu slučajno izgubljeni, korišteni ili im se pristupa na neovlašteni način. Ograničavamo pristup vašim osobnim podacima onim zaposlenicima, agentima, izvođačima i drugim trećim stranama koji imaju poslovnu potrebu znati.

5. Vaša zakonska prava

Pod određenim okolnostima, imate prava prema zakonima o zaštiti podataka u vezi s vašim osobnim podacima, uključujući pravo na:
• Zatražiti pristup svojim osobnim podacima
• Zatražiti ispravak svojih osobnih podataka
• Zatražiti brisanje svojih osobnih podataka
• Prigovoriti obradi vaših osobnih podataka
• Zatražiti ograničenje obrade vaših osobnih podataka
• Zatražiti prijenos vaših osobnih podataka
• Pravo na povlačenje pristanka

6. Kontaktirajte nas

Ako imate bilo kakvih pitanja o ovoj politici privatnosti ili našim praksama privatnosti, molimo kontaktirajte nas na:
E-mail: privacy@dinver.com

Hvala što ste odvojili vrijeme za razumijevanje naše Politike privatnosti.



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
            {t("settings.privacyPolicy", "Privacy Policy")}
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
            ? privacyPolicyContentEn
            : privacyPolicyContentHr}
        </Text>
      </ScrollView>
    </View>
  );
};

export default PrivacyPolicyScreen;
