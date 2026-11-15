const test = require("node:test");
const assert = require("node:assert/strict");

const urlCheck = require("../services/urlCheck");

test("Accepts a secure established shopping domain without risk signals", async () => {
    const result = await urlCheck("https://amazon.com");

    assert.equal(result.failed, false);
    assert.equal(result.points, 0);
    assert.equal(result.evidence.protocol, "https:");
    assert.deepEqual(result.evidence.brandMatches, []);
});

test("Detects brand impersonation and suspicious TLD indicators", async () => {
    const result = await urlCheck("http://amaz0n-offers.xyz");

    assert.equal(result.evidence.isIP, false);
    assert.equal(result.evidence.tld, "xyz");
    assert.ok(result.evidence.brandMatches.some(
        match => match.brand === "amazon"
    ));
    assert.ok(result.reasons.includes("Website does not use HTTPS"));
    assert.ok(result.reasons.some(reason => reason.includes("suspicious .xyz")));
    assert.equal(result.points, 48);
});

test("Scores IP-address shopping URLs and HTTP separately", async () => {
    const result = await urlCheck("http://192.0.2.1/store");

    assert.equal(result.evidence.isIP, true);
    assert.equal(result.evidence.protocol, "http:");
    assert.ok(result.reasons.includes("Website does not use HTTPS"));
    assert.ok(result.reasons.some(reason => reason.includes("IP address")));
    assert.equal(result.points, 40);
});

test("Treats unrelated suspicious-TLD domains as an indicator, not proof", async () => {
    const result = await urlCheck("https://unrelated-store.click");

    assert.equal(result.points, 8);
    assert.equal(result.evidence.brandMatches.length, 0);
});
