const Users = require('../models/Users');
const VerificationCode = require('../models/VerificationCode');
const log = require('../log/logsUtility');
const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../config/logger');

const SMS_API_URL = process.env.API_SMS_URL;
const username = process.env.SMS_API_USERNAME;
const api_token = process.env.SMS_API_TOKEN;

const FREE_QUOTE = process.env.FREE_QUOTE;
const PREMIUM_QUOTE = process.env.PREMIUM_QUOTE;
const ADMIN_QUOTE = process.env.ADMIN_QUOTE;

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


        await VerificationCode.create({
            user_id: newUser.id,
            phone: newUser.phone,
            code: verificationCode.toString(),
        });        

        console.log(verificationCode);

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

        const verification = await VerificationCode.findOne({
            where: { user_id: userId }
        });
        
        if (!verification) {
            logger.warn(`No existe ninguna solicitud de validación para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: `No existe ninguna validación para el usuario ${userId}`,
                data: null,
            });
        }
        
        if (verification.code !== code) {
            logger.warn(`Código incorrecto para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Código incorrecto',
                data: null,
            });
        }
        
        if (verification.phone !== phone) {
            logger.warn(`Teléfono incorrecto para el usuario con id ${userId}`);
            return res.status(401).json({
                status: 'ERROR',
                message: 'Teléfono incorrecto',
                data: null,
            });
        }        

        const token = generateToken();

        await user.update({ token: token });

        await verification.destroy();

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

module.exports = {
    registerUser,
    listUsers,
    loginUser,
    validateUser,
};
