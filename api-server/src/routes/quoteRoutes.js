const express = require('express');
const router = express.Router();

const {
    updateUserPlan,
    getQuotaUsuari,
    useQuote,
    setAvailableRequests,
} = require('../controllers/quoteController.js');


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
router.post('/usuaris/quota', useQuote);

/**
 * @swagger
 * /api/admin/usuaris/pla/setAvailableRequests:
 *   post:
 *     summary: Canvia les available requests d'un usuari
 *     description: |
 *       Aquesta ruta permet a un administrador autenticar-se i actualitzar el nombre de "available requests" d'un usuari. 
 *       És necessari proporcionar el `adminId`, `token`, `nickname` i `availableRequests` per identificar l'usuari i actualitzar la seva quota.
 *       Aquesta acció només està disponible per administradors autenticats mitjançant la seva API_KEY.
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
 *                 description: ID de l'administrador que fa la sol·licitud
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               token:
 *                 type: string
 *                 description: Token d'autenticació de l'administrador
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               nickname:
 *                 type: string
 *                 description: Nom d'usuari que s'ha de modificar
 *                 example: "SparkleFuzzMcGee"
 *               availableRequests:
 *                 type: integer
 *                 description: Nombre de "available requests" que quedarà per a l'usuari
 *                 example: 120
 *     responses:
 *       200:
 *         description: Les available requests de l'usuari han estat actualitzades correctament
 *         content:
 *           application/json:
 *             example:
 *               status: "OK"
 *               message: "Available requests canviades correctament"
 *               data:
 *                 availableRequests: 120
 *                 quota:
 *                   total: 20
 *                   consumida: 15
 *                   disponible: 5
 *       400:
 *         description: Dades invàlides o falta algun paràmetre necessari
 *         content:
 *           application/json:
 *             example:
 *               status: "ERROR"
 *               message: "Tots els camps són obligatoris"
 *       401:
 *         description: No autoritzat (API_KEY invàlida o no proporcionada)
 *         content:
 *           application/json:
 *             example:
 *               status: "ERROR"
 *               message: "No autoritzat: Token invàlid o caducat"
 *       404:
 *         description: L'usuari o el token no coincideix amb l'administrador
 *         content:
 *           application/json:
 *             example:
 *               status: "ERROR"
 *               message: "El token no coincideix amb l'administrador o l'usuari no existeix"
 *       500:
 *         description: Error intern del servidor
 *         content:
 *           application/json:
 *             example:
 *               status: "ERROR"
 *               message: "Error intern al canviar les available requests de l'usuari"
 */
router.post('/admin/usuaris/pla/setAvailableRequests', setAvailableRequests);

module.exports = router;
