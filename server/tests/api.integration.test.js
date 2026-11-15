const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const Report = require("../models/Report");
const websiteFetchService = require("../services/websiteFetchService");

process.env.ADMIN_SECRET = "test-admin-secret";
process.env.CORS_ORIGINS = "http://localhost:5173";

let duplicateReport = false;
let analysisResult = {
    success: true,
    riskScore: 15,
    riskLevel: "Low Risk",
    confidence: 100,
    factors: {}
};
let fetchResult = {
    success: true,
    finalUrl: "https://shop.example/",
    html: "<html><body>Shop</body></html>"
};

const originalReadyState = mongoose.connection.readyState;
const originalFindOne = Report.findOne;
const originalCreate = Report.create;
const originalFind = Report.find;
const originalFindOneAndUpdate = Report.findOneAndUpdate;
const originalFetchWebsiteHTML = websiteFetchService.fetchWebsiteHTML;
const analysisPath = require.resolve("../services/websiteAnalysisService");
const originalAnalysisExport = require(analysisPath);

mongoose.connection.readyState = 1;

Report.findOne = async () => duplicateReport
    ? { _id: "existing-report" }
    : null;
Report.create = async report => ({
    _id: "new-report",
    ...report,
    createdAt: new Date("2026-01-01T00:00:00.000Z")
});
Report.find = () => ({
    sort() { return this; },
    limit() { return this; },
    lean: async () => []
});
Report.findOneAndUpdate = async (filter, update) => ({
    _id: filter._id,
    ...update.$set
});
websiteFetchService.fetchWebsiteHTML = async () => fetchResult;
require.cache[analysisPath].exports = async () => analysisResult;

const app = require("../app");
let server;
let serverPort;

function request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
        const body = options.body;
        const headers = { ...options.headers };

        if (body !== undefined && !headers["content-type"]) {
            headers["content-type"] = "application/json";
        }

        const requestBody = body === undefined
            ? undefined
            : typeof body === "string"
                ? body
                : JSON.stringify(body);

        if (requestBody !== undefined) {
            headers["content-length"] = Buffer.byteLength(requestBody);
        }

        const req = http.request({
            hostname: "127.0.0.1",
            port: serverPort,
            method,
            path,
            headers
        }, res => {
            let responseBody = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { responseBody += chunk; });
            res.on("end", () => {
                let json;
                try {
                    json = JSON.parse(responseBody);
                } catch {
                    json = null;
                }

                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json,
                    rawBody: responseBody
                });
            });
        });

        req.on("error", reject);
        if (requestBody !== undefined) req.write(requestBody);
        req.end();
    });
}

test.before(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    serverPort = server.address().port;
});

test.after(async () => {
    await new Promise(resolve => server.close(resolve));

    mongoose.connection.readyState = originalReadyState;
    Report.findOne = originalFindOne;
    Report.create = originalCreate;
    Report.find = originalFind;
    Report.findOneAndUpdate = originalFindOneAndUpdate;
    websiteFetchService.fetchWebsiteHTML = originalFetchWebsiteHTML;
    require.cache[analysisPath].exports = originalAnalysisExport;
});

