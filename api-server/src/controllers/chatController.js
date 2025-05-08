const Requests = require('../models/Requests');
const Users = require('../models/Users');
const Logs = require('../models/Logs');
const log = require('../log/logsUtility');
const axios = require('axios');
const { logger } = require('../config/logger');
const { Op } = require('sequelize');

const OLLAMA_API_URL = process.env.CHAT_API_OLLAMA_URL;
const DEFAULT_OLLAMA_MODEL = process.env.CHAT_API_OLLAMA_MODEL;

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

module.exports = {
    listOllamaModels,
    registerPromptImages,
    getLogs,
};
