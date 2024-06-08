require('dotenv').config();

const mqtt = require('mqtt');
const { actualizarDataDisp } = require('./helpers/mqtt.js');

const mqttip = process.env.MQTTIP;
const topico = process.env.MQTTTOPIC;
const cliente = mqtt.connect(mqttip);

cliente.on('connect', () => {
    console.log('Conectado al servidor MQTT');
    cliente.subscribe(topico); 
  });
  
  cliente.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const mac = data.mac; 
  
      actualizarDataDisp(mac, data);
      console.log('Mensaje recibido:', data);
    } catch (error) {
      console.error('Error al procesar el mensaje MQTT:', error);
    }
  });
  
  module.exports = cliente;