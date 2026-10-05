@echo off
REM Refresco automatico de los datos de Scout Picks.
REM
REM Vuelve a pedir el calendario, los resultados y las cuotas de las
REM competiciones importantes, y deja el resultado en src/datos/importado.json.
REM Lo lanza la tarea programada "ScoutPicksDatos" cada hora; tambien se puede
REM ejecutar a mano haciendo doble clic.
REM
REM Baja las dos fuentes, no solo ESPN: ESPN pone el calendario, el estado en
REM vivo y las cuotas, y SofaScore pone las estadisticas —xG medido y la linea
REM completa de cada jugador—, que es de donde salen los pronosticos.
REM
REM ── SofaScore, apagado desde el 2026-09-30 ──────────────────────────────
REM
REM Se quita el --sofascore-red: los datos salen solo de ESPN. Motivo: SofaScore
REM lleva dos semanas de bloqueos —primero rechazando la huella de Chrome, y hoy
REM devolviendo 403 "Forbidden" a las tres huellas desde esta conexion— y eso
REM hacia que la calidad de los datos cambiara de una pasada a otra: unas ligas
REM con xG medido y otras sin el, sin saber cual te toca. Para un producto que
REM se cobra, esa loteria es peor que no tenerlo.
REM
REM Lo que cuesta, medido sobre 1.732 picks publicados: 219 (el 12,6%) son de
REM pases completados y entradas, que ESPN no da por jugador. Esos dejan de
REM salir. Tambien se pierde el xG medido, que pasa a ser el estimado a partir
REM del marcador y los remates.
REM
REM No se borra nada: el codigo sigue entero y vuelve con añadir el flag. Antes
REM de volver a encenderlo, comprobar con `node scripts/probar-sofascore.js`.
REM
REM El texto de abajo describe como funcionaba y se deja por si se reactiva.
REM SofaScore por red iba con --sofascore-red. En importar.js paso a
REM ser opcional el 31 de agosto de 2026 (un bloqueo colgo el bot diez horas), y
REM como este archivo no se toco, el bot siguio corriendo solo con ESPN sin que
REM nadie lo notara. Aqui si se quiere: es el PC el que publica los datos
REM completos, y GitHub solo le cubre si este PC lleva horas sin publicar.
REM
REM El registro de cada pasada queda en scripts\refrescar.log.
REM
REM La PRIMERA pasada con SofaScore es larga: son tres peticiones por partido y
REM van con freno para que no nos bloqueen, asi que el catalogo entero puede
REM pasar de la hora. No rompe nada —lo de un partido terminado se guarda en
REM cache para siempre y las pasadas siguientes van sobre todo de cache—, y si
REM la tarea vuelve a saltar antes de que termine, la segunda se planta sola por
REM el cerrojo en vez de pisar el archivo.
REM
REM Dos detalles que costaron una ejecucion muerta (0x8007042B):
REM   · el archivo pasa de 28 MB, y Node necesita mas monton del que reserva
REM     por defecto para leerlo, modificarlo y volver a escribirlo;
REM   · si ya hay otra importacion en marcha, el propio importar.js se planta
REM     por el cerrojo en vez de pisar el archivo a medio escribir.

REM Acentos legibles en el registro.
chcp 65001 > nul

cd /d "%~dp0.."

REM Rotar el registro antes de abrirlo.
REM
REM Crecia sin fin: el 5 de octubre llevaba 36.885 lineas y 1,8 MB, con pasadas
REM de tres semanas atras que ya no le importan a nadie. Tiene que ir AQUI y no
REM en la limpieza semanal, porque a partir de la linea siguiente el archivo
REM queda abierto por los ">>" hasta que termina el .cmd y ya no se puede tocar.
REM
REM Al pasar de 2 MB se guarda como refrescar.1.log y se empieza uno nuevo: asi
REM siempre quedan la pasada de ahora y el historial inmediato, que es lo que se
REM mira cuando algo falla.
if exist scripts\refrescar.log (
  for %%A in (scripts\refrescar.log) do if %%~zA GTR 2000000 move /y scripts\refrescar.log scripts\refrescar.1.log > nul
)

