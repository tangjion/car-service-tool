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
// 从 cookie 读取 transfer-user-residence 并设置选中状态
async function initSourceCountry() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getTransferUserResidenceFromCookie
  });
  
  const raw = results && results[0] && results[0].result ? results[0].result : '';
  const code = raw.startsWith('2_') ? raw.slice(2) : raw;
  if (code) {
    const el = document.getElementById(code);
    if (el) el.classList.add('active');
    const sourceCodeInput = document.getElementById('sourceCode');
    sourceCodeInput.value = code;
  }
}

function getTransferUserResidenceFromCookie() {
  const match = document.cookie.match(/transfer-user-residence=([^;]+)/);
  return match ? match[1] : '';
}

initSourceCountry();

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

// chrome.storage.sync.get(['isGalileoDebug'], ({ isGalileoDebug }) => {
//   if(isGalileoDebug) {
//     document.getElementById('openGalileo').classList.add('checked')
//   } else {
//     document.getElementById('openGalileo').classList.remove('checked')
//   }
// });

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

chrome.storage.sync.get(['keplerId'], ({ keplerId }) => {
  if(keplerId) {
    const keplerIdInput = document.getElementById('keplerId');
    let keplerIdSelect = document.getElementById('keplerIdSelect')
    keplerIdInput.value = keplerId;
    // document.getElementById('showGuestCheckout').classList.add('checked')
  } else {
    // document.getElementById('showGuestCheckout').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isLogDebug'], ({ isLogDebug }) => {
  if(isLogDebug) {
    document.getElementById('logDebug').classList.add('checked')
  } else {
    document.getElementById('logDebug').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isReportLogDebug'], ({ isReportLogDebug }) => {
  if(isReportLogDebug) {
    document.getElementById('openReportLog').classList.add('checked')
  } else {
    document.getElementById('openReportLog').classList.remove('checked')
  }
});

chrome.storage.sync.get(['isSsr'], ({ isSsr }) => {
  if(isSsr) {
    document.getElementById('switchSsr').classList.add('checked')
  } else {
    document.getElementById('switchSsr').classList.remove('checked')
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
let setSourceCode = document.getElementById('setSourceCode')
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
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: setKlkRdc,
      args: [sc]
    });
  })
}
setSourceCode.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // 获取 客源国 输入框的值
  const sourceCodeInput = document.getElementById('sourceCode');
  const newSourceCode = sourceCodeInput.value;
  if (newSourceCode) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: changeSourceCountrysc,
      args: [newSourceCode, tab]
    });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: setKlkRdc,
      args: [newSourceCode]
    });
  } else {
    alert('请输入客源国');
  }
});

function changeSourceCountrysc(sc) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)){
    // 设置 cookie 中的 transfer-user-residence 字段，有效期1天
    const ONE_DAY = 86400;
    document.cookie = `transfer-user-residence=2_${sc}; max-age=${ONE_DAY}; path=/;`;
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

// 开启galileo日志debug模式
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

// 恢复上次保存的 _pt 值
chrome.storage.sync.get(['savedPtValue'], ({ savedPtValue }) => {
  if (savedPtValue) {
    document.getElementById('ptValue').value = savedPtValue;
  }
});

// 获取 _pt cookie 并复制
let getPtTokenBtn = document.getElementById('getPtToken')
getPtTokenBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/;
  if (!reg.test(tab.url)) {
    document.getElementById('ptValue').value = '';
    document.getElementById('ptValue').placeholder = '仅支持 Klook 域名';
    return;
  }
  try {
    const cookie = await chrome.cookies.get({ url: tab.url, name: '_pt' });
    const ptValue = cookie ? cookie.value : '';
    const ptInput = document.getElementById('ptValue');
    if (!ptValue) {
      ptInput.value = '';
      ptInput.placeholder = '未找到 _pt cookie';
      return;
    }
    ptInput.value = ptValue;
    chrome.storage.sync.set({ savedPtValue: ptValue });
    await navigator.clipboard.writeText(ptValue);
    getPtTokenBtn.textContent = 'COPIED!';
    setTimeout(() => { getPtTokenBtn.textContent = 'GET'; }, 1500);
  } catch (error) {
    console.error('获取 _pt cookie 失败:', error);
    alert('获取 _pt cookie 失败: ' + error.message);
  }
})

// 设置 _pt cookie
let setPtTokenBtn = document.getElementById('setPtToken')
setPtTokenBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/;
  if (!reg.test(tab.url)) {
    alert('仅支持 Klook 域名');
    return;
  }
  const ptInput = document.getElementById('ptValue');
  const newPt = ptInput.value.trim();
  if (!newPt) {
    alert('请输入 _pt 值');
    return;
  }
  try {
    const url = new URL(tab.url);
    await chrome.cookies.set({
      url: url.origin,
      name: '_pt',
      value: newPt,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:'
    });
    setPtTokenBtn.textContent = 'DONE!';
    chrome.tabs.reload(tab.id);
  } catch (error) {
    console.error('设置 _pt cookie 失败:', error);
    alert('设置 _pt cookie 失败: ' + error.message);
  }
})

