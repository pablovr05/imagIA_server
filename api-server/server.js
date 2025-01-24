const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
const { sequelize } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');
const chatRoutes = require('./src/routes/chatRoutes');
const { logger, expressLogger } = require('./src/config/logger');
const fs = require('fs');
const https = require('https');

// Crear instància d'Express
const app = express();

// Cargar las opciones de CORS
const corsOptions = {
    origin: 'https://imagia2.ieti.site',  // Permite solo solicitudes desde este dominio
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
};

app.use(cors(corsOptions));
app.use(express.json());

// Configuració de Swagger per la documentació de l'API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * Middleware de logging personalitzat
 * Registra totes les peticions HTTP amb timestamp
 */
app.use((req, res, next) => {
    logger.info('Petició HTTP rebuda', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Configuració del logger d'Express per més detalls
app.use(expressLogger);

// Registre de les rutes principals
app.use('/api/chat', chatRoutes);

// Gestió centralitzada d'errors
app.use(errorHandler);

// Port per defecte 3000 si no està definit a les variables d'entorn
const PORT = process.env.PORT || 3000;

/**
 * Funció d'inicialització del servidor
 * - Connecta amb la base de dades
 * - Sincronitza els models
 * - Inicia el servidor HTTPS
 */
async function startServer() {
    try {
        // Verificar connexió amb la base de dades
        await sequelize.authenticate();
        logger.info('Base de dades connectada', {
            host: process.env.MYSQL_HOST,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT
        });

        // Sincronitzar models amb la base de dades
        await sequelize.sync({
            force: true,   // Útil per development/testing, MAI per producció
        });

        logger.info('Models sincronitzats', {
            force: true,
            timestamp: new Date().toISOString()
        });

        // Cargar el certificado y la clave privada
        const options = {
            key: fs.readFileSync('private.key'),
            cert: fs.readFileSync('certificate.crt') // Ruta a tu certificado
        };

        // Iniciar servidor HTTPS
        https.createServer(options, app).listen(PORT, () => {
            logger.info('Servidor HTTPS iniciat correctament', {
                port: PORT,
                mode: process.env.NODE_ENV,
                docs: `https://127.0.0.1:${PORT}/api-docs`
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

/**
 * Gestió d'errors no controlats
 * Registra l'error i tanca l'aplicació de forma segura
 */
process.on('unhandledRejection', (error) => {
    logger.error('Error no controlat detectat', {
        error: error.message,
        stack: error.stack,
        type: 'UnhandledRejection',
        timestamp: new Date().toISOString()
    });
    process.exit(1);
});

// Gestió del senyal SIGTERM per tancament graciós
process.on('SIGTERM', () => {
    logger.info('Senyal SIGTERM rebut. Tancant el servidor...');
    process.exit(0);
});

// Iniciar el servidor
startServer();

// Exportar l'app per tests
module.exports = app;
