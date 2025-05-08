const express = require('express');
const router = express.Router();
const {
    listOllamaModels,
    registerPromptImages,
    getLogs,
} = require('../controllers/chatController');

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: Lista los modelos disponibles en Ollama
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Lista de modelos disponibles
 *       500:
 *         description: Error al recuperar modelos
 */
router.get('/models', listOllamaModels);

/**
 * @swagger
 * /api/analitzar-imatge:
 *   post:
 *     summary: Registra un nuevo prompt con una imagen y genera una respuesta
 *     tags: [Prompts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario que realiza el prompt
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Token del usuario
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               prompt:
 *                 type: string
 *                 description: Describe la siguiente imagen en base64
 *               images:
 *                 type: string
 *                 description: URL o datos de la imagen
 *               model:
 *                 type: string
 *                 description: Modelo de Ollama a utilizar
 *                 default: llama3.2-vision:latest
 *     responses:
 *       201:
 *         description: Prompt con imagen registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/analitzar-imatge', registerPromptImages);

/**
 * @swagger
 * /api/admin/logs:
 *   post:
 *     summary: Obtiene los logs organizados por tipo y categoría
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario que realiza la solicitud
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Token del usuario
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Logs obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Logs recuperados correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_logs:
 *                       type: integer
 *                       example: 150
 *                     logs_por_tipo:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               example: "ERROR"
 *                             category:
 *                               type: string
 *                               example: "SERVER"
 *                             prompt:
 *                               type: string
 *                               example: "Error en la conexión a la base de datos"
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-02-06T12:34:56Z"
 *                     logs_por_categoria:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             type:
 *                               type: string
 *                               example: "INFO"
 *                             category:
 *                               type: string
 *                               example: "ADMIN"
 *                             prompt:
 *                               type: string
 *                               example: "Se ha iniciado sesión exitosamente"
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                               example: "2024-02-06T12:00:00Z"
 *       400:
 *         description: Datos de entrada inválidos
 *       404:
 *         description: Usuario no encontrado o token inválido
 *       500:
 *         description: Error interno al recuperar los logs
 */
router.post('/admin/logs', getLogs);

module.exports = router;
