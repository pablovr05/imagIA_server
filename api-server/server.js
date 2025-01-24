// Importar los módulos necesarios
const http = require('http');  // Usamos http en lugar de https
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

// Importaciones principales
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
const { sequelize } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');
const chatRoutes = require('./src/routes/chatRoutes');
const { logger, expressLogger } = require('./src/config/logger');

// Crear instància d'Express
const app = express();

// Configuración CORS
const corsOptions = {
    origin: 'http://imagia2.ieti.site',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use((req, res, next) => {
    logger.info('Petició HTTPS rebuda', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

app.use(expressLogger);

app.use('/api', chatRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('Base de dades connectada', {
            host: process.env.MYSQL_HOST,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT
        });

        await sequelize.sync({
            force: true,
        });

        logger.info('Models sincronitzats', {
            force: true,
            timestamp: new Date().toISOString()
        });

        http.createServer(app).listen(PORT, () => {
            logger.info('Servidor iniciat correctament en HTTP', {
                port: PORT,
                mode: process.env.NODE_ENV,
                docs: `http://127.0.0.1:${PORT}/api-docs`
            });
        });
    } catch (error) {
        logger.error('Error fatal en iniciar el servidor', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    }
}

process.on('unhandledRejection', (error) => {
    logger.error('Error no controlat detectat', {
        error: error.message,
        stack: error.stack,
        type: 'UnhandledRejection',
        timestamp: new Date().toISOString()
    });
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('Senyal SIGTERM rebut. Tancant el servidor...');
    process.exit(0);
});

startServer();

module.exports = app;
