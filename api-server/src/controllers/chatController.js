const Requests = require('../models/Requests');
const Users = require('../models/Users');
const Logs = require('../models/Logs');
const log = require('../log/logsUtility');
const { validateUUID } = require('../middleware/validators');
const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../config/logger');
const { Op } = require('sequelize');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL;
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL;
const SMS_API_URL = process.env.API_SMS_URL;
const username = process.env.SMS_API_USERNAME;
const api_token = process.env.SMS_API_TOKEN;

const FREE_QUOTE = process.env.FREE_QUOTE;
const PREMIUM_QUOTE = process.env.PREMIUM_QUOTE;
const ADMIN_QUOTE = process.env.ADMIN_QUOTE;


let verificationCodes = {};

/**
 * Hace una petición con imagen.
 * @route POST /api/analitzar-imatge
 */
const registerPromptImages = async (req, res, next) => {
    try {

        const { userId, token, prompt, images, model } = req.body;

        log.createLog("DEBUG","PROMPT","Se ha recibido una solicitud de prompt de imágenes")

        logger.info('Nueva solicitud de prompt con imágenes recibida', {
            userId,
            prompt,
            images: images?.length,
            model
        });

        if (!userId || !token || !prompt?.trim() || !images || !model ) {

            log.createLog("WARN","PROMPT","Se ha recibido una solicitud con cuerpo incorrecto")
            
            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {

            log.createLog("WARN","PROMPT","El usuario no existe en la base de datos")

            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (!user.token || user.token !== token) {

            log.createLog("WARN","PROMPT","Token no coincide con el del usuario")

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

        log.createLog("INFO","PROMPT","Se ha registrado un prompt con imagenes")

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

        log.createLog("Error","PROMPT","Ha habido un error en el registro de imagenes")

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

        log.createLog("DEBUG","MODELS","Se ha solicitado la lista de modelos de ollama")

        logger.info('Solicitando lista de modelos en Ollama');
        const response = await axios.get(`${OLLAMA_API_URL}/tags`);

        const models = response.data.models.map(model => ({
            name: model.name,
            modified_at: model.modified_at,
            size: model.size,
            digest: model.digest,
        }));

        logger.info('Modelos recuperados correctamente', { count: models.length });

        log.createLog("INFO","MODELS","Se recuperaron los modelos correctamente")

        res.status(200).json({
            status: 'OK',
            message: 'Modelos recuperados correctamente',
            data: {
                total_models: models.length,
                models,
            },
        });
    } catch (error) {

        log.createLog("ERROR","MODELS","Ha habido un error en el listado de modelos de ollama")

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

        log.createLog("DEBUG","REGISTER","Se ha recibido una solicitud de registro de usuario")

        logger.info('Nueva solicitud para registrar un usuario', { phone, nickname, email, type_id });

        if (!phone || !nickname || !email || !type_id || !password) {

            log.createLog("WARN","REGISTER","Se ha recibido una solicitud con cuerpo incorrecto")

            return res.status(400).json({ status: 'ERROR', message: 'Todos los campos son obligatorios' });
        }

        let remainingQuote;

        if (type_id == "FREE") {
            remainingQuote = FREE_QUOTE;
        } else if ( type_id == "PREMIUM") {
            remainingQuote = PREMIUM_QUOTE;
        } else {
            remainingQuote = ADMIN_QUOTE;
        }

        const newUser = await Users.create({
            phone,
            nickname,
            email,
            type_id,
            remainingQuote,
            password,
            token: null,
        });
        
        log.createLog("INFO","REGISTER","Se ha registrado a un usuario correctamente")

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

        log.createLog("ERROR","REGISTER","Ha habido un error en el registro de un usuario")

        logger.error('Error al registrar el usuario', { error: error.message, stack: error.stack });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al registrar el usuario',
            data: null,
        });
    }
};

const generateSMS = async (receiver, verificationCode) => {

    log.createLog("DEBUG","SMS","Se ha recibido una solicitud de generación de SMS")

    const text = `Tu+número+de+validación+es:+${verificationCode}`;

    const url = `${SMS_API_URL}/sendsms/?api_token=${api_token}&username=${username}&receiver=${receiver}&text=${text}`;

    try {
        const response = await axios.get(url, {
            timeout: 30000,
            responseType: 'json'
        });

        log.createLog("INFO","SMS","Se ha enviado un SMS con éxito")

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
 * @route POST /api/admin/usuaris
 */
const listUsers = async (req, res, next) => {
    try {
        const { userId, token } = req.body;

        log.createLog("DEBUG","ADMIN","Se ha recibido una solicitud de listado de usuarios")

        if (!userId || !token) {

            log.createLog("WARN","ADMIN","Se ha recibido una solicitud con cuerpo incorrecto")

            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {

            log.createLog("WARN","ADMIN","El usuario no existe en la base de datos")

            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (user.token == null || user.token !== token) {

            log.createLog("WARN","ADMIN","Token no coincide con el del usuario")

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

        log.createLog("INFO","ADMIN","Se han recuperado los usuarios correctamente")

        logger.info('Usuarios recuperados correctamente', { count: users.length });

        const userList = users.map(user => ({
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            email: user.email,
            type_id: user.type_id,
            remainingQuote: user.remainingQuote,
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

        log.createLog("ERROR","ADMIN","Ha habido un error en el listado de usuarios")

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

        log.createLog("DEBUG","LOGIN","Se ha recibido un petición de login")

        logger.info('Nueva solicitud de inicio de sesión', { nickname });

        if (!nickname || !password ) {

            log.createLog("WARN","LOGIN","Se ha recibido una solicitud con cuerpo incorrecto")

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

            log.createLog("WARN","LOGIN","El usuario no existe en la base de datos")

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

        log.createLog("INFO","LOGIN","Se ha iniciado sesión correctamente")

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

        log.createLog("ERROR","LOGIN","Hubo un error al iniciar sesión de un usuario")

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

        log.createLog("DEBUG","VALIDATE","Se ha recibido una petición de validación")

        if (!userId || !phone || !code) {

            log.createLog("WARN","VALIDATE","Se ha recibido una solicitud con cuerpo incorrecto")

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

            log.createLog("WARN","VALIDATE","El usuario no existe en la base de datos")

            logger.warn('Usuario no encontrado',  userId );
            return res.status(404).json({
                status: 'ERROR',
                message: 'Usuario no encontrado',
                data: null,
            });
        }

        logger.info('Nueva solicitud de validación de código ',  user.nickname );

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

        log.createLog("INFO","VALIDATE","Se ha validado una petición correctamente")

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

        log.createLog("ERROR","VALIDATE","Hubo un error en la validación de usuario")

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

        log.createLog("DEBUG","ADMIN","Se ha recibido una petición de actualización de plan")

        if ( !adminId || !token || !nickname || !pla) {

            log.createLog("WARN","ADMIN","Se ha recibido una solicitud con cuerpo incorrecto")

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

            log.createLog("WARN","ADMIN","Token no coincide con el del usuario")

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

            log.createLog("WARN","ADMIN","El usuario no existe en la base de datos")

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

        let remainingQuote

        if (pla == "FREE") {
            remainingQuote = FREE_QUOTE
        } else if (pla == "PREMIUM") {
            remainingQuote = PREMIUM_QUOTE
        } else {
            remainingQuote = ADMIN_QUOTE
        }

        await user.update({ type_id: pla });
        await user.update({ remainingQuote: remainingQuote });

        log.createLog("DEBUG","ADMIN","Se ha actualizado el plan de un usuario correctamente")
        
        res.status(200).json({
            status: "OK",
            message: "Pla canviat correctament",
            data: {
                pla: user.type_id,
                quota: {
                    total: remainingQuote,
                    consumida: 0,
                    disponible: remainingQuote,
                },
            },
        });

    } catch (error) {

        log.createLog("ERROR","ADMIN","Hubo un error en la actualización de plan de un usuario")

        res.status(500).json({
            status: "ERROR",
            message: "Error intern al canviar el pla de l'usuari.",
            error: error.message,
        });
    }
};

/**
 * Conseguir lista de usuarios.
 * @route POST /api/admin/logs
 */
const getLogs = async (req, res, next) => {
    try {
        const { userId, token } = req.body;

        log.createLog("DEBUG", "ADMIN", "Se ha recibido una solicitud de logs");

        if (!userId || !token) {
            log.createLog("WARN", "ADMIN", "Se ha recibido una solicitud con cuerpo incorrecto");
            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            log.createLog("WARN", "ADMIN", "El usuario no existe en la base de datos");
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (user.token == null || user.token !== token) {
            log.createLog("WARN", "ADMIN", "Token no coincide con el del usuario");
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introdujo no coincide con el del usuario`,
                data: null,
            });
        }

        log.createLog("INFO", "ADMIN", "Solicitando lista de logs");

        const oneHourAgo = new Date(new Date() - 60 * 60 * 1000);
        const logs = await Logs.findAll({
            where: {
                created_at: {
                    [Op.gte]: oneHourAgo
                }
            },
            attributes: ['type', 'category', 'prompt', 'created_at', 'updated_at'],
            order: [
                ['created_at', 'ASC'] // Ordena los logs de los más antiguos a los más recientes
            ]
        });

        log.createLog("INFO", "ADMIN", "Se han recuperado los logs correctamente");

        // Organizar logs por tipo
        const logsByType = {};
        const typeCounts = {};
        const types = ["DEBUG", "INFO", "WARN", "ERROR"];
        types.forEach(type => {
            logsByType[type] = [];
            typeCounts[type] = 0;
        });

        // Organizar logs por categoría
        const logsByCategory = {};
        const categoryCounts = {};
        const categories = ["BASE DE DATOS", "SERVER", "PROMPT", "ADMIN", "MODELS", "VALIDATE", "REGISTER", "LOGIN", "SMS","LOGIN","QUOTE"];
        categories.forEach(category => {
            logsByCategory[category] = [];
            categoryCounts[category] = 0;
        });

        // Organizar todos los logs en un solo arreglo
        const allLogs = [];

        logs.forEach(log => {
            // Agregar log a la lista general
            allLogs.push(log);

            // Organizar logs por tipo
            if (logsByType[log.type] !== undefined) {
                logsByType[log.type].push(log);
                typeCounts[log.type]++;
            }

            // Organizar logs por categoría
            if (logsByCategory[log.category] !== undefined) {
                logsByCategory[log.category].push(log);
                categoryCounts[log.category]++;
            }
        });

        res.status(200).json({
            status: 'OK',
            message: 'Logs recuperados correctamente',
            data: {
                total_logs: logs.length,
                by_type: {
                    total: logs.length,
                    counts: typeCounts,
                    logs: logsByType,
                },
                by_category: {
                    total: logs.length,
                    counts: categoryCounts,
                    logs: logsByCategory,
                },
                all_logs: {
                    total: logs.length,
                    logs: allLogs,
                }
            },
        });
    } catch (error) {
        log.createLog("ERROR", "ADMIN", "Ha habido un error al recuperar la lista de logs");
        logger.error('Error al recuperar la lista de logs', { error: error.message });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al recuperar la lista de logs',
            data: null,
        });
    }
};


/**
 * Conseguir lista de usuarios.
 * @route POST /api/admin/usuaris/quota
 */
const getQuotaUsuari = async (req, res, next) => {
    try {
        const { userId, token } = req.body;

        log.createLog("DEBUG", "QUOTE", "Se ha recibido una solicitud de quota");

        if (!userId || !token) {

            log.createLog("WARN", "QUOTE", "Se ha recibido una solicitud con cuerpo incorrecto");

            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            log.createLog("WARN", "QUOTE", "El usuario no existe en la base de datos");
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (user.token == null || user.token !== token) {
            log.createLog("WARN", "QUOTE", "Token no coincide con el del usuario");
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introdujo no coincide con el del usuario`,
                data: null,
            });
        }

        log.createLog("INFO", "QUOTE", "Solicitando quota");

        let totalQuote;

        if (user.type_id == "FREE") {
            totalQuote = FREE_QUOTE
        } else if (user.type_id == "PREMIUM") {
            totalQuote = PREMIUM_QUOTE
        } else {
            totalQuote = ADMIN_QUOTE
        }

        res.status(200).json({
            status: 'OK',
            message: 'Quota recuperada correctamente',
            data: {
                type_id: user.type_id,
                remainingQuote: user.remainingQuote,
                totalQuote: totalQuote
            },
        });
    } catch (error) {
        log.createLog("ERROR", "QUOTE", "Ha habido un error al recuperar la quota");

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al recuperar la quota',
            data: null,
        });
    }
};

/**
 * Conseguir lista de usuarios.
 * @route POST /api/usuaris/quota
 */
const useQuote = async (req, res, next) => {
    try {
        const { userId, token } = req.body;

        log.createLog("DEBUG", "QUOTE", "Se ha recibido una solicitud de uso de cuota");

        if (!userId || !token) {
            log.createLog("WARN", "QUOTE", "Se ha recibido una solicitud con cuerpo incorrecto");

            return res.status(400).json({
                status: 'ERROR',
                message: 'Todos los campos son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            log.createLog("WARN", "QUOTE", "El usuario no existe en la base de datos");
            return res.status(404).json({
                status: 'ERROR',
                message: `El usuario con id ${userId} no existe en la base de datos`,
                data: null,
            });
        }

        if (user.token == null || user.token !== token) {
            log.createLog("WARN", "QUOTE", "Token no coincide con el del usuario");
            return res.status(404).json({
                status: 'ERROR',
                message: `El token que se introdujo no coincide con el del usuario`,
                data: null,
            });
        }

        if (user.remainingQuote <= 0) {
            log.createLog("WARN", "QUOTE", "El usuario se ha quedado sin cuota");
            return res.status(402).json({
                status: 'ERROR',
                message: `El usuario se ha quedado sin cuota`,
                data: null,
            });
        }

        log.createLog("INFO", "QUOTE", "Solicitando uso de cuota");

        // Definir totalQuote según el tipo de usuario
        let totalQuote;
        if (user.type_id === "FREE") {
            totalQuote = 20;
        } else if (user.type_id === "PREMIUM") {
            totalQuote = 40;
        } else {
            totalQuote = 100;
        }

        // Reducir la cuota restante
        await user.update({ remainingQuote: user.remainingQuote - 1 });

        res.status(200).json({
            status: 'OK',
            message: 'Quota utilizada correctamente',
            data: {
                type_id: user.type_id,
                remainingQuote: user.remainingQuote,
                totalQuote: totalQuote,
            },
        });
    } catch (error) {
        log.createLog("ERROR", "QUOTE", "Ha habido un error al utilizar la cuota");

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al usar la cuota',
            data: null,
        });
    }
};  

/**
 * Actualizar plan de un usuario
 * @route POST /api/admin/usuaris/pla/setAvailableRequests
 */
const setAvailableRequests = async (req, res) => {
    try {
        const { adminId, token, nickname, availableRequests } = req.body;

        log.createLog("DEBUG","QUOTE","Se ha recibido una petición de set remainingQuote")

        if ( !adminId || !token || !nickname || !availableRequests) {

            log.createLog("WARN","QUOTE","Se ha recibido una solicitud con cuerpo incorrecto")

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

            log.createLog("WARN","QUOTE","Token no coincide con el del usuario")

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

            log.createLog("WARN","QUOTE","El usuario no existe en la base de datos")

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

        await user.update({ remainingQuote: parseInt(availableRequests) });

        log.createLog("DEBUG","QUOTE","Se han actualizado las available requests de un usuario correctamente")
        
        res.status(200).json({
            status: "OK",
            message: "Requests cambiadas correctamente",
            data: {
                pla: user.type_id,
                quota: {
                    consumida: 0,
                    disponible: user.remainingQuote,
                },
            },
        });

    } catch (error) {

        log.createLog("ERROR","QUOTE","Hubo un error en la actualización de remainingQuote de un usuario")

        res.status(500).json({
            status: "ERROR",
            message: "Error intern al canviar la remainingQuote de un usuario",
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
    getLogs,
    getQuotaUsuari,
    useQuote,
    setAvailableRequests,
};
