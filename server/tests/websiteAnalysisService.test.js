const test = require("node:test");
const assert = require("node:assert/strict");

const moduleMocks = [
    [
        "../services/urlCheck",
        async () => ({ points: 10, reasons: [], failed: false })
    ],
    [
        "../services/domainAgeCheck",
        async () => ({ points: 5, reasons: [], failed: false })
    ],
    [
        "../services/reputationCheck",
        async () => ({ points: 20, reasons: [], failed: false })
    ],
    [
        "../services/priceCheck",
        () => ({ points: 5, reasons: [], failed: false })
    ],
    [
        "../services/contentCheck",
        () => ({ points: 10, reasons: [], failed: false, evidence: {} })
    ]
];

const originals = moduleMocks.map(([modulePath]) => {
    const resolved = require.resolve(modulePath);
    return {
        resolved,
        exports: require(resolved)
    };
});

moduleMocks.forEach(([modulePath, mockExport]) => {
    const resolved = require.resolve(modulePath);
    require.cache[resolved].exports = mockExport;
});

const communityPath = require.resolve(
    "../services/communityReportService"
);
const originalCommunityService = require(communityPath);
require.cache[communityPath].exports = {
    ...originalCommunityService,
    checkCommunityReports: async () => ({
        points: 5,
        reasons: [],
        failed: false
    })
};

const discoveryPath = require.resolve(
    "../services/domainPageDiscovery"
);
const originalDiscovery = require(discoveryPath);
require.cache[discoveryPath].exports = {
    ...originalDiscovery,
    discoverDomainPages: async (url, html) => ({
        success: true,
        pages: [{ url, html, source: "scanned-page" }],
        failedPages: [],
        pagesAnalyzed: 1,
        maximumPages: 6
    })
};

const analysisPath = require.resolve(
    "../services/websiteAnalysisService"
);
const analyzeWebsite = require(analysisPath);

test.after(() => {
    originals.forEach(({ resolved, exports }) => {
        require.cache[resolved].exports = exports;
    });
    require.cache[communityPath].exports = originalCommunityService;
    require.cache[discoveryPath].exports = originalDiscovery;
    delete require.cache[analysisPath];
});

test("Runs all six detection factors and returns a complete scored analysis", async () => {
    const result = await analyzeWebsite(
        "https://shop.example/product",
        "<html><body>Product</body></html>"
    );

    assert.equal(result.success, true);
    assert.equal(result.completedFactors, 6);
    assert.equal(result.totalFactors, 6);
    assert.equal(result.analysisStatus, "complete");
    assert.equal(result.confidence, 100);
    assert.ok(result.riskScore >= 0 && result.riskScore <= 100);
    assert.deepEqual(
        Object.values(result.factors).map(factor => factor.status),
        ["completed", "completed", "completed", "completed", "completed", "completed"]
    );
    assert.equal(
        result.factors.contentAnalysis.evidence.domainPageDiscovery.pagesAnalyzed,
        1
    );
});
