import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ArrowBack } from "@/assets/icons/icons";

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem = ({ question, answer }: FAQItemProps) => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <View
      style={{ borderBottomColor: colors.border }}
      className="py-4 border-b"
    >
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center"
      >
        <Text
          style={{ color: colors.textPrimary }}
          className="font-degular-medium text-base flex-1 pr-4"
        >
          {question}
        </Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <Text
          style={{ color: colors.textSecondary }}
          className="font-degular mt-2"
        >
          {answer}
        </Text>
      )}
    </View>
  );
};

const FAQScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const handleContactEmail = () => {
    Linking.openURL("mailto:info@dinver.eu");
  };

  const faqItems = [
    {
      question: t("faq.q1", "Kako Dinver pomaže pri odabiru restorana?"),
      answer: t(
        "faq.a1",
        "Dinver omogućuje jednostavno pretraživanje restorana pomoću naprednih filtera, prikaza ažurnih jelovnika s cijenama i recenzijama korisnika."
      ),
    },
    {
      question: t("faq.q2", "Je li Dinver besplatan za korisnike?"),
      answer: t(
        "faq.a2",
        "Da, aplikacija je potpuno besplatna za korisnike koji traže restorane i pregledavaju menije."
      ),
    },
    {
      question: t(
        "faq.q3",
        "Kako restorani mogu dodati ili ažurirati svoje informacije?"
      ),
      answer: t(
        "faq.a3",
        "Restorani mogu kreirati račun na Dinveru i ažurirati svoje podatke putem admin sučelja, gdje mogu dodavati jelovnike, cijene, slike i posebne ponude."
      ),
    },
    {
      question: t("faq.q4", "Kako funkcioniraju rezervacije stolova?"),
      answer: t(
        "faq.a4",
        "Ako restoran podržava rezervacije, korisnici mogu putem Dinvera odabrati termin i broj osoba te odmah rezervirati stol bez potrebe za pozivom."
      ),
    },
    {
      question: t("faq.q5", "Kako funkcionira sustav bodova i nagrada?"),
      answer: t(
        "faq.a5",
        "Korisnici skupljaju bodove recenziranjem restorana i dodavanjem slika. Prikupljene bodove mogu iskoristiti za popuste i nagrade u partnerskim restoranima."
      ),
    },
  ];

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
      <View
        style={{ borderBottomColor: colors.border }}
        className="p-[22px] border-b-[1px] flex-row items-center"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowBack color={colors.textPrimary} />
          <Text
            style={{ color: colors.textPrimary }}
            className="text-[18px] font-degular-semibold ml-[18px]"
          >
            {t("profile.helpAndSupport", "Help & Support")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-5">
        <View className="mb-6 items-center">
          <Text
            style={{ color: colors.textSecondary }}
            className="text-center mb-2"
          >
            {t("faq.contactUs", "Contact Us")}
          </Text>
          <TouchableOpacity onPress={handleContactEmail}>
            <Text
              style={{ color: colors.appPrimary }}
              className="text-center font-degular-medium text-base"
            >
              info@dinver.eu
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{ color: colors.textPrimary }}
          className="font-degular-bold text-lg mb-4"
        >
          {t("faq.frequentlyAskedQuestions", "Frequently Asked Questions")}
        </Text>

        {faqItems.map((item, index) => (
          <FAQItem
            key={index.toString()}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default FAQScreen;
