const scode = JSON.parse(window.localStorage.getItem('carRentalCountry')).localData || 'HK'
const isIht = JSON.parse(window.localStorage.getItem('__inhouse:debug'))
const isGalileo = window.localStorage.getItem('__galileo_debug')
const urlParams = new URLSearchParams(window.location.search);
const isLog = document.cookie.includes('log-debug=test_car_rental')
const isGuestCheckout = document.cookie.includes('util_name=guest_checkout')
const keplerId = document.cookie.split(';').find((item) => item.includes('kepler_id')).split('=')[1];
console.log('adaasdakeplerId', keplerId)
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
chrome.storage.sync.set({ isSsr: isSsr });