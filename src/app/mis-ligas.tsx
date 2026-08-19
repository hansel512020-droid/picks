import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Pulsable, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras } from '@/componentes/navegacion';
import { competicionesVisibles, TODAS } from '@/datos/competiciones';
import { eligeCompeticiones } from '@/datos/cuenta';
import { useDerechos } from '@/estado/derechos';
import { useSesion } from '@/estado/sesion';
import { C, E, R } from '@/tema';

/**
 * Elegir las competiciones de un plan parcial ("2 ligas", "3 ligas").
 *
 * Los planes parciales no conceden ligas al pagar: conceden huecos. Aquí es
 * donde el usuario decide cuáles quiere, y puede volver a cambiarlas.
 *
 * Cuántas caben lo dice el servidor —`huecos` sale de la tabla `derechos`—, no
 * esta pantalla: aquí solo se impide pasarse para no hacer perder el tiempo,
 * pero quien decide de verdad es `paypal-elige`.
 */
export default function MisLigas() {
  const insets = useSafeAreaInsets();
  const { sesion } = useSesion();
  const { huecos, libres, refresca } = useDerechos();

  /*
   * Si ya hay ligas guardadas, la elección de este periodo está hecha y no se
   * puede rehacer: cambiarlas cada día equivaldría a tener todas las
   * competiciones por el precio de dos. El servidor lo rechaza igualmente; aquí
   * se enseña bloqueado para no dejar tocar algo que va a fallar.
   */
  const yaElegido = [...libres].filter((c) => c !== '*').length > 0;

  // Se parte de lo que ya tiene elegido: cambiar una liga no debería obligar a
  // marcar las otras otra vez.
  const yaElegidas = useMemo(
    () => [...libres].filter((c) => c !== '*'),
    [libres],
  );
  const [elegidas, setElegidas] = useState<string[]>(yaElegidas);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Solo competiciones de verdad y de pago.
   *
   * Fuera "Todas", que en el catálogo figura como una más pero es el filtro de
   * la app entera: gastar un hueco en ella no significaría nada, y encima se
   * parecería demasiado a comprar el plan completo por $5.99.
   *
   * Y fuera las gratuitas: ya se ven sin pagar, así que ocupar con una de
   * ellas uno de los dos huecos sería tirar la mitad del plan.
   */
  const disponibles = useMemo(
    () => competicionesVisibles().filter((c) => c.id !== TODAS && !c.gratis),
    [],
  );
  const completo = elegidas.length >= huecos;
  /** Las que le quedan por elegir. Con cero, ya puede guardar. */
  const faltan = huecos - elegidas.length;

  const alterna = (id: string) => {
    if (yaElegido) return;
    setError(null);
    setElegidas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // No se deja pasar del tope: el botón diría que sí y el servidor que no.
      if (prev.length >= huecos) return prev;
      return [...prev, id];
    });
  };

  const guarda = async () => {
    /*
     * No se guarda con huecos sin usar.
     *
     * Antes bastaba con marcar una para poder salir, y quien compraba tres
     * ligas se iba con dos: había pagado un hueco que se quedaba vacío, y nada
     * en la pantalla le avisaba de que le faltaba una por elegir.
     */
    if (!sesion || guardando || elegidas.length !== huecos) return;
    setGuardando(true);
    const r = await eligeCompeticiones(sesion.token, elegidas);
    setGuardando(false);

    if (!r.ok) {
      setError(r.error ?? 'No se pudo guardar.');
      return;
    }
    // Se releen los derechos antes de salir, o el usuario vuelve a una pantalla
    // que todavía enseña los candados de las ligas que acaba de elegir.
    await refresca();
    // Al terminar de elegir, directo al Inicio, que es donde se ven las ligas
    // recién desbloqueadas. Replace para no dejar esta pantalla en el historial.
    router.replace('/');
  };

  if (!huecos) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
        <CabeceraAtras titulo="Mis ligas" />
        <Vacio
          icono="candado"
          titulo="No tienes un plan de ligas a elegir"
          detalle="Los planes de 2 y 3 ligas te dejan escoger cuáles quieres ver."
        />
        <View style={{ paddingHorizontal: E.lg }}>
          <Boton ancho texto="Ver los planes" onPress={() => router.push('/pro')} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras
        titulo="Mis ligas"
        subtitulo={`Elige ${huecos} ${huecos === 1 ? 'competición' : 'competiciones'}`}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.sm }}>
        <View style={{ paddingHorizontal: E.lg }}>
          <Txt v="pequeno" color={yaElegido ? C.texto2 : faltan > 0 ? C.ambar : C.texto2}>
            {yaElegido
              ? `Estas son tus ${huecos} competiciones. Podrás cambiarlas en la próxima renovación.`
              : faltan > 0
              ? `Llevas ${elegidas.length} de ${huecos}. Te ${faltan === 1 ? 'queda' : 'quedan'} ${faltan} por elegir: ya ${faltan === 1 ? 'la has' : 'las has'} pagado.`
              : `Tus ${huecos} competiciones. Puedes cambiarlas cuando quieras.`}
          </Txt>
        </View>

        {/*
          Salida hacia el plan completo.

          Quien ha comprado dos ligas y se encuentra eligiendo entre treinta y
          seis es justo a quien le interesa el plan de todas. Va arriba, donde
          se nota el límite, y no escondido al final de la lista.
        */}
        <Pulsable onPress={() => router.push('/pro')} style={{ paddingHorizontal: E.lg }}>
          <Tarjeta
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: E.md,
              padding: E.md,
              backgroundColor: C.limaTenue,
              borderColor: C.lima,
              borderWidth: 1,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="pequenoFuerte" color={C.lima}>
                ¿Las quieres todas?
              </Txt>
              <Txt v="mini" color={C.texto2}>
                Cambia al plan completo y deja de elegir.
              </Txt>
            </View>
            <Icono nombre="flechaDerecha" tam={15} color={C.lima} />
          </Tarjeta>
        </Pulsable>

        <View style={{ paddingHorizontal: E.lg, gap: E.xs }}>
          {disponibles.map((c) => {
            const marcada = elegidas.includes(c.id);
            // Las que no caben se ven apagadas en vez de desaparecer: así se
            // entiende que hay que soltar una para coger otra.
            const bloqueada = !marcada && completo;
            return (
              <Pulsable key={c.id} onPress={() => alterna(c.id)}>
                <Tarjeta
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: E.md,
                    padding: E.md,
                    opacity: bloqueada ? 0.4 : 1,
                    borderColor: marcada ? C.lima : C.borde,
                    borderWidth: 1.5,
                    backgroundColor: marcada ? C.limaTenue : C.carta,
                  }}
                >
                  <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={26} cuadrado />
                  <View style={{ flex: 1 }}>
                    <Txt v="cuerpo">{c.nombre}</Txt>
                    <Txt v="mini" color={C.texto3}>
                      {c.pais}
                    </Txt>
                  </View>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: marcada ? C.lima : C.borde,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {marcada ? <Icono nombre="check" tam={12} color={C.lima} grosor={3} /> : null}
                  </View>
                </Tarjeta>
              </Pulsable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: E.lg,
          paddingBottom: insets.bottom + E.md,
          paddingTop: E.sm,
          gap: E.xs,
          backgroundColor: C.fondo,
        }}
      >
        {error ? (
          <Txt v="pequeno" color={C.rojo} style={{ textAlign: 'center' }}>
            {error}
          </Txt>
        ) : null}
        {/*
          El botón dice cuántas faltan en vez de un "Guardar" apagado sin
          explicación: si está deshabilitado, hay que decir por qué.
        */}
        <Boton
          ancho
          texto={
            guardando
              ? 'Guardando…'
              : faltan > 0
                ? `Elige ${faltan} ${faltan === 1 ? 'competición más' : 'competiciones más'}`
                : `Guardar mis ${huecos} ligas`
          }
          deshabilitado={faltan > 0 || guardando}
          onPress={guarda}
        />
      </View>
    </View>
  );
}
