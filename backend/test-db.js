app.get('/test-db', async (req, res) => {
    try {
        res.json({
            DB_HOST: process.env.DB_HOST,
            DB_USER: process.env.DB_USER,
            DB_NAME: process.env.DB_NAME,
            DB_PORT: process.env.DB_PORT
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});