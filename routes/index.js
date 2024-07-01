
const express = require('express');
const { vincularEsp32, register, login, conexionDisp, obtenerDispositivos, data, datafake, actualizarNombrePlanta, nombresPlantas } = require('../controllers/index.controller.js');

const router = express.Router();

router.post('/vincular', vincularEsp32);
//router.get('/datos', funciondatos); Cambiar a funcion que retorne los datos del esp32
router.post('/register', register);
router.post('/login', login);
router.post('/conexion', conexionDisp);
router.get('/plantas/:id', obtenerDispositivos);
router.get('/data', data);
router.get('/datafake', datafake);
router.get('/nombreplantas', nombresPlantas);
router.put('/actualizarplanta', actualizarNombrePlanta);


module.exports = router;
