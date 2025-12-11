'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Button from '@/components/ui/Button';
import { Messages } from '@/lib/i18n';
import { addUserToWaitlist, addRestaurantToWaitlist } from '@/lib/api';

interface ContactProps {
  messages: Messages;
}

type FormType = 'user' | 'restaurant';

export default function Contact({ messages }: ContactProps) {
  const [formType, setFormType] = useState<FormType>('user');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      if (formType === 'user') {
        await addUserToWaitlist({ email, city });
      } else {
        await addRestaurantToWaitlist({ email, city, restaurantName });
      }

      setStatus('success');
      setEmail('');
      setCity('');
      setRestaurantName('');

      // Reset after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : messages.contact.form.error
      );

      // Reset after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <section id="contact" className="py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {messages.contact.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {messages.contact.subtitle}
          </p>
        </AnimatedSection>

        <div className="max-w-xl mx-auto">
          {/* Form type toggle */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-8">
            <button
              onClick={() => setFormType('user')}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all ${
                formType === 'user'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {messages.contact.form.submit.includes('Join') ? 'I\'m a Food Lover' : 'Ljubitelj hrane'}
            </button>
            <button
              onClick={() => setFormType('restaurant')}
              className={`flex-1 py-3 px-6 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formType === 'restaurant'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 size={16} />
              {messages.contact.restaurant.title}
            </button>
          </div>

          <AnimatedSection>
            <motion.div
              layout
              className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50"
            >
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-dinver-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="text-dinver-green" size={32} />
                    </div>
                    <p className="text-gray-900 font-medium">{messages.contact.form.success}</p>
                  </motion.div>
                ) : status === 'error' ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <p className="text-gray-900 font-medium">
                      {errorMessage || messages.contact.form.error}
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="mt-4 text-dinver-green hover:underline text-sm"
                    >
                      Try again
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    {formType === 'restaurant' && (
                      <div>
                        <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-2">
                          Restaurant Name
                        </label>
                        <input
                          type="text"
                          id="restaurantName"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Your restaurant name"
                          required={formType === 'restaurant'}
                          minLength={2}
                          maxLength={200}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        {messages.contact.form.email}
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                        {messages.contact.form.city}
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Zagreb, Split, Rijeka..."
                        required
                        minLength={2}
                        maxLength={100}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-dinver-green focus:ring-2 focus:ring-dinver-green/20 outline-none transition-all"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full mt-6"
                      size="lg"
                    >
                      {status === 'loading' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {messages.contact.form.submitting}
                        </>
                      ) : (
                        <>
                          {messages.contact.form.submit}
                          <Send size={18} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatedSection>

          {/* Restaurant CTA */}
          {formType === 'user' && (
            <AnimatedSection delay={0.2} className="mt-8 text-center">
              <p className="text-gray-600 mb-4">
                {messages.contact.restaurant.description}
              </p>
              <button
                onClick={() => setFormType('restaurant')}
                className="text-dinver-green font-medium hover:underline"
              >
                {messages.contact.restaurant.cta} →
              </button>
            </AnimatedSection>
          )}
        </div>
      </div>
    </section>
  );
}
