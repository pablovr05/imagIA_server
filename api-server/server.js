// Importar los módulos necesarios
const https = require('https');
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
    origin: 'https://imagia2.ieti.site',  // Permite solo solicitudes desde este dominio
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
};

app.use(cors(corsOptions));
app.use(express.json());

// Configuración de Swagger para la documentación de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Middleware de logging personalizado
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

// Configuración del logger de Express para más detalles
app.use(expressLogger);

// Registro de las rutas principales
app.use('/api', chatRoutes);

// Gestión centralizada de errores
app.use(errorHandler);

// Configuración del puerto (3000 si no se define otro)
const PORT = process.env.PORT || 3000;

// Función de inicialización del servidor
async function startServer() {
    try {
        // Verificar la conexión con la base de datos
        await sequelize.authenticate();
        logger.info('Base de dades connectada', {
            host: process.env.MYSQL_HOST,
            database: process.env.MYSQL_DATABASE,
            port: process.env.MYSQL_PORT
        });

        // Sincronizar los modelos con la base de datos
        await sequelize.sync({
            force: true,   // Útil para desarrollo/testing, no usar en producción
        });

        logger.info('Models sincronitzats', {
            force: true,
            timestamp: new Date().toISOString()
        });

        // Iniciar el servidor HTTPS
        const options = {
            key: fs.readFileSync('/etc/ssl/private/clave_no_pass.key'),
            cert: fs.readFileSync('/etc/ssl/certs/certificado.crt'),
        };

        https.createServer(options, app).listen(PORT, () => {
            logger.info('Servidor iniciat correctament', {
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

// Manejo de errores no controlados
process.on('unhandledRejection', (error) => {
    logger.error('Error no controlat detectat', {
        error: error.message,
        stack: error.stack,
        type: 'UnhandledRejection',
        timestamp: new Date().toISOString()
    });
    process.exit(1);
});

// Gestión de la señal SIGTERM para cierre seguro
process.on('SIGTERM', () => {
    logger.info('Senyal SIGTERM rebut. Tancant el servidor...');
    process.exit(0);
});

// Iniciar el servidor
startServer();

// Exportar la aplicación para pruebas
module.exports = app;