// 清空 _pt cookie
let clearPtTokenBtn = document.getElementById('clearPtToken')
clearPtTokenBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/;
  if (!reg.test(tab.url)) {
    alert('仅支持 Klook 域名');
    return;
  }
  try {
    const url = new URL(tab.url);
    await chrome.cookies.remove({ url: url.origin + '/', name: '_pt' });
    document.getElementById('ptValue').value = '';
    chrome.storage.sync.remove('savedPtValue');
    chrome.tabs.reload(tab.id);
  } catch (error) {
    console.error('清空 _pt cookie 失败:', error);
    alert('清空 _pt cookie 失败: ' + error.message);
  }
})

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

// 切换到klook-web/ssrcarrental服务
let switchSsrBtn = document.getElementById('switchSsr')
switchSsrBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = switchSsrBtn.classList.contains('checked')
  !isChecked ? switchSsrBtn.classList.add('checked') : switchSsrBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: addTypeToUrl,
    args: [!isChecked]
  });
})

// 开启report日志
let reportLogBtn = document.getElementById('openReportLog')
reportLogBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isChecked = reportLogBtn.classList.contains('checked')
  !isChecked ? reportLogBtn.classList.add('checked') : reportLogBtn.classList.remove('checked')
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: changeReportLog,
    args: [!isChecked]
  });
})

function changeReportLog(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)){
    window.localStorage.setItem('__clientReport:debug', bool);
    window.location.reload();
  }
}

// 从远程配置文件加载实验列表和 meshLane
async function loadConfig() {
  const experimentSelect = document.getElementById('keplerIdSelect');
  const headerValueSelect = document.getElementById('headerValue');
  try {
    const res = await fetch('http://www.xiaoqi.fan/config.json');
    const { experiments, meshLane } = await res.json();

    // 填充 AB 实验
    for (const { group, variants } of experiments) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group;
      for (const { label, value } of variants) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        optgroup.appendChild(opt);
      }
      experimentSelect.appendChild(optgroup);
    }

    // 填充 meshLane 通道
    for (const { name, value } of meshLane) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = `${name} · ${value}`;
      headerValueSelect.appendChild(opt);
    }

    // 恢复已保存的请求头设置（需在选项渲染完成后再赋值）
    chrome.storage.sync.get(['customHeader'], ({ customHeader }) => {
      if (customHeader) {
        document.getElementById('headerName').value = customHeader.name || '';
        headerValueSelect.value = customHeader.value || '';
      }
    });
  } catch (e) {
    console.error('Failed to load config.json:', e);
  }
}

loadConfig();

// 切换AB实验
let keplerIdSelect = document.getElementById('keplerIdSelect')
let keplerIdInput = document.getElementById('keplerId');
keplerIdSelect.addEventListener("change", (event) => {
  const value = event.target.value;
  keplerIdInput.value = value;
})

// 设置keplerID
let setKeplerIdBtn = document.getElementById('setKeplerId')
setKeplerIdBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // 获取 keplerId 输入框的值
  const keplerIdInput = document.getElementById('keplerId');
  const newKeplerId = keplerIdInput.value;
  if (newKeplerId) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: setKeplerId,
      args: [newKeplerId, tab]
    });
  } else {
    alert('请输入keplerID');
  }
});

// 清空keplerID
let resetKeplerIdBtn = document.getElementById('resetKeplerId')
resetKeplerIdBtn.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: resetKeplerId,
    args: [true, tab]
  });
})

// 随机生成香港身份证
let generateHKIdBtn = document.getElementById('generateHKId')
generateHKIdBtn.addEventListener("click", async () => {
  generateHKID()
})

// 设置请求头
let setHeaderBtn = document.getElementById('setHeader')
setHeaderBtn.addEventListener("click", async () => {
  const headerName = document.getElementById('headerName').value.trim();
  const headerValue = document.getElementById('headerValue').value;
  if (!headerName) {
    alert('请输入请求头名称');
    return;
  }
  try {
    await setCustomHeader(headerName, headerValue);
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.reload(tab.id);
  } catch (error) {
    alert('设置失败: ' + error.message);
  }
});

// 清除请求头
let clearHeaderBtn = document.getElementById('clearHeader')
clearHeaderBtn.addEventListener("click", async () => {
  await clearCustomHeader();
  document.getElementById('headerName').value = '';
  document.getElementById('headerValue').value = '';
  alert('请求头已清除');
});

