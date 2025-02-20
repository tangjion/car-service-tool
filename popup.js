// // Initialize butotn with users's prefered color
// let changeColor = document.getElementById("changeColor");

// chrome.storage.sync.get("color", ({ color }) => {
//   changeColor.style.backgroundColor = color;
// });

// // When the button is clicked, inject setPageBackgroundColor into current page
// changeColor.addEventListener("click", async () => {
//   let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     function: setPageBackgroundColor,
//   });
// });
// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     console.log(sender.tab ?
//       "from a content script:" + sender.tab.url :
//       "from the extension");
//     if (request.greeting === "hello"){
//       document.getElementById('CN').style.backgroundColor = '#ccc'
//       sendResponse({farewell: "goodbye"});
//     }
//   }
// );
chrome.storage.sync.get(['code'], ({ code }) => {
  document.getElementById(code).classList.add('active')
});

chrome.storage.sync.get(['isIhtDebug'], ({ isIhtDebug }) => {
  if(isIhtDebug) {
    document.getElementById('openIht').classList.add('checked')
  } else {
    document.getElementById('openIht').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isGalileoDebug'], ({ isGalileoDebug }) => {
  if(isGalileoDebug) {
    document.getElementById('openGalileo').classList.add('checked')
  } else {
    document.getElementById('openGalileo').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isGalileoDebug'], ({ isGalileoDebug }) => {
  if(isGalileoDebug) {
    document.getElementById('openGalileo').classList.add('checked')
  } else {
    document.getElementById('openGalileo').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isTextId'], ({ isTextId }) => {
  if(isTextId) {
    document.getElementById('showTextId').classList.add('checked')
  } else {
    document.getElementById('showTextId').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isGuestCheckout'], ({ isGuestCheckout }) => {
  if(isGuestCheckout) {
    document.getElementById('showGuestCheckout').classList.add('checked')
  } else {
    document.getElementById('showGuestCheckout').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isLogDebug'], ({ isLogDebug }) => {
  if(isLogDebug) {
    document.getElementById('logDebug').classList.add('checked')
  } else {
    document.getElementById('logDebug').classList.remove('checked')
  }
});

// chrome.storage.sync.get(['hasTextId'], ({ hasTextId }) => {
//   // document.getElementById('showTextId').innerHTML = hasTextId
//   if(hasTextId) {
//     document.getElementById('showTextId').classList.add('checked')
//   } else {
//     document.getElementById('showTextId').classList.remove('checked')
//   }
// })

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   if (request.targetParam !== undefined) {
//     document.getElementById('displayArea').innerText = `The value of the parameter is: ${request.targetParam}`;
//   }
// });

// 修改客源国
let countryEle = document.querySelectorAll(".item-list li");
for(let i = 0,len = countryEle.length; i < len; i++) {
  countryEle[i].addEventListener("click", async () => {
    const $this = countryEle[i]
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const sc = $this.getAttribute('id')
    let current = $this.parentElement.querySelector('.active');
    if (current && current !== $this) {
      current.classList.remove('active');
    }
    $this.classList.add('active')
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: changeSourceCountrysc,
      args: [sc]
    });
  })
}

function changeSourceCountrysc(sc) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)){
    window.localStorage.setItem('carRentalCountry', JSON.stringify({
      localData: sc,
      expires: new Date().getTime() + 86400000
    }));
    window.location.reload();
  }
}

// 开启iht日志
let ihtBtn = document.getElementById('openIht')
ihtBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = ihtBtn.classList.contains('checked')
  !isChecked ? ihtBtn.classList.add('checked') : ihtBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: changeIhtLog,
    args: [!isChecked]
  });
})

function changeIhtLog(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)){
    window.localStorage.setItem('__inhouse:debug', bool);
    window.location.reload();
  }
}

// 开启Galileo日志
let galileoBtn = document.getElementById('openGalileo')
galileoBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = galileoBtn.classList.contains('checked')
  !isChecked ? galileoBtn.classList.add('checked') : galileoBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: changeGalileoLog,
    args: [!isChecked]
  });
})

function changeGalileoLog(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)){
    window.localStorage.setItem('__galileo_debug', bool ? 'debug' : '');
    window.location.reload();
  }
}

// 查看页面TextId内容
let textIdBtn = document.getElementById('showTextId')
textIdBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = textIdBtn.classList.contains('checked')
  !isChecked ? textIdBtn.classList.add('checked') : textIdBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: addTextIdToUrl,
    args: [!isChecked]
  });
})

