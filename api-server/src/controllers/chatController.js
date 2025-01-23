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
            responseLength: response.data.response.length,
            responsePreview: response.data.response.slice(0, 100)  // Mostrar solo los primeros 100 caracteres para evitar logs demasiado largos
        });

        return response.data.response.trim();
    } catch (error) {
        logger.error('Error en la generación de respuesta', {
            error: error.message,
            stack: error.stack,
            model: options.model,
            prompt
        });

        return 'Lo siento, no se pudo generar una respuesta en este momento.';
    }
};

/**
 * Lista los modelos disponibles en Ollama
 * @route GET /api/chat/models
 */
const listOllamaModels = async (req, res, next) => {
    try {
        logger.info('Solicitando lista de modelos en Ollama');
        const response = await axios.get(`${OLLAMA_API_URL}/tags`);

        logger.debug('Datos recibidos desde Ollama', { rawResponse: response.data });

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
            stack: error.stack,
            url: `${OLLAMA_API_URL}/tags`
        });

        if (error.response) {
            logger.warn('Respuesta HTTP con error desde Ollama', {
                status: error.response.status,
                data: error.response.data
            });

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
        logger.info('Solicitud para registrar un nuevo usuario');
        logger.debug('Datos recibidos', { body: req.body });

        // Este endpoint por ahora solo responde con un mensaje básico
        return res.status(200).json({ message: 'Hola' });
    } catch (error) {
        logger.error('Error al registrar usuario', {
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};

module.exports = {
    listOllamaModels,
    registerPrompt,
    registerPromptImages,
    registerUser
};
