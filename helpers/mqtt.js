
let dispotivos = {};

const dataDispotivo = (mac) => {
    return dispotivos[mac] || null;
};

const actualizarDataDisp = (mac, data) =>{
    dispotivos[mac] = data;
};

module.exports = {
    dataDispotivo,
    actualizarDataDisp
};