"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";
import { Locale, getMessages, defaultLocale } from "@/lib/i18n";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { submitContactForm, ContactFormRequest } from "@/lib/api";

// TikTok icon
const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

type FormStatus = "idle" | "loading" | "success" | "error";

export default function KontaktPage() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState(getMessages(defaultLocale));
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<ContactFormRequest>({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general",
    phone: "",
  });

  useEffect(() => {
    const savedLocale = localStorage.getItem("dinver-locale") as Locale | null;
    if (savedLocale && (savedLocale === "en" || savedLocale === "hr")) {
      setLocale(savedLocale);
      setMessages(getMessages(savedLocale));
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(getMessages(newLocale));
    localStorage.setItem("dinver-locale", newLocale);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("loading");
    setErrorMessage("");

    try {
      const response = await submitContactForm(formData);
      if (response.success) {
        setFormStatus("success");
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
          type: "general",
          phone: "",
        });
      } else {
        setFormStatus("error");
        setErrorMessage(response.message || "Došlo je do greške");
      }
    } catch {
      setFormStatus("error");
      setErrorMessage("Došlo je do greške. Molimo pokušajte ponovno.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const inquiryTypes = [
    {
      value: "general",
      label: locale === "hr" ? "Općeniti upit" : "General inquiry",
    },
    {
      value: "partnership",
      label: locale === "hr" ? "Partnerstvo" : "Partnership",
    },
    { value: "support", label: locale === "hr" ? "Podrška" : "Support" },
    { value: "press", label: locale === "hr" ? "Za medije" : "Press" },
    { value: "other", label: locale === "hr" ? "Ostalo" : "Other" },
  ];

  return (
    <main className="min-h-screen bg-white">
      <Header
        messages={messages}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-dinver-green hover:text-dinver-green-dark mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            {locale === "hr" ? "Natrag na početnu" : "Back to home"}
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left - Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {locale === "hr" ? "Kontaktirajte nas" : "Contact us"}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {locale === "hr"
                  ? "Imate pitanje, prijedlog ili želite surađivati s nama? Rado ćemo čuti od vas!"
                  : "Have a question, suggestion, or want to work with us? We'd love to hear from you!"}
              </p>

              {/* Contact Details */}
              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="text-dinver-green" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a
                      href="mailto:info@dinver.eu"
                      className="text-dinver-green hover:text-dinver-green-dark transition-colors"
                    >
                      info@dinver.eu
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="text-dinver-green" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {locale === "hr" ? "Telefon" : "Phone"}
                    </h3>
                    <a
                      href="tel:+385955493071"
                      className="text-dinver-green hover:text-dinver-green-dark transition-colors"
                    >
                      095 549 3071
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-dinver-green/10 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="text-dinver-green" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {locale === "hr" ? "Lokacija" : "Location"}
                    </h3>
                    <p className="text-gray-600">Zagreb, Hrvatska</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  {locale === "hr" ? "Pratite nas" : "Follow us"}
                </h3>
                <div className="flex items-center gap-4">
                  <a
                    href="https://www.instagram.com/dinver_hr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                  >
                    <Instagram size={20} />
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61579285213824"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                  >
                    <Facebook size={20} />
                  </a>
                  <a
                    href="https://www.tiktok.com/@dinver_hr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                  >
                    <TikTokIcon size={20} />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/dinver/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-dinver-green hover:text-white transition-colors"
                  >
                    <Linkedin size={20} />
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Right - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-gray-50 rounded-2xl p-6 sm:p-8">
                {formStatus === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {locale === "hr" ? "Poruka poslana!" : "Message sent!"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {locale === "hr"
                        ? "Hvala na poruci. Javit ćemo vam se uskoro."
                        : "Thank you for your message. We'll get back to you soon."}
                    </p>
                    <button
                      onClick={() => setFormStatus("idle")}
                      className="text-dinver-green hover:text-dinver-green-dark font-medium"
                    >
                      {locale === "hr"
                        ? "Pošalji još jednu poruku"
                        : "Send another message"}
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {locale === "hr" ? "Tip upita" : "Inquiry type"}
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
                      >
                        {inquiryTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          {locale === "hr" ? "Ime i prezime" : "Full name"} *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
                          placeholder={
                            locale === "hr" ? "Vaše ime" : "Your name"
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
                          placeholder="email@primjer.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {locale === "hr"
                          ? "Telefon (opcionalno)"
                          : "Phone (optional)"}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
                        placeholder="+385 XX XXX XXXX"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {locale === "hr" ? "Predmet" : "Subject"} *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent"
                        placeholder={
                          locale === "hr"
                            ? "O čemu se radi?"
                            : "What is this about?"
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {locale === "hr" ? "Poruka" : "Message"} *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-dinver-green focus:border-transparent resize-none"
                        placeholder={
                          locale === "hr" ? "Vaša poruka..." : "Your message..."
                        }
                      />
                    </div>

                    {formStatus === "error" && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle size={16} />
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={formStatus === "loading"}
                      className="w-full bg-dinver-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-dinver-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {formStatus === "loading" ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {locale === "hr" ? "Šaljem..." : "Sending..."}
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          {locale === "hr" ? "Pošalji poruku" : "Send message"}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer messages={messages} />
    </main>
  );
}
