const Requests = require('../models/Requests');
const Users = require('../models/Users');
const { validateUUID } = require('../middleware/validators');
const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../config/logger');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL;
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL;
const SMS_API_URL = process.env.API_SMS_URL;
const username = process.env.SMS_API_USERNAME;
const api_token = process.env.SMS_API_TOKEN;

let verificationCodes = {};

/**
 * Hace una petición con imagen.
 * @route POST /api/analitzar-imatge
 */
const registerPromptImages = async (req, res, next) => {
    try {

        const { userId, token, prompt, images, model } = req.body;

        logger.info('Nueva solicitud de prompt con imágenes recibida', {
            userId,
            prompt,
            images: images?.length,
            model
        });

        if (!userId || !token || !prompt?.trim() || !images || !model ) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (!user.token || user.token !== token) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introduzco no coincide con el del usuario`,
                data: null,
            });
        }

        const response = await generateResponse(prompt, [images], model);

        const newRequest = await Requests.create({
            userId: userId,
            prompt: prompt.trim(),
            answer: JSON.stringify(response),
            model: model,
        });

        logger.info('Prompt con imagenes registrado correctamente', { requestId: newRequest.id });

        res.status(201).json({
            status: 'OK',
            message: 'Prompt con imágenes registrado correctamente',
            data: {
                requestId: newRequest.id,
                userId: userId,
                prompt: newRequest.prompt,
                response,
            },
        });
    } catch (error) {
        logger.error('Error al registrar el prompt con imagenes', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al registrar el prompt con imagenes',
            data: null,
        });
    }
};

const generateResponse = async (prompt, images, model) => {
    try {

        logger.debug('Iniciando generación de respuesta', { 
            model, 
            prompt,
            stream: false,
            images
        });

        const requestBody = {
            model,
            prompt,
            stream: false,
            images
        };

        const response = await axios.post(`${OLLAMA_API_URL}/generate`, requestBody, {
            timeout: 30000,
            responseType: 'json'
        });

        logger.debug('Respuesta generada correctamente', {
            responseLength: response.data.response.length
        });
        return response.data.response.trim();
    } catch (error) {
        logger.error('Error en la generación de respuesta', {
            error: error.message,
            model: DEFAULT_OLLAMA_MODEL,
            stream: false
        });
        
        if (error.response?.data) {
            logger.error('Detalles del error de Ollama', { 
                details: error.response.data 
            });
        }

        return 'Lo siento, no he podido generar una respuesta en este momento.';
    }
};

/**
 * Lista los modelos de ollama disponibles.
 * @route GET /api/models
 */
const listOllamaModels = async (req, res, next) => {
    try {
        logger.info('Solicitando lista de modelos en Ollama');
        const response = await axios.get(`${OLLAMA_API_URL}/tags`);

        const models = response.data.models.map(model => ({
            name: model.name,
            modified_at: model.modified_at,
            size: model.size,
            digest: model.digest,
        }));

        logger.info('Modelos recuperados correctamente', { count: models.length });

        res.status(200).json({
            status: 'OK',
            message: 'Modelos recuperados correctamente',
            data: {
                total_models: models.length,
                models,
            },
        });
    } catch (error) {
        logger.error('Error al recuperar modelos de Ollama', {
            error: error.message,
            url: `${OLLAMA_API_URL}/tags`,
        });

        if (error.response) {
            res.status(error.response.status).json({
                status: 'ERROR',
                message: 'No se pudieron recuperar los modelos',
                data: error.response.data,
            });
        } else {
            res.status(500).json({
                status: 'ERROR',
                message: 'Error interno al recuperar los modelos',
                data: null,
            });
        }
    }
};

/**
 * Registra un nuevo usuario.
 * @route POST /api/usuaris/registrar
 */
const registerUser = async (req, res) => {
    try {
        const { phone, nickname, email, type_id, password } = req.body;

        logger.info('Nueva solicitud para registrar un usuario', { phone, nickname, email, type_id });

        if (!phone || !nickname || !email || !type_id || !password) {
            return res.status(400).json({ status: 'ERROR', message: 'Todos los campos son obligatorios' });
        }

        const newUser = await Users.create({
            phone,
            nickname,
            email,
            type_id,
            password,
            token: null,
        });

        logger.info('Usuario registrado correctamente', { userId: newUser.id });

        const verificationCode = Math.floor(100000 + Math.random() * 900000);


        // Agregar una entrada al diccionario
        verificationCodes[newUser.id] = {
            code: verificationCode,
            phone: newUser.phone
        };

        console.log(verificationCodes);

        generateSMS(newUser.phone, verificationCode);

        res.status(201).json({
            status: 'OK',
            message: 'Usuario registrado correctamente',
            data: { userId: newUser.id, phone, nickname, email, type_id },
        });
    } catch (error) {
        logger.error('Error al registrar el usuario', { error: error.message, stack: error.stack });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al registrar el usuario',
            data: null,
        });
    }
};

const generateSMS = async (receiver, verificationCode) => {

    const text = `Tu+número+de+validación+es:+${verificationCode}`;

    const url = `${SMS_API_URL}/sendsms/?api_token=${api_token}&username=${username}&receiver=${receiver}&text=${text}`;

    try {
        const response = await axios.get(url, {
            timeout: 30000,
            responseType: 'json'
        });

        console.log('SMS enviado con éxito:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error al enviar el SMS:', error);
        throw error;
    }
};

const generateToken = (length = 50) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Conseguir lista de usuarios.
 * @route GET /api/admin/usuaris
 */
const listUsers = async (req, res, next) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (user.token == null || user.token !== token) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introduzco no coincide con el del usuario`,
                data: null,
            });
        }

        logger.info('Solicitando lista de usuarios');

        const users = await Users.findAll({
            attributes: ['id', 'phone', 'nickname', 'email', 'type_id','password','token','updated_at','created_at'],
        });

        logger.info('Usuarios recuperados correctamente', { count: users.length });

        const userList = users.map(user => ({
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            email: user.email,
            type_id: user.type_id,
            password: user.password,
            token: user.token,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }));

        res.status(200).json({
            status: 'OK',
            message: 'Usuarios recuperados correctamente',
            data: {
                total_users: userList.length,
                users: userList,
            },
        });
    } catch (error) {
        logger.error('Error al recuperar la lista de usuarios', {
            error: error.message,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al recuperar la lista de usuarios',
            data: null,
        });
    }
};

