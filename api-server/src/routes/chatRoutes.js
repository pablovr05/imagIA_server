const express = require('express');
const router = express.Router();
const {
    registerUser,
    listOllamaModels,
    registerPrompt,
    registerPromptImages,
    listUsers
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
 * /api/prompt:
 *   post:
 *     summary: Registra un nuevo prompt de texto y genera una respuesta
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
 *               prompt:
 *                 type: string
 *                 description: Texto del prompt
 *               model:
 *                 type: string
 *                 description: Modelo de Ollama a utilizar
 *                 default: llama3.2-vision:latest
 *     responses:
 *       201:
 *         description: Prompt registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/prompt', registerPrompt);

/**
 * @swagger
 * /api/analyze_image:
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
 *               prompt:
 *                 type: string
 *                 description: Describe la siguiente imagen en base64
 *               image:
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
router.post('/analyze_image', registerPromptImages);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Teléfono del usuario
 *               nickname:
 *                 type: string
 *                 description: Nickname del usuario
 *               email:
 *                 type: string
 *                 description: Correo electrónico del usuario
 *               type_id:
 *                 type: string
 *                 description: Tipo de usuario
 *               password:
 *                 type: string
 *                 description: Contraseña
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *       400:
 *         description: Datos inválidos o usuario ya registrado
 */
router.post('/users/register', registerUser);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lista els usuaris de la base de dades
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Lista de usuarios disponibles
 *       500:
 *         description: Error al recuperar usuarios
 */
router.get('/admin/users', listUsers);


module.exports = router;
