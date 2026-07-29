const CACHE_NAME = 'thinkfield-static-v1';

// 安装时直接激活
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 激活时接管页面
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 只缓存静态文件，API 和页面走网络
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 判断是否为静态资源
  const isStatic = 
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);

  if (isStatic) {
    // 静态资源：缓存优先，同时更新缓存
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // 后台更新缓存
          fetch(event.request).then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }).catch(() => {});
          return cachedResponse;
        }
        // 缓存没有，网络请求并缓存
        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        });
      })
    );
  } else {
    // 非静态资源：直接走网络，不缓存
    event.respondWith(fetch(event.request));
  }
});