/**
 * Inicia sesión un usuario.
 * @route POST /api/usuaris/login
 */
const loginUser = async (req, res, next) => {
    try {
        const { nickname, password } = req.body;

        logger.info('Nueva solicitud de inicio de sesión', { nickname });

        if (!nickname || !password ) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'El nickname y la contraseña son obligatorios',
                data: null,
            });
        }

        const user = await Users.findOne({
            where: { nickname },
        });

        if (!user) {
            logger.warn('Usuario no encontrado', { nickname });
            return res.status(404).json({
                status: 'ERROR',
                message: 'Usuario no encontrado',
                data: null,
            });
        }

        // Verificar si la cuenta no está validada
        if (!user.token) {
            logger.warn(`Token no validado para el usuario ${nickname}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'La cuenta no está validada',
                data: null,
            });
        }

        // Verificar si tiene los permisos
        if (user.type_id !== 'ADMINISTRADOR') {
            logger.warn(`El usuario ${nickname} no tiene rol de administrador`);
            return res.status(403).json({
                status: 'ERROR',
                message: 'Usuario sin permisos de administrador',
                data: null,
            });
        }

        // Comparación directa de la contraseña (insegura)
        if (user.password !== password) {
            logger.warn(`Contraseña incorrecta para el usuario ${nickname}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Contraseña incorrecta',
                data: null,
            });
        }

        logger.info('Inicio de sesión exitoso', { userId: user.id });

        res.set('Authorization', user.token);

        res.status(200).json({
            status: 'OK',
            message: 'Inicio de sesión exitoso',
            data: {
                userId: user.id,
                phone: user.phone,
                nickname: user.nickname,
                email: user.email,
                type_id: user.type_id,
            },
        });
    } catch (error) {
        logger.error('Error al iniciar sesión', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al iniciar sesión',
            data: null,
        });
    }
};

