# Scout Picks

App de iPhone de investigación estadística para fútbol, hecha con Expo y React Native.
Es una reconstrucción completa de la interfaz y de las funciones de *Scout Picks: Juega con datos*:
picks con ventaja estadística, análisis de partido, alineaciones, comunidad, rendimiento propio
y más de 60 competiciones.

---

## Cómo verla en tu iPhone

No hace falta Mac ni Xcode.

1. Instala **Expo Go** desde la App Store de tu iPhone.
2. En el ordenador, dentro de esta carpeta:

```bash
npm install
```

```bash
npm start
```

3. Aparece un código QR en la terminal. Escanéalo con la cámara del iPhone y se abre en Expo Go.
   El móvil y el ordenador tienen que estar en la misma red wifi.

También se puede abrir en el navegador para echar un vistazo rápido:

```bash
npm run web
```

Para generar un `.ipa` de verdad e instalarlo sin Expo Go hace falta una cuenta de desarrollador de
Apple y `eas build --platform ios`, que compila en la nube y no necesita Mac.

---

## Qué tiene la app

### Inicio
Carrusel de la competición con sus grupos (o sus equipos si es una liga), tira de partidos en
directo, chips de mercado (goles, tiros, córners, tarjetas, resultado, asistencias, pases, faltas,
defensa), ordenación por valor, ventaja, acierto, cuota o guardados, y la lista de picks
destacados.

### Tarjeta de pick
Sujeto con su bandera, contexto del partido, contador de guardados 🔥, argumento con el dato que lo
sostiene, fila de mercado con la cuota y el sello de la casa, y la tira de los últimos 10 partidos
en verde y rojo con el porcentaje y la ventaja.

### Partido
Marcador con posición en la tabla, minuto en vivo, sede y árbitro, y tres vistas:

- **Cuotas**: 1X2 en las 10 casas con el mejor precio resaltado, más de/menos de 2.5 y ambos marcan.
- **Insights**: pestañas de **Picks**, **Formaciones** (campo con el once, formación y banquillo) y
  **Lesiones** (bajas, dudas y sanciones).
- **Duelo**: comparativa cara a cara de las medias de los últimos 10 partidos.

### Jugador
Más de 30 métricas por partido agrupadas en ataque, creación, defensa y disciplina; filtros de
contexto (últimos 5, en casa, fuera, tras derrota, de titular); fuerza del emparejamiento con el
ranking defensivo del próximo rival; tabla de props línea a línea con su tasa de acierto; y el
registro completo partido a partido.

### Equipo
Forma con los últimos resultados, medias por partido con corte local/visitante, plantilla por
demarcación con goles y asistencias, y calendario con las cuotas.

### Comunidad
Los picks más guardados, con el contador de la llama y filtro por mercado.

### Rendimiento
Porcentaje de acierto, número de picks, retorno de inversión a una unidad por pick y el historial
en pestañas de todos, pendientes, ganados y perdidos. Los picks se resuelven solos leyendo el
resultado real del partido.

### Perfil
Casa de apuestas favorita (cambia las cuotas de toda la app), competición activa, ligas que sigues,
notificaciones, explicación del método y borrado de datos.

### Scout Pro
Pantalla de suscripción con los mismos planes del original: semanal, mensual y anual de todas las
ligas, packs de 2 y 3 ligas y el pase del Mundial. Con el plan gratuito se ven todos los picks de
las competiciones marcadas como gratis y los tres mejores del resto.

---

## Datos reales

La app arranca con datos generados, pero trae un importador que los sustituye por datos de verdad.

### De dónde sale cada cosa

| | Fuente | Clave |
|---|---|---|
| Calendario, en vivo, resultados | ESPN | no |
| Estadísticas de partido (tiros, córners, faltas, tarjetas, posesión) | ESPN | no |
| Estadísticas por jugador | ESPN | no |
| Escudos de equipo | ESPN | no |
| Cuotas 1X2 y más/menos 2.5 | ESPN (casas reales, formato americano → decimal) | no |
| Cuotas de 8 casas europeas | Football-Data.co.uk | no |
| Pases clave, regates, intercepciones, duelos | API-Football | sí, de pago |

**ESPN es la fuente principal.** Cubre 50 competiciones incluidas las que ninguna otra fuente
gratuita tiene: Champions, Europa League, Conference, Libertadores, Sudamericana, Copa del Rey,
Coppa Italia, DFB-Pokal, Coupe de France, FA Cup, Carabao, Concachampions y las ligas de Perú,
Ecuador, Colombia, Chile, Bolivia, Uruguay, Paraguay y Venezuela.

