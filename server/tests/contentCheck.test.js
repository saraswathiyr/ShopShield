
const test = require("node:test");
const assert = require("node:assert/strict");

const contentCheck = require("../services/contentCheck");

test("Detects missing contact and policy information", () => {
    const html = `
        <html>
            <body>
                <h1>Welcome to Trendy Store</h1>
                <p>Shop our latest products.</p>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.ok(result.points >= 0);
    assert.equal(
        result.evidence.contactInformation.emailFound,
        false
    );
});

test("Recognizes contact information", () => {
    const html = `
        <html>
            <body>
                <p>Email: support@example.com</p>
                <p>Phone: +91 9876543210</p>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(
        result.evidence.contactInformation.emailFound,
        true
    );

    assert.equal(
        result.evidence.contactInformation.phoneFound,
        true
    );
});

test("Recognizes privacy and refund policy links", () => {
    const html = `
        <html>
            <body>
                <a href="/privacy-policy">Privacy Policy</a>
                <a href="/refund-policy">Refund Policy</a>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.evidence.privacyPolicyFound, true);
    assert.equal(result.evidence.refundPolicyFound, true);
});

test("Detects suspicious payment instructions", () => {
    const html = `
        <html>
            <body>
                <p>Pay only through bank transfer.</p>
                <p>Send money to personal account.</p>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.ok(result.points >= 15);

    assert.ok(
        result.evidence.suspiciousPaymentPhrases.length > 0
    );
});

test("Detects multiple urgency phrases", () => {
    const html = `
        <html>
            <body>
                <p>Limited time offer!</p>
                <p>Act now!</p>
                <p>Last chance!</p>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.ok(
        result.evidence.urgencyPhrasesFound.length >= 3
    );

    assert.ok(result.points >= 8);
});

test("Handles invalid HTML input", () => {
    const result = contentCheck("");

    assert.equal(result.failed, true);
    assert.equal(result.points, 0);
});

// TEST 7: Detect Organization JSON-LD structured data.
test("Detects Organization JSON-LD structured data", () => {
    const html = `
        <html>
            <head>
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "Example Shopping Store",
                    "url": "https://example.com"
                }
                </script>
            </head>
            <body><h1>Welcome</h1></body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.equal(result.evidence.businessInformationFound, true);
});

// TEST 8: Detect Organization inside JSON-LD @graph.
test("Detects Organization inside JSON-LD @graph", () => {
    const html = `
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebSite",
                    "name": "Example Store"
                },
                {
                    "@type": "Organization",
                    "name": "Example Retail Ltd"
                }
            ]
        }
        </script>
        <body><h1>Example Store</h1></body>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.equal(result.evidence.businessInformationFound, true);
});

// TEST 9: Detect business identity from About Us link.
test("Detects business identity from About Us link", () => {
    const html = `
        <html>
            <body>
                <h1>Welcome to our store</h1>
                <a href="/about-us">About Us</a>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.equal(result.evidence.businessInformationFound, true);
});
