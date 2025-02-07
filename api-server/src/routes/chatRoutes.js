const express = require('express');
const router = express.Router();
const {
    listOllamaModels,
    registerPromptImages,
    registerUser,
    listUsers,
    loginUser,
    validateUser,
    updateUserPlan,
    getLogs,
    getQuotaUsuari,
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
 * /api/usuaris/registrar:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Usuaris]
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
router.post('/usuaris/registrar', registerUser);

/**
 * @swagger
 * /api/admin/usuaris:
 *   post:
 *     summary: Lista los usuarios en la base de datos
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
 *                 description: ID del usuario que realiza el prompt
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Token del usuario
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *       500:
 *         description: Error al crear usuario
 */
router.post('/admin/usuaris', listUsers);


/**
 * @swagger
 * /api/usuaris/login:
 *   post:
 *     summary: Inicia sesión un usuario
 *     tags: [Usuaris]
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
 *         description: Nickname, contraseña o token faltantes
 *       404:
 *         description: Usuario no encontrado o sin permisos de administrador
 *       401:
 *         description: Contraseña o token incorrecto
 *       500:
 *         description: Error interno al iniciar sesión
 */
router.post('/usuaris/login', loginUser);


/**
 * @swagger
 * /api/usuaris/validar:
 *   post:
 *     summary: Valida un usuari a partir del seu telefon i id
 *     tags: [Usuaris]
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
 *                 description: ID del usuario a validar
 *               phone:
 *                 type: string
 *                 description: Número de teléfono del usuario
 *               code:
 *                 type: string
 *                 description: Código de verificación de 6 carácteres envia al teléfono
 *     responses:
 *       401:
 *         description: El usuario ya ha sido validado
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Usuario no encontrado
 *       200:
 *         description: Validación correcta
 *       500:
 *         description: Error interno del servidor
 */
router.post('/usuaris/validar', validateUser);

/**
 * @swagger
 * /api/admin/usuaris/pla/actualitzar:
 *   post:
 *     summary: Canvia el pla de l’usuari i les quotes d’acord amb el nou pla
 *     description: Disponible només per usuaris Administradors que s’hagin autenticat i facilitin la seva API_KEY. Es requereix almenys un paràmetre per identificar l’usuari.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminId:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario que realiza el prompt
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               token:
 *                 type: string
 *                 format: uuid
 *                 description: Token del usuario
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               nickname:
 *                 type: string
 *                 description: Usuario en el sistema que queremos actualizar
 *                 example: "SparkleFuzzMcGee"
 *               pla:
 *                 type: string
 *                 description: Nom del nou pla de l'usuari
 *                 example: "PREMIUM"
 *     responses:
 *       401:
 *         description: No autoritzat (API_KEY invàlida o no proporcionada)
 *       400:
 *         description: Dades invàlides o falta d'identificador de l'usuari
 *       404:
 *         description: Usuari no trobat
 *       200:
 *         description: Pla de l'usuari canviat correctament
 *         content:
 *           application/json:
 *             example:
 *               status: "OK"
 *               message: "Pla canviat correctament"
 *               data:
 *                 pla: "PREMIUM"
 *                 quota:
 *                   total: 20
 *                   consumida: 15
 *                   disponible: 5
 *       500:
 *         description: Error intern del servidor
 */
router.post('/admin/usuaris/pla/actualitzar', updateUserPlan);

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


/**
 * @swagger
 * /api/admin/usuaris/quota:
 *   post:
 *     summary: Obtiene la cuota del usuario en base a su tipo
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
 *         description: Cuota recuperada correctamente
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
 *                   example: "Cuota recuperada correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     type_id:
 *                       type: string
 *                       description: Tipo de usuario (FREE, PREMIUM, etc.)
 *                       example: "PREMIUM"
 *                     remainingQuote:
 *                       type: integer
 *                       description: Cuota restante del usuario
 *                       example: 15
 *                     totalQuote:
 *                       type: integer
 *                       description: Cuota total disponible para el usuario
 *                       example: 40
 *       400:
 *         description: Datos de entrada inválidos o incompletos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "Todos los campos son obligatorios"
 *                 data:
 *                   type: null
 *       401:
 *         description: Token inválido o no coincide con el del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "El token no coincide con el del usuario"
 *                 data:
 *                   type: null
 *       404:
 *         description: Usuario no encontrado en la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "El usuario con id 550e8400-e29b-41d4-a716-446655440000 no existe en la base de datos"
 *                 data:
 *                   type: null
 *       500:
 *         description: Error interno al recuperar la cuota
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "Error interno al recuperar la cuota"
 *                 data:
 *                   type: null
 */
router.post('/admin/usuaris/quota', getQuotaUsuari);

/**
 * @swagger
 * /api/usuaris/quota:
 *   post:
 *     summary: Utiliza la cuota disponible para el usuario
 *     tags: [Usuaris]
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
 *         description: Cuota utilizada correctamente
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
 *                   example: "Quota utilizada correctamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     type_id:
 *                       type: string
 *                       description: Tipo de usuario (FREE, PREMIUM, etc.)
 *                       example: "PREMIUM"
 *                     remainingQuote:
 *                       type: integer
 *                       description: Cuota restante del usuario después de la operación
 *                       example: 39
 *                     totalQuote:
 *                       type: integer
 *                       description: Cuota total disponible para el usuario
 *                       example: 40
 *       400:
 *         description: Datos de entrada inválidos o incompletos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "Todos los campos son obligatorios"
 *                 data:
 *                   type: null
 *       402:
 *         description: El usuario se ha quedado sin cuota
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "El usuario se ha quedado sin cuota"
 *                 data:
 *                   type: null
 *       404:
 *         description: Usuario no encontrado en la base de datos o token no coincide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "El usuario con id 550e8400-e29b-41d4-a716-446655440000 no existe en la base de datos"
 *                 data:
 *                   type: null
 *       500:
 *         description: Error interno al utilizar la cuota
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ERROR"
 *                 message:
 *                   type: string
 *                   example: "Error interno al usar la cuota"
 *                 data:
 *                   type: null
 */
router.post('/api/usuaris/quota', useQuote);


module.exports = router;
