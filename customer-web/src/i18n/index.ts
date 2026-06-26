import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enHome from './locales/en/home.json'
import enProduct from './locales/en/product.json'
import enOrders from './locales/en/orders.json'

import mrCommon from './locales/mr/common.json'
import mrAuth from './locales/mr/auth.json'
import mrHome from './locales/mr/home.json'
import mrProduct from './locales/mr/product.json'
import mrOrders from './locales/mr/orders.json'

const savedLang = localStorage.getItem('language') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, auth: enAuth, home: enHome, product: enProduct, orders: enOrders },
    mr: { common: mrCommon, auth: mrAuth, home: mrHome, product: mrProduct, orders: mrOrders },
  },
  lng: savedLang,
  fallbackLng: 'en',
  ns: ['common', 'auth', 'home', 'product', 'orders'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
