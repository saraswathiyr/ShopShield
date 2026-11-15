
const axios = require("axios");
const dns = require("node:dns").promises;
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");
const ipaddr = require("ipaddr.js");

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT = 10000;
const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2 MB

// Check whether an IP address is publicly routable.
function isPublicAddress(address) {
    try {
        const parsed = ipaddr.process(address);

        return parsed.range() === "unicast";
    } catch {
        return false;
    }
}

// Validate URL format and reject unsafe destinations.
function validateTarget(input) {
    let url;

    try {
        url = new URL(input);
    } catch {
        throw new Error("Invalid website URL.");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are allowed.");
    }

    if (url.username || url.password) {
        throw new Error("URLs containing credentials are not allowed.");
    }

    if (url.port) {
        const allowedPort =
            (url.protocol === "http:" && url.port === "80") ||
            (url.protocol === "https:" && url.port === "443");

        if (!allowedPort) {
            throw new Error("This website port is not allowed.");
        }
    }

    const hostname = url.hostname
        .toLowerCase()
        .replace(/^\[|\]$/g, "")
        .replace(/\.$/, "");

    if (
        !hostname ||
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
    ) {
        throw new Error("Local and internal hostnames are not allowed.");
    }

    url.hash = "";

    return {
        url,
        hostname
    };
}

// Resolve DNS and reject private or reserved addresses.
async function resolvePublicAddress(hostname) {
    let addresses;

    if (net.isIP(hostname)) {
        addresses = [{ address: hostname }];
    } else {
        try {
            addresses = await dns.lookup(hostname, {
                all: true,
                verbatim: true
            });
        } catch {
            throw new Error("Unable to resolve website hostname.");
        }
    }

    if (!addresses.length) {
        throw new Error("Website hostname has no IP addresses.");
    }

    // Reject the hostname if ANY resolved address is non-public.
    for (const item of addresses) {
        if (!isPublicAddress(item.address)) {
            throw new Error(
                "Website resolves to a private or non-public IP address."
            );
        }
    }

    // Pin the connection to an already validated IP address.
    return addresses[0].address;
}

// Fetch HTML while pinning the connection to the validated IP.
async function fetchOnce(url, hostname, address) {
    const family = net.isIP(address);

    const pinnedLookup = (requestedHostname, options, callback) => {
        if (typeof options === "function") {
            callback = options;
        }

        if (options && options.all) {
            return callback(null, [{
                address,
                family
            }]);
        }

        return callback(null, address, family);
    };

    const httpAgent = new http.Agent({
        lookup: pinnedLookup
    });

    const httpsAgent = new https.Agent({
        lookup: pinnedLookup
    });

    try {
        const response = await axios.get(url, {
            httpAgent,
            httpsAgent,
            proxy: false,
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 0,
            maxContentLength: MAX_HTML_SIZE,
            maxBodyLength: MAX_HTML_SIZE,
            responseType: "text",
            transformResponse: [data => data],
            validateStatus: () => true,
            headers: {
                "User-Agent": "ShopShield-WebsiteScanner/1.0",
                "Accept": "text/html"
            }
        });

        return response;
    } finally {
        httpAgent.destroy();
        httpsAgent.destroy();
    }
}

// Main safe website fetching function.
async function fetchWebsiteHTML(inputUrl, options = {}) {
    try {
        let currentUrl = inputUrl;

        for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
            // Validate EVERY destination, including redirects.
            const target = validateTarget(currentUrl);

            if (
                options.allowedHostname &&
                target.hostname.toLowerCase() !==
                    options.allowedHostname.toLowerCase()
            ) {
                throw new Error(
                    "Website redirected outside the allowed hostname."
                );
            }

            const address = await resolvePublicAddress(
                target.hostname
            );

            const response = await fetchOnce(
                target.url.toString(),
                target.hostname,
                address
            );

            // Handle redirects manually.
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                const location = response.headers.location;

                if (!location) {
                    throw new Error("Redirect response has no destination.");
                }

                if (redirectCount === MAX_REDIRECTS) {
                    throw new Error("Too many website redirects.");
                }

                currentUrl = new URL(
                    location,
                    target.url
                ).toString();

                continue;
            }

            if (response.status < 200 || response.status >= 300) {
                throw new Error(
                    `Website returned HTTP ${response.status}.`
                );
            }

            const contentType = response.headers["content-type"] || "";

            if (!contentType.toLowerCase().includes("text/html")) {
                throw new Error("The requested website did not return HTML.");
            }

            if (typeof response.data !== "string") {
                throw new Error("Unable to read website HTML.");
            }

            return {
                success: true,
                finalUrl: target.url.toString(),
                html: response.data,
                statusCode: response.status,
                contentType,
                contentLength: Buffer.byteLength(
                    response.data,
                    "utf8"
                )
            };
        }

        throw new Error("Website redirect limit exceeded.");

    } catch (error) {
        console.error("Website fetch error:", error.message);

        return {
            success: false,
            message: error.message
        };
    }
}

module.exports = {
    fetchWebsiteHTML,
    validateTarget,
    isPublicAddress
};
