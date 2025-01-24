const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ImagIA API',
            description: 'API per gestionar projecte de ImagIA'
        },
        servers: [
            {
                url: 'http://imagia2.ieti.site',
                description: 'Servidor de desenvolupament'
            }
        ]
    },
    apis: ['./src/routes/*.js']
};

module.exports = swaggerJsDoc(swaggerOptions);
