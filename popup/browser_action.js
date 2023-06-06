"use strict";

// ############################################################

var log_file = "", log_count = 0, cookies_count = 0, session_cookies = 0;

var textFile = null, makeTextFile = function (text) {
    var data = new Blob([text], {type: 'text/plain'});
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }
    textFile = window.URL.createObjectURL(data);
    return textFile;
};

function getActiveTab() {
    return browser.tabs.query({currentWindow: true, active: true});
}
getActiveTab().then((tabs) => {
    const tab_url = tabs.pop().url;
    if (tab_url == null) {
        document.getElementById("cookie-title").textContent = "All cookies:";
    }
    browser.cookies.getAll({url: tab_url}).then((cookies) => {
        cookies_count = cookies.length;
        for (let cookie of cookies) {
            if (cookie.session) {
                session_cookies++;
            }
        }
        document.getElementById("total-cookies").textContent = "Total: ".concat(cookies_count.toString());
        document.getElementById("session-cookies").textContent = "Session: ".concat(session_cookies.toString());
        document.getElementById("persistent-cookies").textContent = "Persistent: ".concat((cookies_count-session_cookies).toString());
    });
});

function getCurrentWindowTabs() {
    return browser.tabs.query({});
}
const cookieSync = {
    _cookieMap: new Map(),
    init: () => {cookieSync.addListener();},
    addListener: () => {
        document.getElementById("cookie-sync").addEventListener("click", (e) => {
            getCurrentWindowTabs().then((tabs) => {
                for (const tab of tabs) {
                    browser.cookies.getAll({url: tab.url}).then((cookies) => {
                        for (let cookie of cookies) {
                            if (cookieSync._cookieMap.has(cookie.name.concat("=").concat(cookie.value))) {
                                if (!cookieSync._cookieMap.get(cookie.name.concat("=").concat(cookie.value)).has(cookie.domain)) {
                                    cookieSync._cookieMap.get(cookie.name.concat("=").concat(cookie.value)).set(cookie.domain, 0);
                                }
                            } else {
                                cookieSync._cookieMap.set(cookie.name.concat("=").concat(cookie.value), new Map([[cookie.domain, 0]]));
                            }
                        }
                        if (tab === tabs.pop()) {
                            var sync_list = "";
                            for (let [name_value, value_map] of cookieSync._cookieMap) {
                                let [name, value] = name_value.split('=').map(s => s.trim());
                                if ((value_map.size > 1) && (name[0] != "_")) {
                                    sync_list = sync_list.concat(`[ Cookie: ( ${name} ), value: ( ${value} ), synced between: ( ${[...value_map.keys()].join(", ")} ) ]\r\n`);
                                    var sync = document.createElement('p');
                                    sync.textContent = sync_list
                                    document.getElementById("sync-list").appendChild(sync);
                                }
                            }
                        }
                    });
                }
            });
        });
    }
}
cookieSync.init();

const powerBrowserAction = {

    _menuList: document.getElementById("menu-list"),
  
    init: () => {
        powerBrowserAction.addListener();
    },
  
    addListener: () => {
  
        powerBrowserAction._menuList.addEventListener("click", (e) => {

            switch(e.target.id) {
                case "clear-domains":
                    chrome.runtime.sendMessage({msg: "ClearDomains"});
                    log_file = "";
                    log_count = 0;
                    for (var i = 0; i < 5; i++) {
                        document.getElementById("ts".concat(i)).textContent = "-";
                        document.getElementById("sd".concat(i)).textContent = "---";
                        document.getElementById("tpd".concat(i)).textContent = "---";
                    }
                    document.getElementById("log-length").textContent = "Log length: 0";
                    break;
                case "download":
                    var link = document.createElement('a');
                    link.setAttribute('download', 'third_domain_accesses_log.txt');
                    link.href = makeTextFile(log_file);
                    document.body.appendChild(link);
                    window.requestAnimationFrame(function () {
                        var event = new MouseEvent('click');
                        link.dispatchEvent(event);
                        document.body.removeChild(link);
                    });
                    break;
                    
            }
            // window.setTimeout(() => { window.close(); }, 2000 );
  
        });
    }
}

const hijackWarning = {

    _menuList: document.getElementById("warning-div"),
  
    init: () => {
        hijackWarning.addListener();
    },
  
    addListener: () => {
  
        hijackWarning._menuList.addEventListener("click", (e) => {

            switch(e.target.id) {
                case "close-warning":
                    document.getElementById("warning").textContent = "";
                    e.target.textContent = "";
                    chrome.runtime.sendMessage({msg: "CloseWarning"});
                    break;
                default:
                    console.log(e.target.id);
                    console.warn(e.target.parentNode.outerHTML);
            }
            // window.setTimeout(() => { window.close(); }, 2000 );
  
        });
    }
}

var ts_display = [];
var sd_display = [];
var tpd_display = [];

