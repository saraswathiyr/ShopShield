
const { parse } = require("tldts");
const { isIP } = require("node:net");

function normalizeDomain(input) {
    if (typeof input !== "string" || !input.trim()) {
        throw new Error("Invalid website URL");
    }

    let url;

    try {
        url = new URL(input.trim());
    } catch {
        throw new Error("Invalid website URL");
    }

    if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported");
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");

    if (!hostname) {
        throw new Error("Invalid hostname");
    }

    const ipVersion = isIP(hostname);
    const parsed = parse(hostname);

    return {
        hostname,
        domain: ipVersion ? hostname : parsed.domain || hostname,
        subdomain: parsed.subdomain || "",
        publicSuffix: parsed.publicSuffix || "",
        isIP: ipVersion !== 0
    };
}

module.exports = normalizeDomain;

