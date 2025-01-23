// Importaciones necesarias
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
            promptLength: prompt?.length
        });

        // Validación inicial
        if (!userId || !prompt?.trim()) {
            logger.warn('userId o prompt inválido');
            return res.status(400).json({ message: 'El userId y el prompt son obligatorios' });
        }

        // Verificar si el usuario existe
        const user = await Users.findByPk(userId);
        if (!user) {
            logger.warn('Usuario no encontrado', { userId });
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Crear un nuevo registro de Request
        const newRequest = await Request.create({
            userId,
            prompt: prompt.trim(),
            model
        });

        logger.info('Nuevo request creado correctamente', { requestId: newRequest.id });

        // Generar respuesta
        if (stream) {
            await handleStreamingResponse(req, res, newRequest, prompt, model);
        } else {
            const response = await generateResponse(prompt, { model });
            res.status(201).json({
                requestId: newRequest.id,
                userId,
                prompt: newRequest.prompt,
                response,
                message: 'Prompt registrado correctamente'
            });
        }
    } catch (error) {
        logger.error('Error en el registro del prompt', {
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
 * Genera una resposta utilitzant el model d'Ollama
 * @param {string} prompt - Text d'entrada per generar la resposta
 * @param {Object} options - Opcions de configuració
 * @returns {Promise<string>} Resposta generada
 */
const generateResponse = async (prompt, options = {}) => {
    try {
        const {
            model = DEFAULT_OLLAMA_MODEL,
            stream = false
        } = options;

        logger.debug('Iniciant generació de resposta', { 
            model, 
            stream,
            promptLength: prompt.length 
        });

        const requestBody = {
            model,
            prompt,
            stream
        };

        const response = await axios.post(`${OLLAMA_API_URL}/generate`, requestBody, {
            timeout: 30000,
            responseType: stream ? 'stream' : 'json'
        });

        // Gestió diferent per respostes en streaming i no streaming
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
                        logger.error('Error processant chunk de resposta', { 
                            error: parseError.message,
                            chunk: chunkStr 
                        });
                    }
                });
                
                response.data.on('end', () => {
                    logger.debug('Generació en streaming completada', {
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

        logger.debug('Resposta generada correctament', {
            responseLength: response.data.response.length
        });
        return response.data.response.trim();
    } catch (error) {
        logger.error('Error en la generació de resposta', {
            error: error.message,
            model: options.model,
            stream: options.stream
        });
        
        if (error.response?.data) {
            logger.error('Detalls de l\'error d\'Ollama', { 
                details: error.response.data 
            });
        }

        return 'Ho sento, no he pogut generar una resposta en aquest moment.';
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
