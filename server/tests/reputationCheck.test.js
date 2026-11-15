
const test = require("node:test");
const assert = require("node:assert/strict");

const contentCheck = require("../services/contentCheck");

// TEST 1: Detect missing contact and policy information.
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

// TEST 2: Recognize contact information.
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

// TEST 3: Recognize privacy and refund policy links.
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

// TEST 4: Detect suspicious payment instructions.
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

// TEST 5: Detect multiple urgency phrases.
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

// TEST 6: Handle invalid HTML input.
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
            <body>
                <h1>Welcome</h1>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.equal(
        result.evidence.businessInformationFound,
        true
    );
});

// TEST 8: Detect Organization inside JSON-LD @graph.
test("Detects Organization inside JSON-LD @graph", () => {
    const html = `
        <html>
            <head>
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
            </head>
            <body>
                <h1>Example Store</h1>
            </body>
        </html>
    `;

    const result = contentCheck(html);

    assert.equal(result.failed, false);
    assert.equal(
        result.evidence.businessInformationFound,
        true
    );
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
    assert.equal(
        result.evidence.businessInformationFound,
        true
    );
});