// 切换到guest checkout 模式
let guestCheckoutBtn = document.getElementById('showGuestCheckout')
guestCheckoutBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = guestCheckoutBtn.classList.contains('checked')
  !isChecked ? guestCheckoutBtn.classList.add('checked') : guestCheckoutBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: addGuestCheckoutToUrl,
    args: [!isChecked, tab]
  });
})

// let copyPtBtn = document.getElementById('copyPt')
// copyPtBtn.addEventListener("click", async () => {
//   let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     function: copyPt,
//     args: [true, tab]
//   });
// })

// 切换到log debug模式
let logDebugBtn = document.getElementById('logDebug')
logDebugBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = logDebugBtn.classList.contains('checked')
  !isChecked ? logDebugBtn.classList.add('checked') : logDebugBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: openLogDebug,
    args: [!isChecked, tab]
  });
})

function addTextIdToUrl(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)) {
    if (bool) {
      if (url.includes('?') && !url.includes('cmstextid')) {
        window.location.href = url + '&cmstextid=1'
      } else if (!url.includes('?') && !url.includes('cmstextid')) {
        window.location.href = url + '?cmstextid=1'
      }
    } else {
      if (url.includes('?cmstextid')) {
        window.location.href = url.replace('?cmstextid=1', '')
      } else if (url.includes('&cmstextid')) {
        window.location.href = url.replace('&cmstextid=1', '')
      }
    }
  }
}

function addGuestCheckoutToUrl(bool, tab) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)) {
    if (bool) {
      if (url.includes('?') && !url.includes('util')) {
        window.location.href = url + '&util=guest_checkout'
      } else if (!url.includes('?') && !url.includes('util')) {
        window.location.href = url + '?util=guest_checkout'
      }
    } else {
      if (url.includes('?util')) {
        window.location.href = url.replace('?util=guest_checkout', '')
      } else if (url.includes('&util')) {
        window.location.href = url.replace('&util=guest_checkout', '')
      }
      document.cookie = 'util_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'util_type=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }
}

// 复制cookie里面的_pt值到剪贴板
function copyPt() {
  console.log('copyPt');
  const cookie = document.cookie;
  const reg = /_pt=([^;]+)/
  const pt = cookie.match(reg)[1]
  navigator.clipboard.writeText(pt).then(function() {
    alert('复制成功')
  }, function() {
    alert('复制失败')
  });
}

// 打开后端日志功能
function openLogDebug(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)) {
    if (bool) {
      // 在cookie中添加一个log-debug字段，值为test_car_rental,有效期为30分钟
      document.cookie = 'log-debug=test_car_rental; max-age=1800; path=/;';
    } else {
      document.cookie = 'log-debug=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }
  window.location.href = url
}

// document.addEventListener("DOMContentLoaded", function() {
//   console.log('1212321')
//   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
//     const urlParams = new URLSearchParams(tabs[0].url.split('?')[1]);
//     const hasTextId = urlParams.get('cmstextid');
//     const hasGuestCheckout = urlParams.get('util');
//     // // 获取当前客源国
//     // const scode = JSON.parse(window.localStorage.getItem('carRentalCountry')).localData || 'HK'
//     // document.getElementById(scode).classList.add('active')
//     alert(scode)
//     if(hasTextId) {
//       document.getElementById('showTextId').classList.add('checked')
//     } else {
//       document.getElementById('showTextId').classList.remove('checked')
//     }
//     if(hasGuestCheckout) {
//       document.getElementById('showGuestCheckout').classList.add('checked')
//     } else {
//       document.getElementById('showGuestCheckout').classList.remove('checked')
//     }
//     // 判断cookie中的log-debug字段是否存在并且值为test_car_rental
//     const cookie = document.cookie;
//     if(cookie.includes('log-debug=test_car_rental')) {
//       document.getElementById('logDebug').classList.add('checked')
//     } else {
//       document.getElementById('logDebug').classList.remove('checked')
//     }
//   });
// });

// The body of this function will be execuetd as a content script inside the
// current page
// function setPageBackgroundColor() {
//   chrome.storage.sync.get("color", ({ color }) => {
//     document.body.style.backgroundColor = color;
//   });
// }

// function setItem(key, value, expires) {
//   window.localStorage.setItem(key, JSON.stringify({
//     localData: value,
//     expires: new Date().getTime() + expires
//   }))
// }