// 设置自定义请求头
async function setCustomHeader(headerName, headerValue) {
  // 先清除旧规则
  await clearCustomHeader();
  
  const resourceTypes = ['main_frame', 'sub_frame', 'xmlhttprequest', 'other'];
  
  // 添加新规则
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: headerName,
            operation: 'set',
            value: headerValue
          }
        ]
      },
      condition: {
        urlFilter: '||klook.com',
        resourceTypes: resourceTypes
      }
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: headerName,
            operation: 'set',
            value: headerValue
          }
        ]
      },
      condition: {
        urlFilter: '||klook.io',
        resourceTypes: resourceTypes
      }
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: headerName,
            operation: 'set',
            value: headerValue
          }
        ]
      },
      condition: {
        urlFilter: '||klooktest.com',
        resourceTypes: resourceTypes
      }
    },
    {
      id: 4,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: headerName,
            operation: 'set',
            value: headerValue
          }
        ]
      },
      condition: {
        urlFilter: '|http://localhost',
        resourceTypes: resourceTypes
      }
    }
  ];
  
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: []
    });
    console.log('规则设置成功:', rules);
  } catch (error) {
    console.error('设置规则失败:', error);
    throw error;
  }
  
  // 保存当前设置
  await chrome.storage.sync.set({ customHeader: { name: headerName, value: headerValue } });
}

// 清除自定义请求头
async function clearCustomHeader() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [],
      removeRuleIds: [1, 2, 3, 4]
    });
    console.log('规则已清除');
  } catch (error) {
    console.error('清除规则失败:', error);
  }
  chrome.storage.sync.remove('customHeader');
}

// 请求头初始化已移入 loadConfig()，在 meshLane 选项渲染后执行

function generateHKID() {
  // 生成第一个字母（通常是Z）
  const firstLetter = 'Z';
  // 生成第二个字母（这里我们用Q-U作为示例）
  const secondLetters = ['Q', 'R', 'S', 'T', 'U'];
  const secondLetter = secondLetters[Math.floor(Math.random() * secondLetters.length)];
  // 生成6位随机数字
  const numbers = Array.from({length: 6}, () => Math.floor(Math.random() * 10)).join('');
  // 计算校验码
  const checkDigit = calculateCheckDigit(firstLetter, secondLetter, numbers);
  const hkId = document.getElementById('hkId');
  const value = `${firstLetter}${secondLetter}${numbers}(${checkDigit})`;
  hkId.value = value
  // 将香港身份证号码复制到剪贴板
  try {
    navigator.clipboard.writeText(value).then(() => {
    }).catch(err => {
      alert('复制到剪贴板失败，请手动复制');
    });
  } catch (error) {
    console.error('复制到剪贴板时出错:', error);
    alert('复制到剪贴板失败，请手动复制');
  }
}

function calculateCheckDigit(firstLetter, secondLetter, numbers) {
  // 转换字母为对应的数值（A=10, B=11, ..., Z=35）
  const firstValue = firstLetter.charCodeAt(0) - 55;  // Z = 35
  const secondValue = secondLetter.charCodeAt(0) - 55;
  // 权重值
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  // 计算总和
  let sum = firstValue * weights[0] + secondValue * weights[1];
  // 加上数字部分的权重计算
  for (let i = 0; i < 6; i++) {
      sum += parseInt(numbers[i]) * weights[i + 2];
  }
  // 计算校验码
  const remainder = sum % 11;
  return remainder === 0 ? 0 : 11 - remainder;
}

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

// url添加guest参数
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
    window.location.href = url
  }
}

// 设置klk-rdc
function setKlkRdc(code) {
  console.log('000000')
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  const ONE_DAY = 86400 * 1000
  if(reg.test(url)) {
    if (code) {
      // 在cookie中添加一个log-debug字段，值为test_car_rental,有效期为30分钟
      document.cookie = `transfer-user-residence=2_${code}; max-age=${ONE_DAY}; path=/;`;
    }
    window.location.href = url
  }
}

function addTypeToUrl(bool) {
  const reg = /^(https:\/\/.+\.klooktest.+\/)/
  const url = window.location.href
  if(reg.test(url)) {
    if (bool) {
      if (url.includes('?') && !url.includes('type=')) {
        window.location.href = url + '&type=new'
      } else if (!url.includes('?') && !url.includes('type=')) {
        window.location.href = url + '?type=new'
      }
    } else {
      if (url.includes('?type=')) {
        window.location.href = url.replace('?type=new', '')
      } else if (url.includes('&type=')) {
        window.location.href = url.replace('&type=new', '')
      }
    }
  }
}

// 设置keplerID
function setKeplerId(newKeplerId) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/;
  const url = window.location.href;
  if (reg.test(url)) {
    if (newKeplerId) {
      document.cookie = `kepler_id=${newKeplerId}; max-age=1800; path=/;`;
      window.location.href = url;
    } else {
      alert('请输入keplerID');
    }
  }
}

// 清空keplerID
function resetKeplerId(bool) {
  const reg = /^(https:\/\/.+\.klook.+\/)|localhost/
  const url = window.location.href
  if(reg.test(url)) {
    document.cookie = 'kepler_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = url
  }
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