const backgroundListener = {
    init: () => {
        backgroundListener.addListener();
        chrome.runtime.sendMessage({msg: "OpenedPopup"});
    },

    _addListener: () => {

        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                if (request.msg === "TPD") {
                    const tpd = request.data.request;
                    const sd = request.data.source;
                    const ts = request.data.time;
                    for (var i = tpd.length; i > 0; i--) {
                        log_file = log_file
                            .concat(ts[i - 1]).concat("  ||  ")
                            .concat(sd[i - 1]).concat("  -->  ")
                            .concat(tpd[i - 1]).concat("\n");
                    }
                    log_count = tpd.length;
                    document.getElementById("log-length").textContent = "Log length: ".concat(log_count.toString()).concat(log_count===5000?" (max)":"");
                    for (var i = 5; i > 0; i--) {
                        if (tpd.length <= 5 - i) {
                            break;
                        }
                        const date = new Date(Date.parse(ts[ts.length - i]));
                        var date_display = (date.getDate() / 10 >= 1 ? "" : "0") + date.getDate() + "/" + (date.getMonth() / 9 >= 1 ? "" : "0") + (date.getMonth() + 1) + "/" + date.getFullYear() + "   " + ts[ts.length - i].slice(16, -8);
                        document.getElementById("ts".concat(5 - i)).textContent = date_display;
                        document.getElementById("sd".concat(5 - i)).textContent = sd[sd.length - i];
                        document.getElementById("tpd".concat(5 - i)).textContent = tpd[tpd.length - i];
                        ts_display.unshift(date_display);
                        sd_display.unshift(sd[sd.length - i]);
                        tpd_display.unshift(tpd[tpd.length - i]);
                        if (ts_display.length > 5) {
                            ts_display.pop();
                            sd_display.pop();
                            tpd_display.pop();
                        }
                    }
                    if (request.data.hijack > 0) {
                        if (request.data.hijack === 1) {
                            document.getElementById("warning").textContent = "Possível hijack/hook: Configurações do navegador possivelmente modificadas sem autorização";
                            document.getElementById("close-warning").textContent = "x";
                        }
                        if (request.data.hijack === 2) {
                            document.getElementById("warning").textContent = "Possível hijack/hook: Possível exploração de falha de XSS detectada";
                            document.getElementById("close-warning").textContent = "x";
                        }
                    }
                } else if (request.msg === "SingleDomain") {
                    var tpd = request.data.request;
                    var sd = request.data.source;
                    var ts = request.data.time;
                    log_file = ts.concat("  ||  ")
                        .concat(sd).concat("  -->  ")
                        .concat(tpd).concat("\n")
                        .concat(log_file);
                    if (log_count === 5000) {
                        var lines = log_file.split(/\r\n|\r|\n/);
                        lines.pop();
                        log_file = lines.join("\r\n");
                    } else {
                        log_count++;
                    }
                    document.getElementById("log-length").textContent = "Log length: ".concat(log_count.toString()).concat(log_count===5000?" (max)":"");
                    const date = new Date(Date.parse(ts));
                    var date_display = (date.getDate() / 10 >= 1 ? "" : "0") + date.getDate() + "/" + (date.getMonth() / 9 >= 1 ? "" : "0") + (date.getMonth() + 1) + "/" + date.getFullYear() + "   " + ts.slice(16, -8);
                    ts_display.unshift(date_display);
                    sd_display.unshift(sd);
                    tpd_display.unshift(tpd);
                    if (ts_display.length > 5) {
                        ts_display.pop();
                        sd_display.pop();
                        tpd_display.pop();
                    }
                    for (var i = 0; i < ts_display.length; i++) {
                        document.getElementById("ts".concat(i)).textContent = ts_display[i];
                        document.getElementById("sd".concat(i)).textContent = sd_display[i];
                        document.getElementById("tpd".concat(i)).textContent = tpd_display[i];
                    }
                } else if (request.msg === "Hijack") {
                    if (request.data == "BSM") {
                        console.log("Configurações do navegador possivelmente modificadas sem autorização");
                        document.getElementById("warning").textContent = "Possível hijack/hook: Configurações do navegador possivelmente modificadas sem autorização";
                        document.getElementById("close-warning").textContent = "x";
                    }
                    if (request.data == "XSS") {
                        console.log("Possível exploração de falha de XSS detectada");
                        document.getElementById("warning").textContent = "Possível hijack/hook: Possível exploração de falha de XSS detectada";
                        document.getElementById("close-warning").textContent = "x";
                    }
                }
            }
        );

    },
    get addListener() {
        return this._addListener;
    },
    set addListener(value) {
        this._addListener = value;
    },
}

function checkPrivacyPolicy() {
    const privacyPolicyElements = document.querySelectorAll("a, p, span");
  
    for (const element of privacyPolicyElements) {
        const text = element.innerText.toLowerCase();
    
        if (
            text.includes("privacy policy") ||
            text.includes("política de privacidade") ||
            text.includes("terms of service") ||
            text.includes("termos de serviço")
        ) {
            console.log("Privacy policy found on current window");
            return;
        }
    }
  
    console.log("The current window does not display a privacy policy");
}

checkPrivacyPolicy();

powerBrowserAction.init();
hijackWarning.init();
backgroundListener.init();