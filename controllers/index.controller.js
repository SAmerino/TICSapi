const pool = require('../db.js');
const bcrypt = require('bcrypt');
const { dataDispositivo, dataDispotivo } = require('../helpers/mqtt.js');

const register = async(req, res) => {
    //Para hacer el manejo de datos desde aqui guiarme por express-app
    //y hacer el manejo de errores desde aca y utilizar json para los
    //mensajes de error, tambien cachar como hacer los fetch desde la pag
    const { nombre, email, password } = req.body;

    try {
        // Verificar si el email ya está en uso
        const queryEmail = 'SELECT email FROM usuarios WHERE email = $1';
        const emailExistente = await pool.query(queryEmail, [email]);

        if (emailExistente.rows.length > 0) {
            return res.json({ success: false, message: "El email ya está en uso." });
        }

        // Validar el email
        if (!validateEmail(email)) {
            return res.json({ success: false, message: "Ingrese un email válido." });
        }

        // Validar la contraseña
        if (password.length < 8) {
            return res.json({ success: false, message: "La contraseña debe ser mínimo de 8 caracteres." });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el nuevo usuario
        const createUserQuery = 'INSERT INTO usuarios (nombre, email, contraseña) VALUES ($1, $2, $3)';
        await pool.query(createUserQuery, [nombre, email, hashedPassword]);

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al registrar el usuario' });
    }
};

const login = async(req, res) => {
    
    const {email, password} = req.body;

    try{
    const query = 'SELECT id, nombre, contraseña FROM usuarios WHERE email = $1';
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
        return res.json({ success: false, message: "El email ingresado no existe." });
    }

    const usuario = result.rows[0];
    // Comparar la contraseña ingresada con la almacenada
    const passwordMatch = await bcrypt.compare(password, usuario.contraseña);

    if (!passwordMatch) {
      return res.json({ success: false, message: 'El usuario no existe o verifique sus datos ingresados' });
    }

    // Si la autenticación es exitosa
    console.log('autenticacion exitosa');
    return res.json({
        success: true,
        message: 'Autenticación exitosa',
        user: {
          id: usuario.id,
          nombre: usuario.nombre
        }
      });

  } catch (error) {
    console.error('Error en la autenticación:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }

};

const vincularEsp32 = async(req, res) => {
    const { id, codigo } = req.body;

    try{
        const query = 'SELECT codigo_disp FROM dispositivos WHERE codigo_disp = $1';
        const result = await pool.query(query, [codigo]);

        if (result.rows.length === 0) {
            return res.json({ success: false, message: "El dispositivo ingresado no existe." });
        }

        const queryExiste = 'SELECT cliente_id, codigo_disp FROM dispositivocliente WHERE codigo_disp = $1';
        const existeVinculo = await pool.query(queryExiste, [codigo]);

        if (existeVinculo.rows.length > 0) {
            const clienteId = existeVinculo.rows[0].cliente_id;
            
            if(String(clienteId) === String(id)){
                return res.json({success: false, message: "El dispositivo ya esta vinculado."});
            }
            else {
                console.log('clienteId:', clienteId, 'id:', id);
                return res.json({success: false, message: "El dispositivo esta vinculado a otra persona o hubo un error."});
            }
        }
        
        const insert = 'INSERT INTO dispositivocliente (cliente_id, codigo_disp) VALUES ( $1 ,$2 )';
        await pool.query(insert, [id, codigo]);
        const insertPlantaMonitoreada = "INSERT INTO plantas_monitoreadas (codigo_disp) VALUES ($1)";
        await pool.query(insertPlantaMonitoreada, [codigo]);

        console.log('Vinculado');
        return res.json({success: true, message: 'Vinculado exitosamente'});
        
    }   catch {
        console.error('Error en la vinculacion:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
    


};

const conexionDisp = async(req, res) => {
    const mac = req.body;

    try {
        const dataDispositivo = dataDispotivo(mac);
        if (!dataDispositivo) {
            return res.status(404).json({ success: false, message: 'Dispositivo no encontrado' });
          }
      
          return res.json({ success: true, data: dataDispositivo });
    } catch {
        console.error('Error al verificar la conexión:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
};
      
const obtenerDispositivos = async (req, res) => {
    const id = req.params.id;
    try {
        const query = "SELECT P.nombre AS Nombre, P.hum_gnd AS Humedad_Suelo, P.hum_air AS Humedad_Aire, P.temp AS Temperatura, PM.ubicacion AS Ubicacion, DC.codigo_disp AS Codigo_Dispositivo FROM  Plantas_Monitoreadas AS PM LEFT JOIN Plantas AS P ON PM.id_plantas = P.id LEFT JOIN dispositivocliente AS DC ON PM.codigo_disp = DC.codigo_disp WHERE DC.cliente_id = $1";
 
        const { rows } = await pool.query(query, [id]);

        const dispositivos = rows.map(dispositivo => {
            Object.keys(dispositivo).forEach(key => {
                if (dispositivo[key] === null) {
                    dispositivo[key] = '---';
                }
            });
            return dispositivo;
        });

        console.log("Funcionó plantas, ID:", id);
        res.status(200).json({
            success: true,
            dispositivos: dispositivos // Utiliza los datos procesados
        });
    } catch (error) {
        console.error('Error al recuperar dispositivos:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
};

const configurarDispositivo = async (req, res) => {
    const { dispositivoId, ubicacion, idTipoPlanta } = req.body;

    try {
        const plantaExistente = await pool.query('SELECT * FROM plantas_monitoreadas WHERE id_dispositivo = $1', [dispositivoId]);

        if (plantaExistente.rowCount === 0) {
            await pool.query('INSERT INTO plantas_monitoreadas (id_planta, ubicacion, id_dispositivo) VALUES ($1, $2, $3)', [idTipoPlanta, ubicacion, dispositivoId]);
            res.status(201).json({ success: true, message: 'Dispositivo configurado correctamente' });
        } else {
            res.status(400).json({ success: false, message: 'El dispositivo ya está configurado' });
        }
    } catch (error) {
        console.error('Error al configurar el dispositivo:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
};

const datafake = async(req, res) => {
    const temperaturaFalsa = 26.5;
    const humedadSueloFalsa = "Moderada";
    const humedadAireFalsa = 70.0;
    const datafake = {
        temperatura: temperaturaFalsa,
        humedad_suelo: humedadSueloFalsa,
        humedad_aire: humedadAireFalsa
    };

    // Envía la respuesta
    res.json(datafake);
};

const data = async (req, res) => {
    // Datos de prueba
    const sensorData = [
        { time: '2024-06-23T08:00:00.000Z', temperature: 22.1 },
        { time: '2024-06-23T08:05:00.000Z', temperature: 22.3 },
        { time: '2024-06-23T08:10:00.000Z', temperature: 22.7 },
        { time: '2024-06-23T08:15:00.000Z', temperature: 23.0 },
        { time: '2024-06-23T08:20:00.000Z', temperature: 23.5 },
        { time: '2024-06-23T08:25:00.000Z', temperature: 23.8 },
        { time: '2024-06-23T08:30:00.000Z', temperature: 24.1 },
        { time: '2024-06-23T08:35:00.000Z', temperature: 24.4 },
        { time: '2024-06-23T08:40:00.000Z', temperature: 24.8 },
        { time: '2024-06-23T08:45:00.000Z', temperature: 25.0 }
    ];
    console.log("data");
    // Responder con los datos en formato JSON
    res.status(200).json(sensorData);
};

const nombresPlantas = async (req, res) => {
    try {
        const query = "SELECT nombre FROM Plantas";
        const result = await pool.query(query);
        console.log("Mostró plantas");
        // Establecer primero el código de estado HTTP y luego enviar el objeto JSON
        res.status(200).json({
            success: true,
            plantas: result.rows // Suponiendo que 'result.rows' contiene los datos deseados
        });
    } catch (error) {
        console.error('Error al mostrar las plantas:', error);
        // Enviar una respuesta con código de estado 500 y un objeto JSON con el mensaje de error
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
};

//error en id
const actualizarNombrePlanta = async (req, res) => {
    try {
        const { id, nuevoNombre } = req.body;
        console.log(id + nuevoNombre);
        const queryplanta = "SELECT id FROM plantas WHERE nombre = $1";
        const id_planta_result = await pool.query(queryplanta, [nuevoNombre]);

        if (id_planta_result.rows.length > 0) {
            const id_planta = id_planta_result.rows[0].id;
            console.log(`Actualizando dispositivo con ID ${id} a nuevo ID de planta ${id_planta}`);
            const query = "UPDATE plantas_monitoreadas SET id_plantas = $1 WHERE id = $2";
            const result = await pool.query(query, [id_planta, id]);
            if (result.rowCount > 0) {
                console.log("Actualizado con éxito");
                res.json({ success: true, message: "Nombre actualizado con éxito" });
            } else {
                console.log("No se encontró el dispositivo o no se requirió actualización");
                res.status(404).json({ success: false, message: "Dispositivo no encontrado o no modificado" });
            }
        } else {
            console.log("No se encontró la planta solicitada");
            res.status(404).json({ success: false, message: "Planta no encontrada" });
        }
    } catch (error) {
        console.error('Error al actualizar el nombre de la planta:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
};



function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

module.exports = {
    vincularEsp32,
    register,
    login,
    conexionDisp,
    obtenerDispositivos,
    data,
    datafake,
    nombresPlantas,
    actualizarNombrePlanta
};