// Importaciones necesarias
const Requests = require('../models/Requests');
const Users = require('../models/Users');
const { validateUUID } = require('../middleware/validators');
const axios = require('axios');
const { logger } = require('../config/logger');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL;
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL;

/**
 * Registra un nuevo prompt de texto y genera una respuesta
 * @route POST /api/chat/prompt
 */
const registerPrompt = async (req, res, next) => {
    try {
        const { userId, prompt, model = DEFAULT_OLLAMA_MODEL } = req.body;

        logger.info('Nueva solicitud de prompt recibida', {
            userId,
            model,
            promptLength: prompt?.length
        });

        if (!userId || !prompt?.trim()) {
            return res.status(400).json({ message: 'El userId y el prompt son obligatorios' });
        }

        const user = await Users.findByPk(userId);  // Se busca por userId

        if (!user) {
            logger.warn('Usuario no encontrado', { userId });

            // Obtener los IDs de usuarios disponibles
            const users = await Users.findAll({
                attributes: ['id']
            });
            const availableIds = users.map(u => u.id);

            return res.status(404).json({
                message: `Usuario no encontrado. Las IDs disponibles son: ${availableIds.join(', ')}`,
                availableIds
            });
        }

        const response = await generateResponse(prompt, { model });

        const newRequest = await Requests.create({
            user_id: userId,
            prompt: prompt.trim(),
            model,
            created_at: new Date()
        });

        logger.info('Prompt registrado correctamente', { requestId: newRequest.id });
        res.status(201).json({
            conversationId: newRequest.id,
            userId: userId,
            prompt: newRequest.prompt,
            response,
            message: 'Prompt registrado correctamente'
        });
    } catch (error) {
        logger.error('Error al registrar el prompt', {
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};

/**
 * Registra un nuevo prompt con una imagen y genera una respuesta
 * @route POST /api/chat/prompt/images
 */
const registerPromptImages = async (req, res, next) => {
    try {
        const { userId, prompt, image, model = DEFAULT_OLLAMA_MODEL } = req.body;

        logger.info('Nueva solicitud de prompt con imagen recibida', {
            userId,
            model,
            hasImage: !!image,
            promptLength: prompt?.length
        });

        if (!userId || !prompt?.trim() || !image) {
            return res.status(400).json({ message: 'El userId, el prompt y la imagen son obligatorios' });
        }

        const user = await Users.findByPk(userId);

        if (!user) {
            logger.warn('Usuario no encontrado', { userId });

            // Obtener los IDs de usuarios disponibles
            const users = await Users.findAll({
                attributes: ['id']
            });
            const availableIds = users.map(u => u.id);

            return res.status(404).json({
                message: `Usuario no encontrado. Las IDs disponibles son: ${availableIds.join(', ')}`,
                availableIds
            });
        }

        const response = await generateResponse(`${prompt} [Imagen incluida]`, { model });

        const newRequest = await Requests.create({
            user_id: userId,
            prompt: prompt.trim(),
            model,
            created_at: new Date()
        });

        logger.info('Prompt con imagen registrado correctamente', { requestId: newRequest.id });
        res.status(201).json({
            conversationId: newRequest.id,
            userId: userId,
            prompt: newRequest.prompt,
            response,
            message: 'Prompt con imagen registrado correctamente'
        });
    } catch (error) {
        logger.error('Error al registrar el prompt con imagen', {
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};

/**
 * Genera una respuesta utilizando el modelo de Ollama
 * @param {string} prompt - Texto de entrada para generar la respuesta
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<string>} Respuesta generada
 */
const generateResponse = async (prompt, options = {}) => {
    try {
        const { model = DEFAULT_OLLAMA_MODEL } = options;

        logger.debug('Iniciando generación de respuesta', {
            model,
            promptLength: prompt.length
        });

        const requestBody = { model, prompt };
        const response = await axios.post(`${OLLAMA_API_URL}/generate`, requestBody, {
            timeout: 30000
        });

        logger.debug('Respuesta generada correctamente', {
            responseLength: response.data.response.length
        });

        return response.data.response.trim();
    } catch (error) {
        logger.error('Error en la generación de respuesta', {
            error: error.message,
            model: options.model
        });

        return 'Lo siento, no se pudo generar una respuesta en este momento.';
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
            digest: model.digest
        }));

        logger.info('Modelos recuperados correctamente', { count: models.length });
        res.json({
            total_models: models.length,
            models
        });
    } catch (error) {
        logger.error('Error al recuperar modelos de Ollama', {
            error: error.message,
            url: `${OLLAMA_API_URL}/tags`
        });
        
        if (error.response) {
            res.status(error.response.status).json({
                message: 'No se pudieron recuperar los modelos',
                error: error.response.data
            });
        } else {
            next(error);
        }
    }
};

/**
 * Registra un nuevo usuario en la base de datos
 * @route POST /api/users
 */
const registerUser = async (req, res, next) => {
    try {
        // Simplemente devolvemos el mensaje "Hola"
        return res.status(200).json({ message: 'Hola' });
    } catch (error) {
        logger.error('Error en la solicitud', { error: error.message, stack: error.stack });
        next(error);
    }
};


module.exports = {
    listOllamaModels,
    registerPrompt,
    registerPromptImages,
    registerUser
};
