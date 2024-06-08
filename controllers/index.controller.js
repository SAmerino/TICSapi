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

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

module.exports = {
    vincularEsp32,
    register,
    login,
    conexionDisp
}