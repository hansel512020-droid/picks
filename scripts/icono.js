#!/usr/bin/env node
/**
 * Dibuja el icono, el splash y el favicon de Scout Picks sin depender de
 * ninguna libreria de imagen: pinta los pixeles a mano y los mete en un PNG.
 *
 *   node scripts/icono.js
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const FONDO = [10, 11, 13];
const LIMA = [201, 255, 61];

// ------------------------------------------------------------------ PNG

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c;
  }
  return tabla;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** Guarda un buffer RGBA de lado x lado como PNG. */
function guardaPNG(ruta, lado, rgba) {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(lado, 0);
  cabecera.writeUInt32BE(lado, 4);
  cabecera[8] = 8; // bits por canal
  cabecera[9] = 6; // RGBA
  // Cada fila lleva delante su byte de filtro, aqui siempre 0.
  const crudo = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    crudo[y * (lado * 4 + 1)] = 0;
    rgba.copy(crudo, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', zlib.deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, png);
  console.log(`${ruta}  ${lado}x${lado}  ${(png.length / 1024).toFixed(1)} kB`);
}

// ----------------------------------------------------------------- dibujo

/**
 * La marca: una estrella de cuatro puntas (|x|^p + |y|^p <= r^p, que con p<1
 * da los lados concavos) dentro de un anillo, y un hueco en el centro.
 */
function marca(lado, conFondo) {
  const rgba = Buffer.alloc(lado * lado * 4);
  const c = (lado - 1) / 2;
  const escala = lado / 2;

  const P = 0.62;
  const R_ESTRELLA = 0.62;
  const R_ANILLO = 0.82;
  const GROSOR = 0.055;
  const R_HUECO = 0.16;

  // Se muestrea cada pixel en 3x3 para que los bordes salgan suaves.
  const MUESTRAS = 3;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let dentroEstrella = 0;
      let dentroAnillo = 0;
      let dentroHueco = 0;

      for (let sy = 0; sy < MUESTRAS; sy++) {
        for (let sx = 0; sx < MUESTRAS; sx++) {
          const px = (x + (sx + 0.5) / MUESTRAS - 0.5 - c) / escala;
          const py = (y + (sy + 0.5) / MUESTRAS - 0.5 - c) / escala;
          const r = Math.hypot(px, py);
          if (Math.pow(Math.abs(px), P) + Math.pow(Math.abs(py), P) <= Math.pow(R_ESTRELLA, P)) {
            dentroEstrella++;
          }
          if (Math.abs(r - R_ANILLO) <= GROSOR) dentroAnillo++;
          if (r <= R_HUECO) dentroHueco++;
        }
      }

      const total = MUESTRAS * MUESTRAS;
      const alfaEstrella = dentroEstrella / total;
      const alfaAnillo = (dentroAnillo / total) * 0.6;
      const alfaHueco = dentroHueco / total;
      // El hueco central recorta la estrella.
      const alfaMarca = Math.min(1, Math.max(alfaEstrella, alfaAnillo)) * (1 - alfaHueco);

      const i = (y * lado + x) * 4;
      if (conFondo) {
        rgba[i] = Math.round(FONDO[0] + (LIMA[0] - FONDO[0]) * alfaMarca);
        rgba[i + 1] = Math.round(FONDO[1] + (LIMA[1] - FONDO[1]) * alfaMarca);
        rgba[i + 2] = Math.round(FONDO[2] + (LIMA[2] - FONDO[2]) * alfaMarca);
        rgba[i + 3] = 255;
      } else {
        rgba[i] = LIMA[0];
        rgba[i + 1] = LIMA[1];
        rgba[i + 2] = LIMA[2];
        rgba[i + 3] = Math.round(alfaMarca * 255);
      }
    }
  }
  return rgba;
}

/** Version reducida al 62% para el icono adaptativo de Android. */
function conMargen(lado, rgbaOrigen, ladoOrigen, proporcion) {
  const rgba = Buffer.alloc(lado * lado * 4);
  const destino = Math.round(lado * proporcion);
  const inicio = Math.round((lado - destino) / 2);
  for (let y = 0; y < destino; y++) {
    for (let x = 0; x < destino; x++) {
      const ox = Math.min(ladoOrigen - 1, Math.floor((x / destino) * ladoOrigen));
      const oy = Math.min(ladoOrigen - 1, Math.floor((y / destino) * ladoOrigen));
      const o = (oy * ladoOrigen + ox) * 4;
      const d = ((y + inicio) * lado + (x + inicio)) * 4;
      rgba[d] = rgbaOrigen[o];
      rgba[d + 1] = rgbaOrigen[o + 1];
      rgba[d + 2] = rgbaOrigen[o + 2];
      rgba[d + 3] = rgbaOrigen[o + 3];
    }
  }
  return rgba;
}

/** Lienzo liso de un color, para el fondo del icono adaptativo. */
function liso(lado, color) {
  const rgba = Buffer.alloc(lado * lado * 4);
  for (let i = 0; i < lado * lado; i++) {
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

const raiz = path.join(__dirname, '..', 'assets', 'imagenes');
const conFondo1024 = marca(1024, true);
const transparente1024 = marca(1024, false);

guardaPNG(path.join(raiz, 'icono.png'), 1024, conFondo1024);
guardaPNG(path.join(raiz, 'splash.png'), 512, marca(512, false));
guardaPNG(path.join(raiz, 'favicon.png'), 96, marca(96, true));
guardaPNG(
  path.join(raiz, 'icono-adaptativo.png'),
  1024,
  conMargen(1024, transparente1024, 1024, 0.62),
);
guardaPNG(path.join(raiz, 'icono-fondo.png'), 1024, liso(1024, FONDO));
guardaPNG(
  path.join(raiz, 'icono-monocromo.png'),
  1024,
  conMargen(1024, marca(1024, false), 1024, 0.62),
);
