import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Guarda cosas grandes, que es donde el almacén normal se rinde.
 *
 * El archivo de datos son 76 MB de texto. En el navegador, `AsyncStorage` es
 * `localStorage` por dentro y ahí el límite ronda los 10 MB: al intentarlo
 * lanza `QuotaExceededError`. Eso ya costó un fallo grande —la web descargaba
 * los resultados de verdad, reventaba al guardarlos, y por el error se quedaba
 * enseñando los equipos de relleno a todo el mundo.
 *
 * IndexedDB no tiene ese techo: el navegador reparte según el disco disponible
 * y admite cientos de megas sin rechistar. Fuera del navegador no existe, pero
 * tampoco hace falta: en el móvil `AsyncStorage` va sobre SQLite y aguanta.
 */

const BASE = 'scout-picks';
const ALMACEN = 'grandes';

function hayIndexedDB(): boolean {
  return Platform.OS === 'web' && typeof indexedDB !== 'undefined';
}

/** Abre la base, creando el almacén la primera vez. */
function abre(): Promise<IDBDatabase> {
  return new Promise((resuelve, rechaza) => {
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      if (!bd.objectStoreNames.contains(ALMACEN)) bd.createObjectStore(ALMACEN);
    };
    peticion.onsuccess = () => resuelve(peticion.result);
    peticion.onerror = () => rechaza(peticion.error);
  });
}

/**
 * Deja un texto guardado. Devuelve si lo consiguió.
 *
 * Nunca lanza: quien llama está guardando una copia de cortesía, y que no haya
 * sitio no puede tumbar nada de lo que ya funcionaba.
 */
export async function guardaGrande(clave: string, texto: string): Promise<boolean> {
  try {
    if (!hayIndexedDB()) {
      await AsyncStorage.setItem(clave, texto);
      return true;
    }
    const bd = await abre();
    await new Promise<void>((resuelve, rechaza) => {
      const t = bd.transaction(ALMACEN, 'readwrite');
      t.objectStore(ALMACEN).put(texto, clave);
      t.oncomplete = () => resuelve();
      t.onerror = () => rechaza(t.error);
    });
    bd.close();
    return true;
  } catch {
    return false;
  }
}

/** Lo guardado la última vez, o null si no hay nada o no se pudo leer. */
export async function leeGrande(clave: string): Promise<string | null> {
  try {
    if (!hayIndexedDB()) return await AsyncStorage.getItem(clave);
    const bd = await abre();
    const texto = await new Promise<string | null>((resuelve, rechaza) => {
      const t = bd.transaction(ALMACEN, 'readonly');
      const p = t.objectStore(ALMACEN).get(clave);
      p.onsuccess = () => resuelve((p.result as string) ?? null);
      p.onerror = () => rechaza(p.error);
    });
    bd.close();
    return texto;
  } catch {
    return null;
  }
}
