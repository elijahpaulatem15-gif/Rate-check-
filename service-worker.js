
const CACHE_NAME = "rate-check-v5";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./privacy.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./file_000000000b20820bb7603403fb4c04a1.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME)
                .then((cache) => cache.addAll(FILES_TO_CACHE)),
            self.skipWaiting()
        ])
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) =>
                        name.startsWith("rate-check-") &&
                        name !== CACHE_NAME
                    )
                    .map((name) => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        (async () => {
            try {
                const response = await fetch(request);

                if (response && response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, response.clone());
                }

                return response;

            } catch (error) {
                const cache = await caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                if (request.mode === "navigate") {
                    const offlinePage = await cache.match("./index.html");

                    if (offlinePage) {
                        return offlinePage;
                    }
                }

                return new Response(
                    "You are offline. Please check your internet connection.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8"
                        }
                    }
                );
            }
        })()
    );
});
