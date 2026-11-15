
const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

const domainAgeCheck = require("../services/domainAgeCheck");

const originalGet = axios.get;

test.after(() => {
    axios.get = originalGet;
});

test("Scores every domain age threshold deterministically", () => {
    const cases = [
        [0, 25],
        [29, 25],
        [30, 18],
        [89, 18],
        [90, 12],
        [179, 12],
        [180, 6],
        [364, 6],
        [365, 0]
    ];

    for (const [ageInDays, expectedPoints] of cases) {
        assert.equal(
            domainAgeCheck.calculateAgeRisk(ageInDays),
            expectedPoints,
            `Expected ${ageInDays}-day-old domain to score ${expectedPoints}`
        );
    }
});

test("Calculates registration age in whole days", () => {
    const now = new Date();
    const registrationDate = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000 - 1000
    );

    assert.equal(
        domainAgeCheck.calculateDomainAge(registrationDate.toISOString()),
        30
    );
});

test("Rejects invalid and future registration dates", () => {
    assert.throws(
        () => domainAgeCheck.calculateDomainAge("not-a-date"),
        /Invalid domain registration date/
    );
    assert.throws(
        () => domainAgeCheck.calculateDomainAge(
            new Date(Date.now() + 60_000).toISOString()
        ),
        /future/
    );
});

test("Reports RDAP service failures as unavailable", async () => {
    axios.get = async () => {
        const error = new Error("RDAP unavailable");
        error.response = { status: 503 };
        throw error;
    };

    const result = await domainAgeCheck("https://example.com");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
    assert.equal(result.evidence.status, "unavailable");
    assert.equal(result.evidence.message, "RDAP unavailable");
});

test("Reports missing RDAP registration data as unavailable", async () => {
    axios.get = async () => ({ data: { events: [] } });

    const result = await domainAgeCheck("https://example.com");

    assert.equal(result.failed, true);
    assert.equal(result.evidence.status, "unavailable");
    assert.match(result.evidence.message, /registration date is unavailable/i);
});

test("Handles IP addresses without registration lookup", async () => {
    const result = await domainAgeCheck("http://192.0.2.1");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
});

test("Handles invalid URLs", async () => {
    const result = await domainAgeCheck("invalid-url");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
});
