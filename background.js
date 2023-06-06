"use strict";

// ############################################################

var tpd = [], sd = [], ts = [];
var popup_open = false
var hj = 0;

browser.webRequest.onBeforeRequest.addListener((details) => {
    const sourceUrl = details.originUrl || details.initiator;
    const sourceDomain = new URL(sourceUrl).hostname;
    const requestDomain = new URL(details.url).hostname;
    if (sourceDomain !== requestDomain) {
        const timestamp = (new Date(details.timeStamp)).toString().slice(0, -29);
        tpd.push(requestDomain);
        sd.push(sourceDomain);
        ts.push(timestamp);
        if (tpd.length > 10000) {
            tpd.shift();
            sd.shift();
            ts.shift();
        }
        if (popup_open) {
            chrome.runtime.sendMessage({msg: "SingleDomain", data: {source: sourceDomain, request: requestDomain, time: timestamp}});
        }
    }
}, {urls: ["<all_urls>"]}, ["blocking"]);

function checkPopupStatus() {
    const views = chrome.extension.getViews({ type: "popup" });
    if (views.length === 0) {popup_open = false;}
}

setInterval(checkPopupStatus, 1000);

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.msg === "ClearDomains") {
            tpd = [];
            sd = [];
            ts = [];
        } else if (request.msg === "OpenedPopup") {
            popup_open = true;
            chrome.runtime.sendMessage({msg: "TPD", data: {source: sd, request: tpd, time: ts, hijack: hj}});
        } else if (request.msg === "CloseWarning") {
            hj = 0;
        }
    }
);

// ############################################################

// Detecção de possíveis hijackings e hooks

browser.webRequest.onHeadersReceived.addListener((details) => {
    const { responseHeaders } = details;
    if (areBrowserSettingsModified(responseHeaders)) {
        hj = 1;
        chrome.runtime.sendMessage({msg: "Hijack", data: "BSM"});
    }
}, { urls: ["<all_urls>"], types: ["main_frame"] });
  
browser.webRequest.onBeforeRequest.addListener((details) => {
    const { url } = details;
    if (isXssExploitationDetected(url)) {
        hj = 2;
        chrome.runtime.sendMessage({msg: "Hijack", data: "XSS"});
    }
}, { urls: ["<all_urls>"], types: ["main_frame"] });
  
function areBrowserSettingsModified(responseHeaders) {
    const modifiedHeaders = responseHeaders.find(header =>
        header.name.toLowerCase() === "content-security-policy" ||
        header.name.toLowerCase() === "cross-origin-embedder-policy" ||
        header.name.toLowerCase() === "cross-origin-opener-policy" ||
        header.name.toLowerCase() === "cross-origin-resource-policy" ||
        header.name.toLowerCase() === "x-frame-options" ||
        header.name.toLowerCase() === "x-xss-protection" ||
        header.name.toLowerCase() === "x-content-type-options"
    );
        
    if (modifiedHeaders) return true;
    return false;
}
  
function isXssExploitationDetected(url) {
    const urlShortenerRegex = /(bit\.ly|goo\.gl)/gi;
    const xssExploitRegex = /(<(script|iframe)[^>]*)>/gi;
    if (xssExploitRegex.test(url) || urlShortenerRegex.test(url)) return true;

    const sus_chars = ["<", ">", "'", '"', "(", ")", "[", "]", "{", "}", "+", "&", "%"]
    for (var i = 0; i < url.length; i++)
        if (sus_chars.includes(url[i])) return true;
  
    return false;
}