Lo que ESPN **no** trae por jugador: pases clave, regates, entradas, intercepciones y duelos. Esos
mercados no aparecen con datos reales.

```bash
node scripts/importar.js --listar
```

```bash
node scripts/importar.js --liga premier
```

Lo importado se guarda en `src/datos/importado.json` y la app lo usa automáticamente para esa
competición; las demás siguen con el modelo. En **Perfil › Origen de los datos** se ve cuál está en
cada modo.

### Sin ninguna clave (funciona ya)

Fuente: **Football-Data.co.uk**, descarga pública y gratuita. Cubre 25 competiciones: Premier,
LaLiga, Serie A, Bundesliga, Ligue 1, Championship, Eredivisie, Portugal, Bélgica, Turquía, Grecia,
Escocia, Liga MX, Brasileirão, Argentina, MLS, Japón, China, Suiza, Austria, Dinamarca, Noruega,
Suecia, Polonia y Rumanía.

Trae de verdad: resultados finales y al descanso, tiros, tiros a puerta, córners, faltas, tarjetas,
árbitro y **las cuotas reales** de Bet365, Pinnacle, William Hill, Betfair, Bwin, BetVictor, Paddy
Power y 1xBet. Las casas que esa fuente no publica se derivan de las que sí, y el partido guarda en
`cuotas.casasReales` cuáles son precios auténticos.

Con esto funcionan los picks de equipo y de partido: goles, córners, tarjetas, tiros, faltas y 1X2.

**Dos límites que conviene conocer.** Football-Data publica el calendario de la jornada siguiente
solo dos o tres días antes, así que entre semana su archivo de próximos partidos está caducado y el
importador lo descarta: si sale «0 por jugar», vuelve a lanzarlo más cerca del fin de semana. Y no
hay estadísticas por jugador en esta fuente, así que sin clave no salen props de jugador.

### Con clave de API-Football (props de jugador)

