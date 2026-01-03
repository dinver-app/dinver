'use client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import Button from '@/components/ui/Button';
import { Messages } from '@/lib/i18n';

interface ExperienceFeedProps {
  messages: Messages;
}

// Mock experiences data
const mockExperiences = [
  {
    id: 1,
    user: { name: 'Ana M.', avatar: null },
    restaurant: 'La Pergola',
    rating: 9.2,
    description: 'Amazing pasta and incredible service! The truffle risotto was absolutely divine.',
    likes: 142,
    comments: 23,
    images: ['/placeholder-food-1.jpg'],
    mealType: 'dinner',
  },
  {
    id: 2,
    user: { name: 'Marko K.', avatar: null },
    restaurant: 'Mundoaka',
    rating: 8.8,
    description: 'Best brunch spot in town. The avocado toast is a must-try!',
    likes: 98,
    comments: 15,
    images: ['/placeholder-food-2.jpg'],
    mealType: 'brunch',
  },
  {
    id: 3,
    user: { name: 'Ivana P.', avatar: null },
    restaurant: 'Noel',
    rating: 9.5,
    description: 'Fine dining at its best. Every dish was a work of art.',
    likes: 256,
    comments: 42,
    images: ['/placeholder-food-3.jpg'],
    mealType: 'dinner',
  },
];

export default function ExperienceFeed({ messages }: ExperienceFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % mockExperiences.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + mockExperiences.length) % mockExperiences.length);
  };

  return (
    <section className="py-24 lg:py-32 bg-dinver-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <AnimatedSection direction="left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              {messages.experienceFeed.title}
            </h2>
            <p className="mt-2 text-dinver-green font-medium">
              {messages.experienceFeed.subtitle}
            </p>
            <p className="mt-6 text-gray-300 text-lg leading-relaxed">
              {messages.experienceFeed.description}
            </p>
            <div className="mt-8">
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-dinver-dark"
              >
                {messages.experienceFeed.cta}
              </Button>
            </div>
          </AnimatedSection>

          {/* Phone with Experience Feed */}
          <AnimatedSection direction="right" className="relative">
            <div className="relative flex justify-center">
              {/* Phone frame */}
              <div className="relative w-72 h-[600px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />

                  {/* Experience Card */}
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="h-full flex flex-col"
                  >
                    {/* Image area */}
                    <div className="relative h-2/3 bg-gradient-to-br from-gray-200 to-gray-300">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-2" />
                          <p className="text-xs">Food Image</p>
                        </div>
                      </div>

                      {/* Rating badge */}
                      <div className="absolute top-10 right-4 bg-dinver-green text-white px-3 py-1 rounded-full text-sm font-bold">
                        {mockExperiences[currentIndex].rating}
                      </div>

                      {/* User info */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-dinver-green">
                          {mockExperiences[currentIndex].user.name.charAt(0)}
                        </div>
                        <span className="text-white text-sm font-medium drop-shadow-lg">
                          {mockExperiences[currentIndex].user.name}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <h4 className="font-bold text-gray-900">
                        {mockExperiences[currentIndex].restaurant}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {mockExperiences[currentIndex].description}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-6 mt-4">
                        <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                          <Heart size={20} />
                          <span className="text-sm">{mockExperiences[currentIndex].likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-dinver-green transition-colors">
                          <MessageCircle size={20} />
                          <span className="text-sm">{mockExperiences[currentIndex].comments}</span>
                        </button>
                        <button className="text-gray-500 hover:text-dinver-green transition-colors">
                          <Share size={20} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Navigation buttons */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {mockExperiences.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-6 bg-dinver-green'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
