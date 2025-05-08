const Users = require('../models/Users');
const log = require('../log/logsUtility');

const { logger } = require('../config/logger');

const FREE_QUOTE = process.env.FREE_QUOTE;
const PREMIUM_QUOTE = process.env.PREMIUM_QUOTE;
const ADMIN_QUOTE = process.env.ADMIN_QUOTE;

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
    updateUserPlan,
    getQuotaUsuari,
    useQuote,
    setAvailableRequests,
};
