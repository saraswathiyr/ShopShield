const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const dns = require("node:dns").promises;

const {
    fetchWebsiteHTML,
    validateTarget,
    isPublicAddress
} = require("../services/websiteFetchService");

const originalGet = axios.get;
const originalLookup = dns.lookup;

test.after(() => {
    axios.get = originalGet;
    dns.lookup = originalLookup;
});

test("Rejects reserved, private, loopback and credential URL targets", () => {
    for (const address of [
        "10.0.0.1",
        "172.16.0.1",
        "192.168.1.1",
        "127.0.0.1",
        "169.254.1.1",
        "::1",
        "fc00::1"
    ]) {
        assert.equal(isPublicAddress(address), false, address);
    }

    assert.throws(() =>
        validateTarget("https://user:password@example.com")
    );
});

test("Rejects DNS answers containing any non-public address", async () => {
    let requestCount = 0;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "192.168.1.20", family: 4 }
    ];
    axios.get = async () => {
        requestCount += 1;
        throw new Error("Should not send request");
    };

    const result = await fetchWebsiteHTML("https://shop.example");

    assert.equal(result.success, false);
    assert.match(result.message, /private or non-public/i);
    assert.equal(requestCount, 0);
});

test("Validates redirect destinations before making another request", async () => {
    let requestCount = 0;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 }
    ];
    axios.get = async () => {
        requestCount += 1;
        return {
            status: 302,
            headers: { location: "http://127.0.0.1/admin" }
        };
    };

    const result = await fetchWebsiteHTML("https://shop.example");

    assert.equal(result.success, false);
    assert.match(result.message, /private or non-public|local and internal/i);
    assert.equal(requestCount, 1);
});

test("Stops after the configured redirect limit", async () => {
    let requestCount = 0;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 }
    ];
    axios.get = async () => {
        requestCount += 1;
        return {
            status: 302,
            headers: { location: "/next" }
        };
    };

    const result = await fetchWebsiteHTML("https://shop.example");

    assert.equal(result.success, false);
    assert.match(result.message, /too many website redirects/i);
    assert.equal(requestCount, 6);
});

test("Enforces same-host redirects during page discovery requests", async () => {
    let requestCount = 0;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 }
    ];
    axios.get = async () => {
        requestCount += 1;
        return {
            status: 302,
            headers: { location: "https://other.example/" }
        };
    };

    const result = await fetchWebsiteHTML(
        "https://shop.example/contact",
        { allowedHostname: "shop.example" }
    );

    assert.equal(result.success, false);
    assert.match(result.message, /outside the allowed hostname/i);
    assert.equal(requestCount, 1);
});

test("Uses bounded request timeout and HTML response size", async () => {
    let requestOptions;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 }
    ];
    axios.get = async (url, options) => {
        requestOptions = options;
        return {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
            data: "<html></html>"
        };
    };

    const result = await fetchWebsiteHTML("https://shop.example");

    assert.equal(result.success, true);
    assert.equal(requestOptions.timeout, 10000);
    assert.equal(requestOptions.maxContentLength, 2 * 1024 * 1024);
    assert.equal(requestOptions.maxBodyLength, 2 * 1024 * 1024);
});

test("Pins the connection lookup to the validated DNS address", async () => {
    let requestOptions;
    dns.lookup = async () => [
        { address: "8.8.8.8", family: 4 }
    ];
    axios.get = async (url, options) => {
        requestOptions = options;
        const pinnedLookup = options.httpsAgent.options.lookup;

        await new Promise((resolve, reject) => {
            pinnedLookup("shop.example", { all: true }, (error, addresses) => {
                if (error) return reject(error);
                assert.deepEqual(addresses, [
                    { address: "8.8.8.8", family: 4 }
                ]);
                resolve();
            });
        });

        return {
            status: 200,
            headers: { "content-type": "text/html" },
            data: "<html></html>"
        };
    };

    const result = await fetchWebsiteHTML("https://shop.example");

    assert.equal(result.success, true);
    assert.ok(requestOptions.httpsAgent);
});