Copia `.env.ejemplo` como `.env` y pega tu clave de
[dashboard.api-football.com](https://dashboard.api-football.com/register):

```bash
node scripts/importar.js --liga premier --jugadores 40
```

Añade el calendario completo de próximos partidos, los jugadores, sus estadísticas partido a
partido (minutos, goles, asistencias, tiros, tiros a puerta, pases clave, regates, entradas,
intercepciones, duelos, faltas, tarjetas, paradas y nota) y también sirve para las competiciones que
Football-Data no cubre: Champions, Europa League, Libertadores, Sudamericana, Mundial, Copa
América, Colombia, Chile, Perú, Bolivia, Ecuador, Uruguay, Paraguay y las copas nacionales.

**El plan gratuito tiene dos topes serios:** solo abre las temporadas **2022 a 2024** y da **100
peticiones al día**. Como cada partido cuesta una petición, una temporada entera de una liga son
unas 380 peticiones, es decir cuatro días de cuota. El importador guarda en caché todo lo que baja,
así que puedes lanzarlo varios días seguidos y va acumulando sin repetir nada. Para la temporada en
curso hace falta un plan de pago.

Opciones útiles:

| Opción | Para qué |
|---|---|
| `--liga a,b,c` | varias competiciones de una vez |
| `--temporadas 2024-25,2025-26` | qué temporadas bajar |
| `--jugadores 40` | presupuesto de peticiones a API-Football |
| `--estadisticas` | tiros y córners en ligas que solo están en API-Football |
| `--forzar` | ignorar la caché y volver a descargar |

Una métrica se queda sin datos con fuentes reales: los **despejes** no los publica ninguna de las
dos, así que ese mercado no aparece.

## El contador de la comunidad

El número naranja de cada tarjeta —cuánta gente guardó ese pick— puede contar guardados de verdad
en cuanto tengas un proyecto de Supabase, que es gratis:

1. Crea el proyecto en [supabase.com](https://supabase.com).
2. Pega `supabase/esquema.sql` entero en su editor SQL y ejecútalo.
3. Copia la URL del proyecto y la clave **anon** en un `.env` en la raíz:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
```

Sin eso, la app funciona igual y el número lo estima el modelo a partir de la ventaja del pick y de
lo conocido que sea el jugador. En **Perfil › Contador de la comunidad** se ve cuál de los dos está
activo.

Cada móvil cuenta una vez por pick y puede deshacer su guardado. El identificador es anónimo y no
lleva ningún dato personal. La app nunca lee las filas sueltas, solo el recuento: las políticas del
esquema lo impiden.

## Los mercados

Solo salen mercados que las casas ofrecen de verdad, con sus líneas reales: tiros, tiros a puerta,
goles, asistencias, faltas cometidas y recibidas, entradas, pases completados, tarjeta y paradas del
portero. Y de equipo: goles, remates, remates a puerta, córners y tarjetas.

Quedaron fuera despejes, duelos ganados, intercepciones, toques en el área y minutos, porque
ninguna casa los cotiza. Las líneas siguen las que se publican: los pases van en 14.5, 24.5, 34.5…
y no de diez en diez.

## Escudos, logos y caras

```bash
node scripts/logos.js
```

Resuelve las imágenes y guarda **solo las direcciones** en `src/datos/logos.json`; las descarga el
móvil al vuelo y `expo-image` las deja en caché, así que el proyecto no engorda.

- **Logos de competición**: salen del CDN de API-Football por id de liga, sin necesidad de clave.
  Cobertura completa, las 60.
- **Escudos de equipo**: de TheSportsDB, buscando por nombre. Cada resultado se valida por deporte,
  país y parecido del nombre antes de darlo por bueno, porque colgarle a un equipo el escudo de otro
  es peor que no poner ninguno. Cobertura actual: 206 de 222 (93%).
- **Caras de jugador**: también de TheSportsDB, prefiriendo el recorte con fondo transparente. La
  cobertura es parcial: hay foto de las estrellas y de buena parte de los titulares, pero no de
  todos.

Donde no hay imagen, la app cae en lo de antes —la bandera del país o las siglas del club sobre su
color— así que nunca queda un hueco.

Opciones: `--solo competiciones|equipos|jugadores` para rehacer una sola parte, `--nivel 74` para
bajar el corte y buscar más caras, y `--todos` para intentarlo con toda la plantilla. TheSportsDB
limita el ritmo de peticiones; el script espera entre llamadas, reintenta con pausas crecientes y
guarda todo en caché, así que relanzarlo no repite trabajo.

## De dónde salen los datos generados

Mientras no importes nada, los datos se generan con un motor propio con **semilla fija**: la app
enseña los mismos números en cada arranque, no hace falta conexión y no depende de ninguna API.

1. `datos/selecciones.ts`, `datos/clubes-europa.ts` y `datos/clubes-america.ts` traen el núcleo real
   de cada plantilla (nombre, puesto, dorsal y nivel). El resto del equipo lo completa
   `datos/plantillas.ts` con el banco de nombres del país.
2. `datos/motor.ts` monta el calendario, reparte los goles con una Poisson calibrada por ataque,
   defensa y ventaja de campo, y genera la línea de estadísticas de cada jugador en cada partido
   repartiendo los totales del equipo según los ratios del jugador y sus minutos.
3. `datos/picks.ts` busca líneas que el sujeto viene batiendo (7 de los últimos 10 o mejor) y calcula
   su tasa de acierto real sobre esos registros.
4. `datos/mercado.ts` pone el precio: **la cuota no sale de la racha**, sale de la media de toda la
   temporada corregida hacia el patrón del puesto, que es como tarifica una casa. La diferencia
   entre las dos cosas es la ventaja que muestra la app.

`temporada()` en `datos/motor.ts` mira primero si hay datos importados para esa competición y solo
genera cuando no los hay, así que para enchufar otra fuente basta con escribir en el formato de
`datos/importado.json`, que sigue los tipos de `datos/tipos.ts`.

---

## Estructura

```
src/
  app/            pantallas (expo-router)
    (tabs)/       inicio, partidos, comunidad, rendimiento, perfil
    partido/      detalle de partido
    jugador/      ficha de jugador
    equipo/       ficha de equipo
    pick/         detalle del pick
    bienvenida    onboarding
    pro           suscripción
  componentes/    tarjeta de pick, campo, chips, iconos, marca
  datos/          catálogo, motor, picks, mercado, casas
  estado/         tienda con AsyncStorage
  tema/           colores, tipografía y espaciados
  utiles/         generador con semilla y carga diferida
scripts/
  icono.js        dibuja el icono, el splash y el favicon
  importar.js     descarga datos reales
  logos.js        resuelve escudos, logos y caras
  lib/            http con caché, Football-Data, API-Football, TheSportsDB
```

Comandos útiles:

```bash
npm run tipos
```

```bash
npm run icono
```

---

## Aviso

Scout Picks no es una casa de apuestas, no acepta depósitos ni ingresa nada de casas ni de
afiliados. El contenido es informativo. Solo para mayores de 18 años.
