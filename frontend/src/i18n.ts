import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enProduct from './locales/en/product.json';
import enOrders from './locales/en/orders.json';
import enFarmer from './locales/en/farmer.json';

// Marathi
import mrCommon from './locales/mr/common.json';
import mrAuth from './locales/mr/auth.json';
import mrHome from './locales/mr/home.json';
import mrProduct from './locales/mr/product.json';
import mrOrders from './locales/mr/orders.json';
import mrFarmer from './locales/mr/farmer.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    product: enProduct,
    orders: enOrders,
    farmer: enFarmer,
  },
  mr: {
    common: mrCommon,
    auth: mrAuth,
    home: mrHome,
    product: mrProduct,
    orders: mrOrders,
    farmer: mrFarmer,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'auth', 'home', 'product', 'orders', 'farmer'],
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
