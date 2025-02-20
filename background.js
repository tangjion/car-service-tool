var customHeaders;
var headerInjectionEnable;

/*
 * Add listener for onBeforeSendHeaders events which provides access to headers.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (info) {
    // Get already saved value of 'Enable' checkbox.
    // chrome.storage.local.get('headerInjectionEnable', function (items) {
    //   if (typeof items.headerInjectionEnable != 'undefined') {
    //     headerInjectionEnable = items.headerInjectionEnable;
    //   }
    // });

    // If 'Enable' checkbox is checked, then only add header.
    console.log('asdfadadfaf11212');
    chrome.storage.local.get('headerJson', function (items) {
      console.log('afafafa', items);
      if (typeof items.headerJson != 'undefined') {
        customHeaders = items.headerJson;
      }
    });

    if (customHeaders) {
      info.requestHeaders.push(...customHeaders);
    }

    return {
      requestHeaders: info.requestHeaders
    };
  },
  // Do this for all URLs
  {
    urls: ['<all_urls>']
  },
  ['blocking', 'requestHeaders']
);
