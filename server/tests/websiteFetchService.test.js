
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validateTarget,
    isPublicAddress
} = require("../services/websiteFetchService");

test("Accept a valid HTTPS website URL", () => {
    const result = validateTarget("https://example.com/products");

    assert.equal(result.url.protocol, "https:");
    assert.equal(result.hostname, "example.com");
});

test("Accept a valid HTTP website URL", () => {
    const result = validateTarget("http://example.com");

    assert.equal(result.url.protocol, "http:");
});

test("Reject invalid URL", () => {
    assert.throws(() => validateTarget("not-a-url"));
});

test("Reject non-HTTP protocols", () => {
    assert.throws(() => validateTarget("file:///etc/passwd"));
});

test("Reject localhost", () => {
    assert.throws(() => validateTarget("http://localhost"));
});

test("Reject local hostnames", () => {
    assert.throws(() => validateTarget("http://printer.local"));
});

test("Reject URLs containing credentials", () => {
    assert.throws(() =>
        validateTarget("https://user:password@example.com")
    );
});

test("Reject non-standard ports", () => {
    assert.throws(() =>
        validateTarget("http://example.com:8080")
    );
});

test("Accept publicly routable IPv4 address", () => {
    assert.equal(isPublicAddress("8.8.8.8"), true);
});

test("Reject loopback IPv4 address", () => {
    assert.equal(isPublicAddress("127.0.0.1"), false);
});

test("Reject private IPv4 address", () => {
    assert.equal(isPublicAddress("192.168.1.1"), false);
});

test("Reject link-local IPv4 address", () => {
    assert.equal(isPublicAddress("169.254.1.1"), false);
});

test("Reject loopback IPv6 address", () => {
    assert.equal(isPublicAddress("::1"), false);
});
