const express = require('express');
const router = express.Router();
const {
    listOllamaModels,
    registerPromptImages,
    registerUser,
    listUsers,
    loginUser
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
 * /api/generate:
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
router.post('/generate', registerPromptImages);

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
 *                 default: 123456789
 *               nickname:
 *                 type: string
 *                 description: Nickname del usuario
 *                 default: admin
 *               email:
 *                 type: string
 *                 description: Correo electrónico del usuario
 *                 default: admin@gmail.com
 *               type_id:
 *                 type: string
 *                 description: Tipo de usuario
 *                 default: ADMINISTRADOR
 *               password:
 *                 type: string
 *                 description: Contraseña
 *                 default: admin
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

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Inicia sesión un usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: Nickname del usuario
 *                 example: usuario123
 *                 default: admin
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: contraseña123
 *                 default: admin
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Inicio de sesión exitoso
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: 123
 *                     phone:
 *                       type: string
 *                       example: +34123456789
 *                     nickname:
 *                       type: string
 *                       example: usuario123
 *                     email:
 *                       type: string
 *                       example: usuario@correo.com
 *                     type_id:
 *                       type: string
 *                       example: ADMINISTRADOR
 *       400:
 *         description: Nickname o contraseña faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 message:
 *                   type: string
 *                   example: El nickname y la contraseña son obligatorios
 *       404:
 *         description: Usuario no encontrado o sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 message:
 *                   type: string
 *                   example: Usuario no encontrado
 *       401:
 *         description: Contraseña incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 message:
 *                   type: string
 *                   example: Contraseña incorrecta
 *       500:
 *         description: Error interno al iniciar sesión
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ERROR
 *                 message:
 *                   type: string
 *                   example: Error interno al iniciar sesión
 */
router.post('/users/login', loginUser);

module.exports = router;
