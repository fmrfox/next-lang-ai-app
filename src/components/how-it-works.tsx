"use client";

import { motion } from "framer-motion";
import { ImageModal } from "./image-modal";
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Locale } from '@/types/locale';

const localeNames = {
  en: 'English',
  pl: 'Polski',
  es: 'Español',
  it: 'Italiano'
};

export default function HowItWorks() {
  const t = useTranslations('HowItWorks');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = params.locale as Locale || 'en';



  const changeLanguage = (locale: Locale) => {
    router.push(pathname, { locale });
  };

  return (
    <div id="how-it-works" className="relative min-h-screen w-full py-20">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              {t('title')}
            </span>
          </h2>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Step 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32 relative"
        >
          <div className="text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500">
                {t('step1.title')}
              </span>
            </h3>
            <p className="text-gray-300 text-lg mb-6">
              {t('step1.subtitle')}
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>{t('step1.selectNative')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>{t('step1.chooseTarget')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>{t('step1.pickDifficulty')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>
                  {t('step1.describeWhatToLearn')}
                </span>
                <ul className="ml-6 mt-2 space-y-2">
                  <li className="flex items-start">
                    <span className="text-purple-300 mr-2 text-sm">→</span>
                    <span className="italic">
                      &ldquo;{t('step1.example1')}&rdquo;
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-300 mr-2 text-sm">→</span>
                    <span className="italic">
                      &ldquo;{t('step1.example2')}&rdquo;
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-300 mr-2 text-sm">→</span>
                    <span className="italic">
                      &ldquo;{t('step1.example3')}&rdquo;
                    </span>
                  </li>
                </ul>
              </li>
            </ul>

            <div className="mt-8 p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
              <p className="text-purple-200 text-sm">
                <span className="font-semibold">Pro tip:</span> {t('step1.proTip')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mt-8">
              {Object.entries(localeNames).map(([locale, name]) => (
                <button
                  key={locale}
                  onClick={() => changeLanguage(locale as Locale)}
                  className={`inline-flex items-center px-6 py-2.5 rounded-full transition-all duration-300 ${
                    currentLocale === locale
                      ? "bg-purple-600 border border-purple-400 text-white shadow-lg shadow-purple-700/30"
                      : "bg-black border border-purple-600 text-white hover:bg-purple-900/30"
                  }`}
                  title={`Switch to ${name}`}
                  aria-label={`Switch to ${name}`}
                >
                  <span className="font-bold mr-2">{locale.toUpperCase()}</span> {name}
                  {currentLocale === locale && (
                    <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-purple-400/70">
              {t('step1.clickToChange')}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="group inline-block rounded-xl border border-purple-600/40 shadow-lg shadow-purple-900/20 bg-black/40 p-[3px] group-hover:border-purple-500/70 group-hover:shadow-purple-700/30 transition-all duration-300">
              <ImageModal
                src="/landing.png"
                alt="Language Selection"
                className="rounded-lg"
              />
            </div>
          </div>
        </motion.div>

        {/* Step 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32 relative"
        >
          <div className="flex flex-col items-center justify-center order-2 md:order-1">
            <div className="grid grid-cols-1 gap-4">
              <div className="group inline-block rounded-xl border border-pink-600/40 shadow-lg shadow-pink-900/20 bg-black/40 p-[3px] group-hover:border-pink-500/70 group-hover:shadow-pink-700/30 transition-all duration-300">
                <ImageModal
                  src="/flashcard.png"
                  alt="Flashcard Interaction"
                  className="rounded-lg"
                />
              </div>
              
              <div className="text-center mb-3">
                <p className="text-gray-300 text-sm italic">{t('step2.filterDescription')}</p>
              </div>
              
              <div className="flex gap-4">
                <div className="group inline-block w-1/2 rounded-xl border border-pink-600/40 shadow-lg shadow-pink-900/20 bg-black/40 p-[3px] group-hover:border-pink-500/70 group-hover:shadow-pink-700/30 transition-all duration-300">
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src="/lang.png" 
                      alt="Language Filter" 
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="group inline-block w-1/2 rounded-xl border border-pink-600/40 shadow-lg shadow-pink-900/20 bg-black/40 p-[3px] group-hover:border-pink-500/70 group-hover:shadow-pink-700/30 transition-all duration-300">
                  <div className="relative rounded-lg overflow-hidden">
                    <img 
                      src="/learn.png" 
                      alt="Progress Filter" 
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-left order-1 md:order-2">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-pink-500">
                {t('step2.title')}
              </span>
            </h3>
            <p className="text-gray-300 text-lg mb-6">
              {t('step2.subtitle')}
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>{t('step2.multipleChoice')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>
                  {t('step2.checkTranslations')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>
                  {t('step2.listenPronunciation')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>{t('step2.addMoreCards')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>{t('step2.filterByLanguage')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2 text-xl">•</span>
                <span>{t('step2.trackProgress')}</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Step 3 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32"
        >
          <div className="text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {t('step3.title')}
              </span>
            </h3>
            <p className="text-gray-300 text-lg mb-6">
              {t('step3.subtitle')}
            </p>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>
                  {t('step3.seeMastered')}
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>{t('step3.setTargets')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>{t('step3.viewCharts')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-400 mr-2 text-xl">•</span>
                <span>
                  {t('step3.smartRepetition')}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center">
            <div className="group inline-block rounded-xl border border-purple-600/40 shadow-lg shadow-purple-900/20 bg-black/40 p-[3px] group-hover:border-purple-500/70 group-hover:shadow-purple-700/30 transition-all duration-300">
              <ImageModal
                src="/progress.png"
                alt="Progress Tracking"
                className="rounded-lg"
              />
            </div>
          </div>
        </motion.div>

        {/* Step 4 — browser extension */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-16"
        >
          <div className="flex items-center justify-center order-2 md:order-1">
            <div className="group inline-block rounded-xl border border-purple-600/40 shadow-lg shadow-purple-900/20 bg-black/40 p-[3px] group-hover:border-purple-500/70 group-hover:shadow-purple-700/30 transition-all duration-300">
              <ImageModal
                src="/extension.png"
                alt={t('step4.imageAlt')}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="text-left order-1 md:order-2">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
                {t('step4.title')}
              </span>
            </h3>
            <p className="text-gray-300 text-lg mb-6">
              {t('step4.subtitle')}
            </p>
            <ul className="space-y-3 text-gray-400">
              {(['select', 'context', 'category', 'install'] as const).map((key) => (
                <li key={key} className="flex items-start">
                  <span className="text-purple-400 mr-2 text-xl">•</span>
                  <span>{t(`step4.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>


    </div>
  );
}
