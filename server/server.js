
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(
            `ShopShield server running at http://localhost:${PORT}`
        );
    });
};

startServer().catch(error => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
});
