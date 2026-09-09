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
    "url": "registerSW.js",
    "revision": "2f281ba6d322463056ed1326adfe6666"
  }, {
    "url": "logo.svg",
    "revision": "8799b4684225d5eea22624180e4b707d"
  }, {
    "url": "index.html",
    "revision": "dab4d63cc1ac4c6b38ef63f229411a43"
  }, {
    "url": "icon-512.png",
    "revision": "c3da86fef21546be1a75c79abcc0ae72"
  }, {
    "url": "icon-192.png",
    "revision": "1288048c176b8d691573ed448d265e83"
  }, {
    "url": "favicon.ico",
    "revision": "1288048c176b8d691573ed448d265e83"
  }, {
    "url": "assets/index-BY-xXuTG.css",
    "revision": null
  }, {
    "url": "assets/index-BGL9jvzx.js",
    "revision": null
  }, {
    "url": "icon-192.png",
    "revision": "1288048c176b8d691573ed448d265e83"
  }, {
    "url": "icon-512.png",
    "revision": "c3da86fef21546be1a75c79abcc0ae72"
  }, {
    "url": "logo.svg",
    "revision": "8799b4684225d5eea22624180e4b707d"
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
    "revision": "b3d3d50037fd45cceedc47bfa5794a52"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
