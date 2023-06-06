# Powerfy
By Matheus Kwon

### 1. Introduction

This repository contains an add-on/extension for Mozilla Firefox browser. The purpose of its development is to raise awareness about web navigation insecurity and data sensitivity. It displays:
- Cookies: total number of cookies (also, both session and persistent) in the current tab. Also, cookie syncing analysis between all cookies;
- Web storage: whether the user has local web storage or web session storage;
- Privacy policy: detection of any privacy policy in the current domain;
- Third party domains: latest access to third party domains. Only displayed up to 5 entries, but a maximum of 10,000 entries is stored, deleting oldest entries on overflow. The log is downloadable and clearable;
- Security factor: calculated by the number of cookies (7), persistent cookies : total cookies ratio (2) and privacy policy existance (1). Out of 10;
- Possible hijacking/hook detection: when detected, a notificatio appears in the extension window. Closable notification.

### 2. Installation

- Clone this repository
- Open Firefox

Now, you can install it temporarily or officially. Temporarily:

- Go to about:debugging
- Click "Load Temporary Add-on"
- Select the manifest.json file

Officially:

- Open the "File" section and select "Open File", or just press _Ctrl+O_
- Select the "powerfy.xpi" file

Either way, the extension should now be functioning and on your extension bar.