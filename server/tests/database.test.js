const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const connectDB = require("../config/database");

const originalConnect = mongoose.connect;
const originalMongoUri = process.env.MONGO_URI;

test.after(() => {
    mongoose.connect = originalConnect;

    if (originalMongoUri === undefined) {
        delete process.env.MONGO_URI;
    } else {
        process.env.MONGO_URI = originalMongoUri;
    }
});

test("Fails explicitly when MONGO_URI is missing", async () => {
    delete process.env.MONGO_URI;
    mongoose.connect = async () => {
        throw new Error("Should not connect without a URI");
    };

    await assert.rejects(connectDB, /MONGO_URI is not configured/);
});

test("Propagates MongoDB connection failures to server startup", async () => {
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/shopshield-test";
    mongoose.connect = async () => {
        throw new Error("Connection refused");
    };

    await assert.rejects(connectDB, /Connection refused/);
});
