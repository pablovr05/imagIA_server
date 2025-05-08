const express = require('express');
const router = express.Router();

const {
    registerUser,
    listUsers,
    loginUser,
    validateUser,
} = require('../controllers/userController.js');


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

module.exports = router;
