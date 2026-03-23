import axios from 'axios';

// Creamos una instancia configurada de Axios
// Aquí defines la IP o el dominio base de tu ESP32
const apiClient = axios.create({
  baseURL: 'http://192.168.1.100',
  timeout: 2000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Puedes configurar interceptores aquí si en el futuro necesitas
// mandar tokens de seguridad o manejar errores globales.

// Ejemplo de función para obtener los datos
export const getSolarData = async () => {
  // Solo referenciamos el endpoint, la IP ya viene de base
  const response = await apiClient.get('/data');
  return response.data;
};

export default apiClient;
