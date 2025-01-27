const Requests = require('../models/Requests');
const Users = require('../models/Users');
const { validateUUID } = require('../middleware/validators');
const axios = require('axios');
const { logger } = require('../config/logger');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL;
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL;

/**
 * Registra un nuevo prompt y genera una respuesta
 * @route POST /api/chat/prompt
 */
const registerPrompt = async (req, res, next) => {
    try {
        const { 
            userId, 
            prompt, 
            model = DEFAULT_OLLAMA_MODEL, 
            stream = false 
        } = req.body;

        logger.info('Nueva solicitud de prompt recibida', {
            model,
            stream,
            promptLength: prompt?.length,
        });

        if (!userId || !prompt?.trim()) {
            logger.warn('userId o prompt inválido');
            return res.status(400).json({
                status: 'ERROR',
                message: 'El userId y el prompt son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);
        if (!user) {
            logger.warn('Usuario no encontrado', { userId });
            return res.status(404).json({
                status: 'ERROR',
                message: 'Usuario no encontrado',
                data: null,
            });
        }

        const newRequest = await Requests.create({
            userId,
            prompt: prompt.trim(),
            model,
        });

        logger.info('Nuevo request creado correctamente', { requestId: newRequest.id });

        if (stream) {
            await handleStreamingResponse(req, res, newRequest, prompt, model);
        } else {
            const response = await generateResponse(prompt, { model });
            res.status(201).json({
                status: 'OK',
                message: 'Prompt registrado correctamente',
                data: {
                    requestId: newRequest.id,
                    userId,
                    prompt: newRequest.prompt,
                    response,
                },
            });
        }
    } catch (error) {
        logger.error('Error en el registro del prompt', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al registrar el prompt',
            data: null,
        });
    }
};

const registerPromptImages = async (req, res, next) => {
    try {
        const { userId, prompt, images } = req.body; // Cambiar "image" por "images"

        logger.info('Nueva solicitud de prompt con imágenes recibida', {
            userId,
            prompt,
            images: images?.length,
            DEFAULT_OLLAMA_MODEL,
        });

        if (!userId || !prompt?.trim() || !images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                status: 'ERROR',
                message: 'El userId, el prompt y las imágenes son obligatorios',
                data: null,
            });
        }

        const user = await Users.findByPk(userId);
        if (!user) {
            logger.warn('Usuario no encontrado', { userId });

            const users = await Users.findAll({
                attributes: ['id'],
            });
            const availableIds = users.map((u) => u.id);

            return res.status(404).json({
                status: 'ERROR',
                message: `Usuario no encontrado. Las IDs disponibles son: ${availableIds.join(', ')}`,
                data: { availableIds },
            });
        }

        const response = await generateResponse(prompt, [images], model);
        const newRequest = await Requests.create({
            userId: userId,
            prompt: prompt.trim(),
            model,
            created_at: new Date(),
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
        const {
            DEFAULT_OLLAMA_MODEL,
            stream = false
        } = options;

        logger.debug('Iniciando generación de respuesta', { 
            DEFAULT_OLLAMA_MODEL, 
            prompt,
            stream,
            images
        });

        const requestBody = {
            model,
            prompt,
            stream,
            images // Asegúrate de que aquí pasas el array de imágenes
        };

        const response = await axios.post(`${OLLAMA_API_URL}/generate`, requestBody, {
            timeout: 30000,
            responseType: stream ? 'stream' : 'json'
        });

        if (stream) {
            return new Promise((resolve, reject) => {
                let fullResponse = '';
                
                response.data.on('data', (chunk) => {
                    const chunkStr = chunk.toString();
                    try {
                        const parsedChunk = JSON.parse(chunkStr);
                        if (parsedChunk.response) {
                            fullResponse += parsedChunk.response;
                        }
                    } catch (parseError) {
                        logger.error('Error procesando chunk de respuesta', { 
                            error: parseError.message,
                            chunk: chunkStr 
                        });
                    }
                });
                
                response.data.on('end', () => {
                    logger.debug('Generación en streaming completada', {
                        responseLength: fullResponse.length
                    });
                    resolve(fullResponse.trim());
                });
                
                response.data.on('error', (error) => {
                    logger.error('Error en streaming', { error: error.message });
                    reject(error);
                });
            });
        }

        logger.debug('Respuesta generada correctamente', {
            responseLength: response.data.response.length
        });
        return response.data.response.trim();
    } catch (error) {
        logger.error('Error en la generación de respuesta', {
            error: error.message,
            model: options.model,
            stream: options.stream
        });
        
        if (error.response?.data) {
            logger.error('Detalles del error de Ollama', { 
                details: error.response.data 
            });
        }

        return 'Lo siento, no he podido generar una respuesta en este momento.';
    }
};

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
 * @route POST /api/users/register
 */
const registerUser = async (req, res, next) => {
    try {
        const { phone, nickname, email, type_id, password } = req.body;

        logger.info('Nueva solicitud para registrar un usuario', {
            phone,
            nickname,
            email,
            type_id,
            password
        });

        if ( !phone || !nickname || !email || !type_id || !password ) {
            return res.status(400).json({ message: 'El phone, nickname, email y type_id son obligatorios' });
        }

        const newUser = await Users.create({
            phone,
            nickname,
            email,
            type_id,
            password,
            created_at: new Date()
        });

        logger.info('Nuevo usuario creado correctamente', { userId: newUser.id });

        res.status(201).json({
            status: 'OK',
            message: 'Usuario registrado correctamente',
            data: {
                userId: newUser.id,
                phone: newUser.phone,
                nickname: newUser.nickname,
                email: newUser.email,
                type_id: newUser.type_id,
                password: newUser.password
            },
        });
    } catch (error) {
        logger.error('Error al registrar el usuario', {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            status: 'ERROR',
            message: 'Error interno al registrar el usuario',
            data: null,
        });
    }
};

const listUsers = async (req, res, next) => {
    try {
        logger.info('Solicitando lista de usuarios');

        const users = await Users.findAll({
            attributes: ['id', 'phone', 'nickname', 'email', 'type_id','password', 'created_at'],
        });

        logger.info('Usuarios recuperados correctamente', { count: users.length });

        const userList = users.map(user => ({
            id: user.id,
            phone: user.phone,
            nickname: user.nickname,
            email: user.email,
            type_id: user.type_id,
            password: user.password,
            created_at: user.created_at,
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
 * @route POST /api/users/login
 */
const loginUser = async (req, res, next) => {
    try {
        const { nickname, password } = req.body;

        logger.info('Nueva solicitud de inicio de sesión', { nickname });

        if (!nickname || !password) {
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

        // Verificar rol de administrador
        if (user.type_id !== 'ADMINISTRADOR') {
            logger.warn(`El usuario ${nickname} no tiene rol de administrador`);
            return res.status(403).json({
                status: 'ERROR',
                message: 'Usuario sin permisos de administrador',
                data: null,
            });
        }

        if (user.password !== password) {
            logger.warn(`Contraseña incorrecta. Nickname: ${nickname}, Contraseña introducida: ${password}, Contraseña del usuario: ${user.password}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Contraseña incorrecta',
                data: null,
            });
        }

        logger.info('Inicio de sesión exitoso', { userId: user.id });

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

module.exports = {
    registerUser,
    listOllamaModels,
    registerPrompt,
    registerPromptImages,
    listUsers,
    loginUser
};
