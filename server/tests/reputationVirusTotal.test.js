const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");

const reputationCheck = require("../services/reputationCheck");

const originalGet = axios.get;
const originalPost = axios.post;
const originalGoogleApiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const originalVirusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;

const GOOGLE_API_URL =
    "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/urls";

test.beforeEach(() => {
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = "test-google-key";
    process.env.VIRUSTOTAL_API_KEY = "test-virustotal-key";

    axios.get = async () => {
        throw new Error("VirusTotal mock was not configured");
    };

    axios.post = async url => {
        if (url.startsWith(GOOGLE_API_URL)) {
            return { data: {} };
        }

        throw new Error("Unexpected POST request");
    };
});

test.after(() => {
    axios.get = originalGet;
    axios.post = originalPost;

    if (originalGoogleApiKey === undefined) {
        delete process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    } else {
        process.env.GOOGLE_SAFE_BROWSING_API_KEY = originalGoogleApiKey;
    }

    if (originalVirusTotalApiKey === undefined) {
        delete process.env.VIRUSTOTAL_API_KEY;
    } else {
        process.env.VIRUSTOTAL_API_KEY = originalVirusTotalApiKey;
    }
});

test("Uses completed VirusTotal URL report statistics", async () => {
    axios.get = async url => {
        assert.equal(
            url,
            `${VIRUSTOTAL_URL}/${Buffer.from(
                "https://example.com/shop"
            ).toString("base64url")}`
        );

        return {
            data: {
                data: {
                    attributes: {
                        last_analysis_stats: {
                            malicious: 2,
                            suspicious: 1,
                            harmless: 45,
                            undetected: 10
                        }
                    }
                }
            }
        };
    };

    const result = await reputationCheck("https://example.com/shop");
    const source = result.evidence.sources.find(
        item => item.source === "VirusTotal"
    );

    assert.equal(source.status, "report-found");
    assert.equal(source.malicious, 2);
    assert.equal(source.suspicious, 1);
    assert.equal(result.points, 40);
});

test("Submits an unknown URL and reports its queued analysis as pending", async () => {
    let submittedBody;
    axios.get = async () => {
        const error = new Error("Not found");
        error.response = { status: 404 };
        throw error;
    };
    axios.post = async (url, body) => {
        if (url.startsWith(GOOGLE_API_URL)) {
            return { data: {} };
        }

        assert.equal(url, VIRUSTOTAL_URL);
        submittedBody = body;

        return {
            data: {
                data: {
                    id: "analysis-123",
                    attributes: { status: "queued" }
                }
            }
        };
    };

    const result = await reputationCheck("https://example.com/new-product");
    const source = result.evidence.sources.find(
        item => item.source === "VirusTotal"
    );

    assert.equal(submittedBody.get("url"), "https://example.com/new-product");
    assert.equal(source.status, "pending-analysis");
    assert.equal(source.analysisId, "analysis-123");
    assert.equal(result.evidence.pendingSourceCount, 1);
    assert.equal(result.failed, false);
});

test("Does not count a pending VirusTotal analysis as a clean result", async () => {
    axios.get = async () => {
        const error = new Error("Not found");
        error.response = { status: 404 };
        throw error;
    };
    axios.post = async url => {
        if (url.startsWith(GOOGLE_API_URL)) {
            throw new Error("Google unavailable");
        }

        return {
            data: {
                data: {
                    id: "analysis-456",
                    attributes: { status: "queued" }
                }
            }
        };
    };

    const result = await reputationCheck("https://example.com/new-product");

    assert.equal(result.failed, true);
    assert.equal(result.evidence.status, "analysis-pending");
    assert.equal(result.evidence.successfulSourceCount, 0);
    assert.equal(result.evidence.pendingSourceCount, 1);
    assert.deepEqual(result.reasons, []);
});

test("Reports non-404 VirusTotal API errors as unavailable", async () => {
    axios.get = async () => {
        const error = new Error("Request failed");
        error.response = {
            status: 401,
            data: { error: { message: "Invalid API key" } }
        };
        throw error;
    };

    const result = await reputationCheck("https://example.com/shop");
    const source = result.evidence.sources.find(
        item => item.source === "VirusTotal"
    );

    assert.equal(source.status, "unavailable");
    assert.equal(source.failed, true);
    assert.equal(source.message, "Invalid API key");
    assert.equal(result.points, 0);
});

test("Reports failed URL submission as unavailable, not clean", async () => {
    axios.get = async () => {
        const error = new Error("Not found");
        error.response = { status: 404 };
        throw error;
    };
    axios.post = async url => {
        if (url.startsWith(GOOGLE_API_URL)) {
            throw new Error("Google unavailable");
        }

        const error = new Error("Quota exceeded");
        error.response = {
            status: 429,
            data: { error: { message: "Quota exceeded" } }
        };
        throw error;
    };

    const result = await reputationCheck("https://example.com/shop");

    assert.equal(result.failed, true);
    assert.equal(result.evidence.status, "unavailable");
    assert.equal(result.evidence.sources[1].status, "unavailable");
    assert.equal(result.evidence.sources[1].message, "Quota exceeded");
});

test("Marks a URL report without analysis statistics as pending", async () => {
    axios.get = async () => ({
        data: {
            data: {
                attributes: {
                    last_analysis_date: null
                }
            }
        }
    });

    const result = await reputationCheck("https://example.com/shop");
    const source = result.evidence.sources.find(
        item => item.source === "VirusTotal"
    );

    assert.equal(source.status, "pending-analysis");
    assert.equal(source.analysisId, null);
});