echo. >> scripts\refrescar.log
echo ===== %DATE% %TIME% ===== >> scripts\refrescar.log
REM 90 partidos con detalle por competicion, no 12.
REM
REM Los registros de jugador solo salen de los partidos cuyo detalle se baja de
REM ESPN. Con 12 por liga, repartidos entre veintitantos equipos, cada jugador
REM aparecia menos de una vez: ninguno llegaba a los 6 partidos que pide el
REM modelo y la app no ensenaba NI UN pick de jugador. Con 90 son unos ocho por
REM equipo y los titulares pasan el corte.
REM
REM --importantes va escrito aunque --refrescar ya elija esa misma lista cuando
REM no se le nombra ninguna liga. Se pone a proposito: asi el .cmd dice cual es
REM el catalogo que refresca sin que haya que ir a leer argumentos() en
REM importar.js, y si algun dia se le anade un --liga delante, sigue entrando
REM el catalogo entero y no una sola competicion.
node --max-old-space-size=4096 scripts\importar.js --refrescar --importantes --detalles 90 >> scripts\refrescar.log 2>&1
set IMPORTAR=%ERRORLEVEL%
echo Importar: %IMPORTAR% >> scripts\refrescar.log

REM 75 significa "ya hay otra importacion en marcha" (ver el cerrojo en
REM importar.js). No es un fallo, pero seguir seria peor que uno: publicariamos
REM el archivo que la otra pasada esta escribiendo ahora mismo. Se sale sin
REM tocar nada y que termine ella.
if "%IMPORTAR%"=="75" (
  echo Otra importacion tiene el cerrojo: no se publica nada. >> scripts\refrescar.log
  goto :fin
)

REM Sube el archivo recortado a Supabase Storage para que los telefonos
REM descarguen la version nueva. Necesita SUPABASE_SERVICE_ROLE_KEY en
REM el entorno o en .env.local.
node scripts\publicar-datos.js >> scripts\refrescar.log 2>&1
echo Publicar: %ERRORLEVEL% >> scripts\refrescar.log

REM Y los picks ya cocinados, uno por fila en la base de datos.
REM
REM Es lo que hace que un pick de pago no salga del servidor: el permiso de la
REM tabla mira los derechos del usuario y le entrega solo lo suyo. Hasta ahora
REM los calculaba el telefono a partir del archivo de datos, que cualquiera con
REM cuenta puede bajarse. Ver scripts\publicar-picks.ts y supabase\picks.sql.
REM
REM El motor es TypeScript y vive en src\, asi que se compila antes con esbuild
REM a una carpeta temporal. Tarda unos segundos y no toca nada de la app.
call npx esbuild scripts\publicar-picks.ts --bundle --platform=node --format=cjs --tsconfig=tsconfig.json --outfile=node_modules\.cache\publicar-picks.cjs --log-level=error >> scripts\refrescar.log 2>&1
node --max-old-space-size=4096 node_modules\.cache\publicar-picks.cjs >> scripts\refrescar.log 2>&1
echo Picks: %ERRORLEVEL% >> scripts\refrescar.log

REM Una vez por semana, borra de .cache-datos lo que ya no se usa. Sin esto la
REM cache llego a 8 GB. Ver scripts\limpiar-cache.js.
node scripts\limpiar-cache.js >> scripts\refrescar.log 2>&1

REM Copia de seguridad de lo que no se puede regenerar: quien pago, hasta
REM cuando tiene acceso y que guardo. El plan gratuito de Supabase no hace
REM copias, asi que si una fila se pierde no hay a donde volver.
REM Va al final a proposito: si falla, los datos ya estan publicados.
node scripts\respaldo.js >> scripts\refrescar.log 2>&1
echo Respaldo: %ERRORLEVEL% >> scripts\refrescar.log

:fin
