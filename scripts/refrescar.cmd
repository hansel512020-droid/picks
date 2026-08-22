@echo off
REM Refresco automatico de los datos de Scout Picks.
REM
REM Vuelve a pedir a ESPN el calendario, los resultados y las cuotas de las
REM competiciones importantes, y deja el resultado en src/datos/importado.json.
REM Lo lanza la tarea programada "ScoutPicksDatos" cada hora; tambien se puede
REM ejecutar a mano haciendo doble clic.
REM
REM El registro de cada pasada queda en scripts\refrescar.log.
REM
REM Dos detalles que costaron una ejecucion muerta (0x8007042B):
REM   · el archivo pasa de 28 MB, y Node necesita mas monton del que reserva
REM     por defecto para leerlo, modificarlo y volver a escribirlo;
REM   · si ya hay otra importacion en marcha, el propio importar.js se planta
REM     por el cerrojo en vez de pisar el archivo a medio escribir.

REM Acentos legibles en el registro.
chcp 65001 > nul

cd /d "%~dp0.."

echo. >> scripts\refrescar.log
echo ===== %DATE% %TIME% ===== >> scripts\refrescar.log
REM 90 partidos con detalle por competicion, no 12.
REM
REM Los registros de jugador solo salen de los partidos cuyo detalle se baja de
REM ESPN. Con 12 por liga, repartidos entre veintitantos equipos, cada jugador
REM aparecia menos de una vez: ninguno llegaba a los 6 partidos que pide el
REM modelo y la app no ensenaba NI UN pick de jugador. Con 90 son unos ocho por
REM equipo y los titulares pasan el corte.
node --max-old-space-size=4096 scripts\importar.js --refrescar --detalles 90 >> scripts\refrescar.log 2>&1
echo Importar: %ERRORLEVEL% >> scripts\refrescar.log

REM Sube el archivo recortado a Supabase Storage para que los telefonos
REM descarguen la version nueva. Necesita SUPABASE_SERVICE_ROLE_KEY en
REM el entorno o en .env.local.
node scripts\publicar-datos.js >> scripts\refrescar.log 2>&1
echo Publicar: %ERRORLEVEL% >> scripts\refrescar.log
