import { getPlayerFullData } from './lib/riot-api';
import { loadEnvConfig } from '@next/env';
import * as path from 'path';

// Cargar variables de entorno usando la utilidad de Next.js
loadEnvConfig(process.cwd());

async function testRiotAPI() {
  try {
    console.log('Probando conexión con Riot Games API...');
    
    // Vamos a buscar un jugador de prueba (puedes cambiarlo por tu propio Riot ID)
    const gameName = 'rasharo';
    const tagLine = 'EKKO';
    
    console.log(`Buscando a: ${gameName}#${tagLine}`);
    const data = await getPlayerFullData(gameName, tagLine);
    
    console.log('¡Conexión Exitosa! 🎉');
    console.log('Datos obtenidos:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error al conectar con la API:', error);
  }
}

testRiotAPI();
