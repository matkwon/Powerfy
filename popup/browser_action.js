"use strict";

// ############################################################

var log_file = "", log_count = 0, cookies_count = 0, session_cookies = 0, privacy_policy = false;

var textFile = null, makeTextFile = function (text) {
    var data = new Blob([text], {type: 'text/plain'});
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }
    textFile = window.URL.createObjectURL(data);
    return textFile;
};

const cookieSync = {
    _cookieMap: new Map(),
    init: () => {cookieSync.addListener();},
    addListener: () => {
        document.getElementById("cookie-sync").addEventListener("click", (e) => {
            browser.tabs.query({}).then((tabs) => {
                tabs.push(null);
                for (const tab of tabs) {
                    browser.cookies.getAll({url: tab.url}).then((cookies) => {
                        for (let cookie of cookies) {
                            if (cookieSync._cookieMap.has(`${cookie.name}=${cookie.value}`)) {
                                if (!cookieSync._cookieMap.get(`${cookie.name}=${cookie.value}`).has(cookie.domain)) {
                                    cookieSync._cookieMap.get(`${cookie.name}=${cookie.value}`).set(cookie.domain, 0);
                                }
                            } else {
                                cookieSync._cookieMap.set(`${cookie.name}=${cookie.value}`, new Map([[cookie.domain, 0]]));
                            }
                        }
                        if (tab === tabs.pop()) {
                            for (let [name_value, value_map] of cookieSync._cookieMap) {
                                let [name, value] = name_value.split('=').map(s => s.trim());
                                if ((value_map.size > 1) && (name[0] != "_")) {
                                    var sync_item = `[ Cookie: ( ${name} ), value: ( ${value} ), synced between: ( ${[...value_map.keys()].join(", ")} ) ]\r\n`;
                                    var sync = document.createElement('p');
                                    sync.textContent = sync_item;
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
                        document.getElementById(`ts${i}`).textContent = "-";
                        document.getElementById(`sd${i}`).textContent = "---";
                        document.getElementById(`tpd${i}`).textContent = "---";
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
            }
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
                        log_file = `${log_file}${ts[i - 1]}  ||  ${sd[i - 1]}  -->  ${tpd[i - 1]}"\n"`;
                    }
                    log_count = tpd.length;
                    document.getElementById("log-length").textContent = `Log length: ${log_count}${log_count===5000?" (max)":""}`;
                    for (var i = 5; i > 0; i--) {
                        if (tpd.length <= 5 - i) {
                            break;
                        }
                        const date = new Date(Date.parse(ts[ts.length - i]));
                        var date_display = (date.getDate()/10>=1 ? "" : "0") + date.getDate() + "/" + (date.getMonth()/9>=1 ? "" : "0") + (date.getMonth()+1) + "/" + date.getFullYear() + "   " + ts[ts.length-i].slice(16, -8);
                        document.getElementById(`ts${5 - i}`).textContent = date_display;
                        document.getElementById(`sd${5 - i}`).textContent = sd[sd.length - i];
                        document.getElementById(`tpd${5 - i}`).textContent = tpd[tpd.length - i];
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
                    log_file = `${ts}  ||  ${sd}  -->  ${tpd}\n${log_file}`;
                    if (log_count === 10000) {
                        var lines = log_file.split(/\r\n|\r|\n/);
                        lines.pop();
                        log_file = lines.join("\r\n");
                    } else {
                        log_count++;
                    }
                    document.getElementById("log-length").textContent = `Log length: ${log_count}${log_count===5000?" (max)":""}`;
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
                        document.getElementById(`ts${i}`).textContent = ts_display[i];
                        document.getElementById(`sd${i}`).textContent = sd_display[i];
                        document.getElementById(`tpd${i}`).textContent = tpd_display[i];
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
            text.includes("privacy") ||
            text.includes("política de privacidade") ||
            text.includes("privacidade") ||
            text.includes("terms of service") ||
            text.includes("termos de serviço")
        ) {
            privacy_policy = true;
            document.getElementById("privacy-policy").textContent = "A privacy policy was found on the current window.";
            return;
        }
    }
    
    document.getElementById("privacy-policy").textContent = "The current window does not seem to display any privacy policy.";
}

function checkWebStorage() {
    const ls = localStorage;
    const ss = sessionStorage;
    
    switch (ls.length) {
        case 0:
            document.getElementById("local-storage").textContent = `There are currently no variables in the local web storage.`;
            break;
        case 1:
            document.getElementById("local-storage").textContent = `There is currently 1 variable in the local web storage.`;
            break;
        default:
            document.getElementById("local-storage").textContent = `There are currently ${ls.length} variables in the local web storage.`;
            break;
    }
    switch (ss.length) {
        case 0:
            document.getElementById("session-storage").textContent = `There are currently no variables in the web session storage.`;
            break;
        case 1:
            document.getElementById("session-storage").textContent = `There is currently 1 variable in the web session storage.`;
            break;
        default:
            document.getElementById("session-storage").textContent = `There are currently ${ss.length} variables in the web session storage.`;
            break;
    }
}

cookieSync.init();
powerBrowserAction.init();
hijackWarning.init();
backgroundListener.init();
checkPrivacyPolicy();
checkWebStorage();

browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
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
        let persistent_cookies = cookies_count-session_cookies;
        if (tab_url != null) {
            document.getElementById("current-domain").textContent = tab_url;
            document.getElementById("security-factor").textContent = cookies_count > 0 ?
            (`${Math.round(((privacy_policy?10:9) - cookies_count/10 - 2*persistent_cookies/cookies_count)*100)/100}`) :
            (`${privacy_policy?10:9}`);
        }
        document.getElementById("total-cookies").textContent = `Total: ${cookies_count}`;
        document.getElementById("session-cookies").textContent = `Session: ${session_cookies}`;
        document.getElementById("persistent-cookies").textContent = `Persistent: ${persistent_cookies}`;
    });
});