/**
 * Validar un usuario.
 * @route POST /api/usuaris/validar
 */
const validateUser = async (req, res, next) => {
    try {

        const { userId, phone, code } = req.body;

        if (!userId || !phone || !code) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'El userId, el teléfono y el código son obligatorios',
                data: null,
            });
        }
        
        const user = await Users.findOne({
            where: { id: userId },
        });

        if (!user) {
            logger.warn('Usuario no encontrado',  userId );
            return res.status(404).json({
                status: 'ERROR',
                message: 'Usuario no encontrado',
                data: null,
            });
        }

        logger.info('Nueva solicitud de validación de código ',  user.nickname );

        // Verificar si la cuenta ya está validada
        if (!user.token) {
            logger.warn(`El token para el usuario ${user.nickname} ya ha sido validado`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'La cuenta ya ha sido validada',
                data: null,
            });
        }

        // Verificar si el userId existe en verificationCodes
        const verificationData = verificationCodes[user.id];

        if (!verificationData) {
            logger.warn(`No existe ninguna solicitud de validación para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: `No existe ninguna validación para el usuario ${userId}`,
                data: null,
            });
        }

        if (String(verificationData.code) !== String(code)) {
            logger.warn(`Código incorrecto para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Código incorrecto',
                data: null,
            });
        }

        if (verificationData.phone !== phone) {
            logger.warn(`Teléfono incorrecto para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Teléfono incorrecto',
                data: null,
            });
        }

        const token = generateToken();

        await user.update({ token: token });

        delete verificationCodes[user.id];

        logger.info(`Usuario con id ${userId} validado correctamente`);

        res.set('Authorization', token);

        res.status(200).json({
            status: 'OK',
            message: 'Validación de token correcta',
            data: {
                userId: user.id,
                phone: user.phone,
                nickname: user.nickname,
                email: user.email,
                type_id: user.type_id,
            },
        });
    } catch (error) {
        logger.error('Error al validar el token', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al validar token',
            data: null,
        });
    }
};

/**
 * Actualizar plan de un usuario
 * @route POST /api/admin/usuaris/pla/actualitzar
 */
const updateUserPlan = async (req, res) => {
    try {
        const { adminId, token, nickname, pla } = req.body;

        if ( !adminId || !token || !nickname || !pla) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const admin = await Users.findByPk(adminId);

        if (!admin) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${adminId} no existe en la base de datos`,
                data: null,
            });
        }

        if (!admin.token || admin.token !== token) {
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introduzco no coincide con el del administrador`,
                data: null,
            });
        }

        const user = await Users.findOne({
            where: { nickname: nickname },
        });

        if (!user) {
            logger.warn(`El usuario ${user} no existe`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'El usuario no existe',
                data: null,
            });
        }

        if (user.type_id == 'ADMINISTRADOR') {
            logger.warn(`No se puede editar a un usuario administrador`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'No se puede cambiar el rol a un administrador',
                data: null,
            });
        }

        if (pla !== 'FREE' && pla !== 'PREMIUM') {
            logger.warn(`No existe un rol ${pla} solo existen FREE y PREMIUM`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'No se puede asignar un rol que no existe',
                data: null,
            });
        }

        await user.update({ type_id: pla });
        
        res.status(200).json({
            status: "OK",
            message: "Pla canviat correctament",
            data: {
                pla: user.type_id,
                quota: {
                    total: 20,
                    consumida: 0,
                    disponible: 20,
                },
            },
        });

    } catch (error) {
        res.status(500).json({
            status: "ERROR",
            message: "Error intern al canviar el pla de l'usuari.",
            error: error.message,
        });
    }
};

module.exports = {
    listOllamaModels,
    registerPromptImages,
    registerUser,
    listUsers,
    loginUser,
    validateUser,
    updateUserPlan,
};
