const test = require("node:test");
const assert = require("node:assert/strict");

const websiteFetchService = require("../services/websiteFetchService");
const originalFetchWebsiteHTML = websiteFetchService.fetchWebsiteHTML;

let mockFetchWebsiteHTML = async () => ({
    success: false,
    message: "Unexpected fetch"
});

websiteFetchService.fetchWebsiteHTML = (...args) =>
    mockFetchWebsiteHTML(...args);

const {
    discoverDomainPages,
    extractRelevantLinks
} = require("../services/domainPageDiscovery");

test.after(() => {
    websiteFetchService.fetchWebsiteHTML = originalFetchWebsiteHTML;
});

test("Prioritizes contact and policy links and excludes account/checkout pages", () => {
    const html = `
        <a href="/about-us">About Us</a>
        <a href="/company-info">About our company</a>
        <a href="/company-info">Contact details</a>
        <a href="https://other.example/contact">External contact</a>
        <a href="/account/login">Contact support</a>
        <a href="/checkout">Privacy policy</a>
        <a href="/cart">Refund policy</a>
        <a href="/contact-us">Contact Us</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/refund-policy">Refund Policy</a>
        <a href="/signup">Company information</a>
        <a href="/returns">Returns</a>
    `;

    const links = extractRelevantLinks(
        html,
        "https://shop.example/product",
        "shop.example"
    );

    assert.deepEqual(
        links.map(link => new URL(link.url).pathname),
        [
            "/company-info",
            "/contact-us",
            "/privacy-policy",
            "/refund-policy",
            "/returns",
            "/about-us"
        ]
    );
    assert.ok(
        links.find(link => link.url.endsWith("/company-info"))
            .keywords.includes("contact")
    );
});

test("Records page fetch failures and continues analyzing prioritized pages", async () => {
    const requestedUrls = [];

    mockFetchWebsiteHTML = async url => {
        requestedUrls.push(url);

        if (url === "https://shop.example/") {
            return {
                success: false,
                message: "Homepage unavailable"
            };
        }

        if (url === "https://shop.example/contact-us") {
            return {
                success: false,
                message: "Contact page unavailable"
            };
        }

        return {
            success: true,
            finalUrl: url,
            html: "<html><body>Available</body></html>"
        };
    };

    const result = await discoverDomainPages(
        "https://shop.example/product",
        `
            <a href="/about-us">About Us</a>
            <a href="/contact-us">Contact Us</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/refund-policy">Refund Policy</a>
            <a href="/login">Log in</a>
            <a href="/cart">Cart</a>
            <a href="/checkout">Checkout</a>
        `
    );

    assert.equal(result.success, true);
    assert.deepEqual(
        requestedUrls,
        [
            "https://shop.example/",
            "https://shop.example/contact-us",
            "https://shop.example/privacy-policy",
            "https://shop.example/refund-policy",
            "https://shop.example/about-us"
        ]
    );
    assert.deepEqual(
        result.failedPages.map(page => page.reason),
        ["Homepage unavailable", "Contact page unavailable"]
    );
    assert.deepEqual(
        result.pages.map(page => new URL(page.url).pathname),
        ["/product", "/privacy-policy", "/refund-policy", "/about-us"]
    );
    assert.equal(result.pagesAnalyzed, 4);
});

test("Continues after a thrown or malformed page fetch result", async () => {
    mockFetchWebsiteHTML = async url => {
        if (url === "https://shop.example/") {
            return {
                success: true,
                finalUrl: "not a URL",
                html: "<html></html>"
            };
        }

        if (url === "https://shop.example/contact-us") {
            throw new Error("Temporary request failure");
        }

        return {
            success: true,
            finalUrl: url,
            html: "<html><body>Available</body></html>"
        };
    };

    const result = await discoverDomainPages(
        "https://shop.example/product",
        `
            <a href="/contact-us">Contact Us</a>
            <a href="/privacy-policy">Privacy Policy</a>
        `
    );

    assert.equal(result.success, true);
    assert.deepEqual(
        result.failedPages.map(page => page.reason),
        [
            "Page fetch returned an invalid final URL.",
            "Temporary request failure"
        ]
    );
    assert.deepEqual(
        result.pages.map(page => new URL(page.url).pathname),
        ["/product", "/privacy-policy"]
    );
});

test("Passes same-host policy and records cross-host page redirects", async () => {
    let fetchOptions;
    mockFetchWebsiteHTML = async (url, options) => {
        fetchOptions = options;
        return {
            success: true,
            finalUrl: "https://other.example/contact-us",
            html: "<html></html>"
        };
    };

    const result = await discoverDomainPages(
        "https://shop.example/",
        '<a href="/contact-us">Contact Us</a>'
    );

    assert.deepEqual(fetchOptions, { allowedHostname: "shop.example" });
    assert.equal(result.pages.length, 1);
    assert.equal(
        result.failedPages[0].reason,
        "Page redirected to another hostname."
    );
});
