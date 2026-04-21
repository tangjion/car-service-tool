const carRentalCountry = window.localStorage.getItem('carRentalCountry')
const scode = carRentalCountry ? JSON.parse(carRentalCountry).localData || 'HK' : 'HK'

const inHouseDebug = window.localStorage.getItem('__inhouse:debug')
const isIht = inHouseDebug ? JSON.parse(inHouseDebug) : null

const isGalileo = window.localStorage.getItem('__galileo_debug')
const urlParams = new URLSearchParams(window.location.search);
const isLog = document.cookie.includes('log-debug=test_car_rental')

const clientReport = window.localStorage.getItem('__clientReport:debug')
const isReportLog = clientReport ? JSON.parse(clientReport) : null

const isGuestCheckout = document.cookie.includes('util_name=guest_checkout')
const keplerCookie = document.cookie.split(';').find((item) => item.includes('kepler_id'))
const keplerId = keplerCookie ? keplerCookie.split('=')[1] : null
const isTextId = urlParams.get('cmstextid');
const isSsr = urlParams.get('type');
// console.log('isGuestCheckout', isGuestCheckout, isLog, document.cookie);

chrome.storage.sync.set({ code: scode});
chrome.storage.sync.set({ isIhtDebug: isIht });
chrome.storage.sync.set({ isGalileoDebug: isGalileo });
chrome.storage.sync.set({ isTextId: isTextId });
chrome.storage.sync.set({ isGuestCheckout: isGuestCheckout });
chrome.storage.sync.set({ keplerId: keplerId });
chrome.storage.sync.set({ isLogDebug: isLog });
chrome.storage.sync.set({ isReportLogDebug: isReportLog });
chrome.storage.sync.set({ isSsr: isSsr });
