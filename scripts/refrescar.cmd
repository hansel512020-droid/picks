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
REM SofaScore por red va con --sofascore-red a proposito. En importar.js paso a
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
node --max-old-space-size=4096 scripts\importar.js --refrescar --importantes --detalles 90 --sofascore-red >> scripts\refrescar.log 2>&1
echo Importar: %ERRORLEVEL% >> scripts\refrescar.log

REM Sube el archivo recortado a Supabase Storage para que los telefonos
REM descarguen la version nueva. Necesita SUPABASE_SERVICE_ROLE_KEY en
REM el entorno o en .env.local.
node scripts\publicar-datos.js >> scripts\refrescar.log 2>&1
echo Publicar: %ERRORLEVEL% >> scripts\refrescar.log

REM Una vez por semana, borra de .cache-datos lo que ya no se usa. Sin esto la
REM cache llego a 8 GB. Ver scripts\limpiar-cache.js.
node scripts\limpiar-cache.js >> scripts\refrescar.log 2>&1

REM Copia de seguridad de lo que no se puede regenerar: quien pago, hasta
REM cuando tiene acceso y que guardo. El plan gratuito de Supabase no hace
REM copias, asi que si una fila se pierde no hay a donde volver.
REM Va al final a proposito: si falla, los datos ya estan publicados.
node scripts\respaldo.js >> scripts\refrescar.log 2>&1
echo Respaldo: %ERRORLEVEL% >> scripts\refrescar.log
