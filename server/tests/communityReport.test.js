
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculateCommunityPoints,
    normalizeDescription
} = require("../services/communityReportService");
const Report = require("../models/Report");
const {
    checkCommunityReports
} = require("../services/communityReportService");

const originalFind = Report.find;

test.after(() => {
    Report.find = originalFind;
});

test("Zero approved claims should return 0 points", () => {
    assert.equal(calculateCommunityPoints(0), 0);
});

test("One approved claim should return 5 points", () => {
    assert.equal(calculateCommunityPoints(1), 5);
});

test("Two to four approved claims should return 10 points", () => {
    assert.equal(calculateCommunityPoints(3), 10);
});

test("Five to nine approved claims should return 15 points", () => {
    assert.equal(calculateCommunityPoints(7), 15);
});

test("Ten or more approved claims should return maximum 20 points", () => {
    assert.equal(calculateCommunityPoints(12), 20);
});

test("Descriptions with different capitalization should normalize equally", () => {
    assert.equal(
        normalizeDescription("FAKE DISCOUNT OFFER!"),
        normalizeDescription("Fake Discount Offer")
    );
});

test("Descriptions with extra spaces and punctuation should normalize equally", () => {
    assert.equal(
        normalizeDescription("Never received my order!"),
        normalizeDescription("Never   received my order")
    );
});

test("Scores distinct approved claims within the report expiry window", async () => {
    const now = Date.now();
    const reports = [
        {
            reason: "Phishing",
            description: "Fake checkout page!",
            createdAt: new Date(now - 1000)
        },
        {
            reason: "Phishing",
            description: "FAKE checkout page",
            createdAt: new Date(now - 2000)
        },
        {
            reason: "Non-delivery",
            description: "Order never arrived",
            createdAt: new Date(now - 3000)
        }
    ];
    let query;

    Report.find = filter => {
        query = filter;

        return {
            select() { return this; },
            sort() { return this; },
            lean: async () => reports
        };
    };

    const result = await checkCommunityReports("shop.example");

    assert.equal(query.status, "approved");
    assert.equal(query.domain, "shop.example");
    assert.ok(
        query.createdAt.$gte.getTime() <= now - 89 * 24 * 60 * 60 * 1000
    );
    assert.equal(result.evidence.totalApprovedReports, 3);
    assert.equal(result.evidence.distinctApprovedClaims, 2);
    assert.equal(result.points, 10);
});

test("Excludes reports outside the 90-day scoring window", async () => {
    Report.find = () => ({
        select() { return this; },
        sort() { return this; },
        lean: async () => []
    });

    const result = await checkCommunityReports("shop.example");

    assert.equal(result.points, 0);
    assert.equal(result.failed, false);
    assert.equal(result.evidence.distinctApprovedClaims, 0);
    assert.equal(result.evidence.reportWindowDays, 90);
});

test("Marks database errors as unavailable instead of clean", async () => {
    Report.find = () => {
        throw new Error("Database unavailable");
    };

    const result = await checkCommunityReports("shop.example");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
    assert.match(result.evidence.error, /Database unavailable/);
});