test("GET /api/health returns JSON and security headers", async () => {
    const response = await request("GET", "/api/health", {
        headers: { origin: "http://localhost:5173" }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(
        response.headers["access-control-allow-origin"],
        "http://localhost:5173"
    );
});

test("CORS does not grant an unconfigured origin", async () => {
    const response = await request("GET", "/api/health", {
        headers: { origin: "https://untrusted.example" }
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
});

test("POST /api/scan validates input and returns fetch and analysis outcomes", async () => {
    const invalid = await request("POST", "/api/scan", { body: {} });
    assert.equal(invalid.status, 400);

    fetchResult = {
        success: false,
        message: "Website returned HTTP 503."
    };
    const fetchFailure = await request("POST", "/api/scan", {
        body: { url: "https://shop.example" }
    });
    assert.equal(fetchFailure.status, 422);
    assert.equal(fetchFailure.body.success, false);

    fetchResult = {
        success: true,
        finalUrl: "https://shop.example/",
        html: "<html><body>Shop</body></html>"
    };
    const success = await request("POST", "/api/scan", {
        body: { url: "https://shop.example" }
    });
    assert.equal(success.status, 200);
    assert.equal(success.body.scan.riskScore, 15);
    assert.equal(success.body.scan.confidence, 100);

    analysisResult = {
        success: false,
        riskScore: null,
        riskLevel: "Unknown",
        confidence: 0
    };
    const analysisFailure = await request("POST", "/api/scan", {
        body: { url: "https://shop.example" }
    });
    assert.equal(analysisFailure.status, 503);
    assert.equal(analysisFailure.body.success, false);
    analysisResult = {
        success: true,
        riskScore: 15,
        riskLevel: "Low Risk",
        confidence: 100,
        factors: {}
    };
});

test("Report submission validates data, prevents duplicates, and handles database failure", async () => {
    const invalid = await request("POST", "/api/reports", {
        body: { url: "javascript:alert(1)", reason: "Phishing" }
    });
    assert.equal(invalid.status, 400);

    const credentialUrl = await request("POST", "/api/reports", {
        body: {
            url: "https://user:pass@shop.example",
            reason: "Phishing"
        }
    });
    assert.equal(credentialUrl.status, 400);

    const submitted = await request("POST", "/api/reports", {
        body: {
            url: "https://www.shop.example/product",
            reason: "Phishing",
            description: "Fake checkout page"
        }
    });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.report.status, "pending");

    duplicateReport = true;
    const duplicate = await request("POST", "/api/reports", {
        body: {
            url: "https://shop.example/product",
            reason: "Phishing",
            description: "Fake checkout page"
        }
    });
    assert.equal(duplicate.status, 409);
    duplicateReport = false;

    mongoose.connection.readyState = 0;
    const unavailable = await request("POST", "/api/reports", {
        body: {
            url: "https://shop.example",
            reason: "Other"
        }
    });
    assert.equal(unavailable.status, 503);
    mongoose.connection.readyState = 1;
});

test("Admin report routes enforce authentication, validation and review states", async () => {
    const unauthorized = await request("GET", "/api/admin/reports");
    assert.equal(unauthorized.status, 401);

    const pending = await request("GET", "/api/admin/reports", {
        headers: { "x-admin-key": "test-admin-secret" }
    });
    assert.equal(pending.status, 200);
    assert.equal(pending.body.success, true);

    const invalidStatus = await request(
        "GET",
        "/api/admin/reports?status=unknown",
        { headers: { "x-admin-key": "test-admin-secret" } }
    );
    assert.equal(invalidStatus.status, 400);

    const approved = await request(
        "PATCH",
        "/api/admin/reports/64b000000000000000000001",
        {
            headers: { "x-admin-key": "test-admin-secret" },
            body: { status: "approved", reviewNote: "Verified" }
        }
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.report.status, "approved");

    const rejected = await request(
        "PATCH",
        "/api/admin/reports/64b000000000000000000002",
        {
            headers: { "x-admin-key": "test-admin-secret" },
            body: { status: "rejected", reviewNote: "Insufficient evidence" }
        }
    );
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.report.status, "rejected");

    const invalidId = await request(
        "PATCH",
        "/api/admin/reports/not-an-id",
        {
            headers: { "x-admin-key": "test-admin-secret" },
            body: { status: "approved" }
        }
    );
    assert.equal(invalidId.status, 400);
});

test("Malformed and oversized requests receive JSON errors", async () => {
    const malformed = await request("POST", "/api/scan", {
        body: "{invalid-json",
        headers: { "content-type": "application/json" }
    });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.success, false);

    const oversized = await request("POST", "/api/scan", {
        body: JSON.stringify({ value: "x".repeat(11 * 1024) }),
        headers: { "content-type": "application/json" }
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.success, false);
});

test("Unknown routes return a JSON 404", async () => {
    const response = await request("GET", "/api/not-found");

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
});

test("Scan and report endpoints enforce request rate limits", async () => {
    const scanResponses = [];
    for (let index = 0; index < 25; index += 1) {
        scanResponses.push(await request("POST", "/api/scan", { body: {} }));
    }
    assert.ok(scanResponses.some(response => response.status === 429));

    const reportResponses = [];
    for (let index = 0; index < 10; index += 1) {
        reportResponses.push(await request("POST", "/api/reports", {
            body: { url: "https://shop.example", reason: "Other" }
        }));
    }
    assert.ok(reportResponses.some(response => response.status === 429));
});
