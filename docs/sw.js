/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  importScripts("./sw-push.js");
  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-push.js",
    "revision": "d48e91e68d7ff7b9b5a004c73df39cb6"
  }, {
    "url": "screenshot-wide.png",
    "revision": "ee091d91968c76ee935c26772a51cfcf"
  }, {
    "url": "screenshot-mobile.png",
    "revision": "a1b80f58fd559bf6be3d21655a6bfc1e"
  }, {
    "url": "logo.svg",
    "revision": "ba41a2279ebdc25d5db463b289dbca95"
  }, {
    "url": "index.html",
    "revision": "eaf5f0cb5c8dcd3c9886269983c831db"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "b817ede17f2f0d269dda28f1432d053b"
  }, {
    "url": "icon-maskable-192.png",
    "revision": "85caaf8a09ec2370168f8b6b5cd3150d"
  }, {
    "url": "icon-512.png",
    "revision": "6a59de7aecf5c584eb0c0a6017de7d9c"
  }, {
    "url": "icon-192.png",
    "revision": "004ebf7ff6316c991368f44312e0f01d"
  }, {
    "url": "favicon.ico",
    "revision": "bfc72f19efd6d3284bd62546d9bd63e7"
  }, {
    "url": "404.html",
    "revision": "e99cb70d5e7238a490ace1cb3a41a873"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/logo-DMnEyw2d.svg",
    "revision": null
  }, {
    "url": "assets/index-CsmQR0N_.js",
    "revision": null
  }, {
    "url": "assets/index-BBJNWH09.css",
    "revision": null
  }, {
    "url": "assets/icon-512-D8WQ2FLv.png",
    "revision": null
  }, {
    "url": "assets/icon-192-Wb0rAL2q.png",
    "revision": null
  }, {
    "url": "assets/favicon-CqGqXTPH.ico",
    "revision": null
  }, {
    "url": "404.html",
    "revision": "e99cb70d5e7238a490ace1cb3a41a873"
  }, {
    "url": "favicon.ico",
    "revision": "bfc72f19efd6d3284bd62546d9bd63e7"
  }, {
    "url": "icon-192.png",
    "revision": "004ebf7ff6316c991368f44312e0f01d"
  }, {
    "url": "icon-512.png",
    "revision": "6a59de7aecf5c584eb0c0a6017de7d9c"
  }, {
    "url": "icon-maskable-192.png",
    "revision": "85caaf8a09ec2370168f8b6b5cd3150d"
  }, {
    "url": "icon-maskable-512.png",
    "revision": "b817ede17f2f0d269dda28f1432d053b"
  }, {
    "url": "logo.svg",
    "revision": "ba41a2279ebdc25d5db463b289dbca95"
  }, {
    "url": "screenshot-mobile.png",
    "revision": "a1b80f58fd559bf6be3d21655a6bfc1e"
  }, {
    "url": "screenshot-wide.png",
    "revision": "ee091d91968c76ee935c26772a51cfcf"
  }, {
    "url": "sw-push.js",
    "revision": "d48e91e68d7ff7b9b5a004c73df39cb6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "97831088886b9f53c995152ab0229408"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
