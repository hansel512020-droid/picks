/**
 * Bancos de nombres por region. Sirven para dos cosas: completar las
 * plantillas hasta los 20 jugadores y poblar las ligas que no tienen clubes
 * escritos a mano. Nunca sustituyen a un jugador real: solo rellenan huecos.
 */

type Banco = { pila: string[]; apellidos: string[] };

const BANCOS: Record<string, Banco> = {
  es: {
    pila: 'Adrián,Álvaro,Andrés,Aitor,Borja,Carlos,Diego,Eduardo,Fernando,Gonzalo,Héctor,Iván,Javier,Jorge,Juan,Luis,Manuel,Marcos,Mario,Miguel,Nacho,Óscar,Pablo,Pedro,Raúl,Rubén,Sergio,Unai,Víctor,Xabi'.split(','),
    apellidos: 'Alonso,Arias,Bermejo,Blanco,Cabrera,Campos,Castro,Delgado,Duarte,Escudero,Fuentes,Gallego,Garrido,Gil,Herrera,Ibáñez,Jiménez,Lara,Lozano,Marín,Medina,Mora,Navarro,Nieto,Olmo,Ortega,Pardo,Quintana,Rivas,Rueda,Salas,Sanz,Serrano,Tejada,Vega,Vidal,Zamora'.split(','),
  },
  pt: {
    pila: 'André,Bruno,Carlos,Diogo,Eduardo,Fábio,Gonçalo,Hugo,Ivo,João,José,Leandro,Luís,Marco,Miguel,Nuno,Paulo,Pedro,Rafael,Ricardo,Rodrigo,Rúben,Sérgio,Tiago,Vítor'.split(','),
    apellidos: 'Almeida,Barbosa,Cardoso,Carvalho,Costa,Cunha,Dias,Faria,Fernandes,Ferreira,Gomes,Lopes,Machado,Marques,Martins,Mendes,Moreira,Neves,Nogueira,Oliveira,Pereira,Pinto,Ramos,Ribeiro,Rocha,Santos,Silva,Sousa,Teixeira,Vieira'.split(','),
  },
  en: {
    pila: 'Adam,Alex,Ben,Callum,Charlie,Connor,Daniel,Dean,Ethan,George,Harry,Jack,James,Jamie,Joe,Josh,Kyle,Leo,Liam,Lewis,Luke,Mason,Nathan,Oliver,Owen,Ryan,Sam,Scott,Tom,Will'.split(','),
    apellidos: 'Adams,Bailey,Barnes,Bennett,Bishop,Brooks,Carter,Clarke,Cole,Cooper,Cox,Dawson,Edwards,Ellis,Fisher,Foster,Gibson,Graham,Hall,Harper,Hayes,Hudson,Hughes,Kelly,Lloyd,Marsh,Mills,Morgan,Newton,Owen,Palmer,Parker,Reid,Roberts,Shaw,Turner,Walsh,Ward,Watson,Webb'.split(','),
  },
  de: {
    pila: 'Andreas,Benedikt,Christian,Daniel,David,Dominik,Fabian,Felix,Florian,Jan,Jannik,Jonas,Julian,Kevin,Lars,Leon,Lukas,Marcel,Marco,Mark,Maximilian,Moritz,Nico,Niklas,Patrick,Philipp,Robin,Simon,Sven,Tim,Tobias'.split(','),
    apellidos: 'Bauer,Becker,Berger,Braun,Brandt,Busch,Engel,Fischer,Frank,Franke,Gross,Haas,Hahn,Hartmann,Herrmann,Huber,Jung,Kaiser,Keller,Klein,Koch,König,Krause,Kruger,Lang,Lehmann,Lorenz,Maier,Meyer,Müller,Neumann,Peters,Richter,Schmidt,Schneider,Schulz,Seidel,Vogel,Wagner,Walter,Weber,Winter,Wolf,Zimmermann'.split(','),
  },
  fr: {
    pila: 'Alexandre,Antoine,Baptiste,Clément,Cyril,Damien,Enzo,Étienne,Florian,Gaël,Hugo,Jérémy,Julien,Kévin,Loïc,Lucas,Mathieu,Maxime,Nicolas,Quentin,Rémi,Romain,Samuel,Thibaut,Thomas,Valentin,Vincent,Yann'.split(','),
    apellidos: 'Bernard,Blanc,Bonnet,Boyer,Caron,Chevalier,Colin,David,Denis,Dubois,Dupont,Durand,Faure,Fontaine,Garnier,Gauthier,Girard,Guerin,Henry,Jacquet,Lambert,Laurent,Leclerc,Lefebvre,Legrand,Marchand,Martin,Mercier,Moreau,Morel,Muller,Perrin,Petit,Renard,Robin,Rousseau,Roux,Simon,Thomas,Vidal'.split(','),
  },
  it: {
    pila: 'Alessandro,Andrea,Antonio,Christian,Daniele,Davide,Edoardo,Emanuele,Fabio,Federico,Filippo,Francesco,Gabriele,Giacomo,Giovanni,Leonardo,Lorenzo,Luca,Marco,Matteo,Michele,Nicola,Pietro,Riccardo,Simone,Stefano,Tommaso,Vincenzo'.split(','),
    apellidos: 'Barbieri,Bellini,Benedetti,Bianchi,Bruno,Caputo,Colombo,Conti,Costa,De Luca,Esposito,Ferrari,Ferraro,Fontana,Galli,Gallo,Gatti,Giordano,Greco,Leone,Lombardi,Longo,Mancini,Marchetti,Marini,Martini,Mazza,Messina,Monti,Moretti,Neri,Palumbo,Parisi,Pellegrini,Riva,Rizzo,Romano,Russo,Sala,Santoro,Serra,Testa,Vitale'.split(','),
  },
  nl: {
    pila: 'Bas,Bram,Daan,Dylan,Finn,Jasper,Jesse,Job,Joris,Kevin,Lars,Lucas,Luuk,Mats,Maurits,Milan,Niels,Rick,Rody,Ruben,Sem,Sven,Thijs,Thomas,Tim,Wesley'.split(','),
    apellidos: 'Bakker,Bos,Brouwer,Dekker,Dijkstra,De Boer,De Groot,De Jong,De Vries,Hendriks,Jansen,Janssen,Kok,Kuipers,Meijer,Mulder,Peters,Post,Prins,Sanders,Schouten,Smit,Timmermans,Van Dam,Van Dijk,Van Leeuwen,Verhoeven,Visser,Vos,Willems'.split(','),
  },
  br: {
    pila: 'Alan,Alex,Bruno,Caio,Carlos,Danilo,Douglas,Eduardo,Emerson,Everton,Fabinho,Felipe,Gabriel,Gustavo,Igor,João,Lucas,Luiz,Marcelo,Matheus,Murilo,Otávio,Paulo,Rafael,Renato,Rodrigo,Thiago,Vinícius,Wesley'.split(','),
    apellidos: 'Alves,Andrade,Araújo,Barbosa,Batista,Cardoso,Carvalho,Correia,Costa,Dias,Duarte,Fernandes,Ferreira,Freitas,Gomes,Lima,Lopes,Machado,Martins,Melo,Mendes,Moreira,Nascimento,Nunes,Oliveira,Pereira,Pinto,Ramos,Ribeiro,Rocha,Rodrigues,Santos,Silva,Souza,Teixeira,Vieira'.split(','),
  },
  ar: {
    pila: 'Agustín,Alejandro,Bruno,Cristian,Diego,Emiliano,Enzo,Ezequiel,Facundo,Federico,Franco,Gastón,Gonzalo,Ignacio,Joaquín,Julián,Kevin,Lautaro,Leandro,Lucas,马,Matías,Maximiliano,Nicolás,Ramiro,Rodrigo,Santiago,Tomás,Valentín'.split(',').filter((n) => /^[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(n)),
    apellidos: 'Acosta,Aguirre,Álvarez,Benítez,Cabrera,Cáceres,Carrizo,Coronel,Domínguez,Duarte,Escobar,Fernández,Figueroa,Gallardo,Giménez,Godoy,Gómez,González,Herrera,Ibarra,Juárez,Ledesma,Luna,Maidana,Medina,Molina,Ojeda,Ortiz,Paz,Peralta,Quiroga,Ramírez,Rojas,Romero,Sosa,Suárez,Vera,Villalba'.split(','),
  },
  tr: {
    pila: 'Ahmet,Ali,Arda,Baris,Berkan,Burak,Cengiz,Emre,Enes,Ferdi,Furkan,Halil,Hakan,Ilkay,Kaan,Kerem,Mehmet,Mert,Murat,Mustafa,Okan,Orkun,Ozan,Serdar,Taylan,Umut,Yusuf,Zeki'.split(','),
    apellidos: 'Akbulut,Aksoy,Altun,Arslan,Aydın,Bilgin,Çakır,Çelik,Demir,Doğan,Erdem,Ersoy,Güler,Kaplan,Kara,Karaca,Kaya,Keskin,Koç,Korkmaz,Öz,Özdemir,Özkan,Polat,Şahin,Şimşek,Tekin,Toprak,Turan,Yalçın,Yıldırım,Yıldız,Yılmaz'.split(','),
  },
  jp: {
    pila: 'Akira,Daichi,Daiki,Haruto,Hiroki,Kaito,Kenta,Koji,Kota,Ren,Riku,Ryo,Ryota,Shota,Sota,Takumi,Taro,Yuki,Yuto,Yusuke'.split(','),
    apellidos: 'Abe,Endo,Fujita,Hashimoto,Hayashi,Ikeda,Inoue,Ishikawa,Ito,Kato,Kimura,Kobayashi,Kondo,Matsuda,Mori,Nakamura,Ogawa,Okada,Saito,Sakamoto,Sasaki,Sato,Shimizu,Suzuki,Takahashi,Tanaka,Watanabe,Yamada,Yamamoto,Yoshida'.split(','),
  },
  ar_ab: {
    pila: 'Abdullah,Ahmed,Ali,Amine,Anas,Bilal,Fahad,Faisal,Hamza,Hassan,Ibrahim,Ismail,Karim,Khaled,Mahmoud,Mohamed,Mostafa,Nasser,Omar,Rachid,Saad,Salem,Sami,Tarek,Waleed,Yassine,Youssef,Ziad'.split(','),
    apellidos: 'Abdellaoui,Al-Ahmadi,Al-Dosari,Al-Ghamdi,Al-Harbi,Al-Otaibi,Al-Qahtani,Al-Shammari,Amrani,Bennani,Benali,Bouzid,Chakir,El Amrani,El Fassi,Gharbi,Haddad,Hamdi,Jaber,Kabbaj,Khalil,Mansour,Nasri,Rahmani,Saidi,Salhi,Tahiri,Zaidi,Ziani'.split(','),
  },
  scand: {
    pila: 'Adrian,Anders,Andreas,Elias,Emil,Erik,Filip,Fredrik,Gustav,Henrik,Isak,Jesper,Johan,Jonas,Kasper,Kristoffer,Lars,Magnus,Marcus,Martin,Mathias,Mikkel,Niklas,Oliver,Rasmus,Sander,Simon,Tobias,Viktor'.split(','),
    apellidos: 'Andersen,Andersson,Berg,Bergström,Christensen,Dahl,Eriksen,Eriksson,Hansen,Haugen,Hedlund,Holm,Iversen,Jakobsen,Jensen,Johansen,Johansson,Karlsson,Larsen,Larsson,Lindberg,Lund,Madsen,Nielsen,Nilsson,Olsen,Pedersen,Persson,Rasmussen,Sørensen,Strand,Svensson,Thomsen'.split(','),
  },
  este: {
    pila: 'Adam,Aleksandar,Andrej,Bartosz,Dawid,Filip,Ivan,Jakub,Jan,Kamil,Luka,Marek,Marko,Martin,Mateusz,Michal,Milan,Nikola,Ondrej,Patrik,Pavel,Petr,Piotr,Robert,Stefan,Tomas,Vojtech'.split(','),
    apellidos: 'Baric,Bartos,Cerny,Dvorak,Filipovic,Havel,Horak,Ilic,Jovanovic,Kaczmarek,Kovac,Kowalski,Kral,Krstic,Lewandowski,Marek,Mihajlovic,Nemec,Novak,Nowak,Pavlovic,Petrovic,Popovic,Prochazka,Sedlak,Sokolov,Stankovic,Svoboda,Tomic,Vukovic,Wojcik,Zielinski'.split(','),
  },
  africa: {
    pila: 'Abdoulaye,Aliou,Amadou,Bakary,Boubacar,Cheikh,Emeka,Ibrahima,Idrissa,Kwame,Lamine,Mamadou,Moussa,Ousmane,Papa,Samuel,Seydou,Sidi,Souleymane,Yaya'.split(','),
    apellidos: 'Adebayo,Bâ,Bakayoko,Camara,Cissé,Coulibaly,Diakité,Diallo,Diarra,Diop,Doumbia,Fofana,Gueye,Kamara,Keita,Konaté,Koné,Mensah,Ndiaye,Nkemelu,Obi,Okafor,Owusu,Sanogo,Sarr,Sow,Touré,Traoré'.split(','),
  },
};

/** A que banco de nombres tira cada competicion. */
const BANCO_POR_COMPETICION: Record<string, keyof typeof BANCOS> = {
  premier: 'en', championship: 'en', facup: 'en', carabao: 'en', escocia: 'en',
  laliga: 'es', copadelrey: 'es',
  seriea: 'it', coppa: 'it',
  bundesliga: 'de', dfbpokal: 'de', austria: 'de', suiza: 'de',
  ligue1: 'fr', coupefrance: 'fr', belgica: 'fr',
  eredivisie: 'nl',
  portugal: 'pt', brasileirao: 'br',
  argentina: 'ar', ligamx: 'es', mls: 'en', colombia: 'es', chile: 'es',
  peru: 'es', bolivia: 'es', ecuador: 'es', uruguay: 'es', paraguay: 'es',
  venezuela: 'es', libertadores: 'es', sudamericana: 'es', concachampions: 'es',
  turquia: 'tr', japon: 'jp', corea: 'jp', china: 'jp', australia: 'en',
  saudi: 'ar_ab', egipto: 'ar_ab', marruecos: 'ar_ab', sudafrica: 'africa',
  dinamarca: 'scand', noruega: 'scand', suecia: 'scand',
  polonia: 'este', chequia: 'este', croacia: 'este', serbia: 'este',
  rumania: 'este', ucrania: 'este', grecia: 'este',
  champions: 'en', europaleague: 'en', conference: 'en',
};

/**
 * En los torneos de selecciones el banco no lo marca la competicion sino el
 * pais: el banquillo de Cabo Verde no puede llamarse Mario Ibanez.
 */
const BANCO_POR_PAIS: Record<string, keyof typeof BANCOS> = {
  'México': 'es', 'Colombia': 'es', 'Paraguay': 'es', 'Argentina': 'ar', 'España': 'es',
  'Uruguay': 'es', 'Ecuador': 'es', 'Panamá': 'es', 'Bolivia': 'es', 'Honduras': 'es',
  'Brasil': 'br', 'Portugal': 'pt', 'Cabo Verde': 'pt',
  'Estados Unidos': 'en', 'Canadá': 'en', 'Escocia': 'en', 'Inglaterra': 'en',
  'Australia': 'en', 'Nueva Zelanda': 'en',
  'Francia': 'fr', 'Bélgica': 'fr', 'Haití': 'fr',
  'Alemania': 'de', 'Austria': 'de', 'Suiza': 'de',
  'Italia': 'it', 'Países Bajos': 'nl', 'Curazao': 'nl',
  'Turquía': 'tr', 'Japón': 'jp', 'Corea del Sur': 'jp',
  'Marruecos': 'ar_ab', 'Argelia': 'ar_ab', 'Túnez': 'ar_ab', 'Egipto': 'ar_ab',
  'Catar': 'ar_ab', 'Arabia Saudí': 'ar_ab', 'Irán': 'ar_ab', 'Jordania': 'ar_ab',
  'Noruega': 'scand',
  'Chequia': 'este', 'Croacia': 'este', 'Uzbekistán': 'este',
  'Sudáfrica': 'africa', 'Senegal': 'africa', 'Ghana': 'africa', 'Nigeria': 'africa',
  'Costa de Marfil': 'africa',
};

export function bancoDe(competicionId: string): Banco {
  return BANCOS[BANCO_POR_COMPETICION[competicionId] ?? 'es'];
}

/**
 * Nombre de jugador determinista. `pais` manda cuando se conoce; si no, se usa
 * el banco de la competicion.
 */
export function nombreJugador(competicionId: string, n: number, pais?: string): string {
  const clave = (pais && BANCO_POR_PAIS[pais]) ?? BANCO_POR_COMPETICION[competicionId] ?? 'es';
  const b = BANCOS[clave];
  const pila = b.pila[n % b.pila.length];
  const ape = b.apellidos[(n * 7 + 3) % b.apellidos.length];
  return `${pila} ${ape}`;
}

/** Nombres de club para las ligas que no tienen clubes escritos a mano. */
const PREFIJOS = ['FC', 'Athletic', 'Real', 'Sporting', 'Club', 'Unión', 'Atlético', 'CD', 'AC', 'SC'];
const CIUDADES: Record<string, string[]> = {
  saudi: ['Riad', 'Yeda', 'Dammam', 'Meca', 'Medina', 'Taif', 'Abha', 'Buraida', 'Jubail', 'Hail', 'Najran', 'Tabuk'],
  turquia: ['Estambul', 'Ankara', 'Esmirna', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Trabzon', 'Kayseri', 'Samsun', 'Gaziantep', 'Sivas'],
  belgica: ['Amberes', 'Gante', 'Lieja', 'Brujas', 'Charleroi', 'Genk', 'Lovaina', 'Mechelen', 'Kortrijk', 'Sint-Truiden', 'Westerlo', 'Dender'],
  escocia: ['Glasgow', 'Edimburgo', 'Aberdeen', 'Dundee', 'Motherwell', 'Kilmarnock', 'Paisley', 'Perth', 'Falkirk', 'Livingston', 'Hamilton', 'Inverness'],
  suiza: ['Zúrich', 'Basilea', 'Berna', 'Ginebra', 'Lausana', 'Lucerna', 'San Galo', 'Lugano', 'Sion', 'Winterthur', 'Thun', 'Yverdon'],
  austria: ['Viena', 'Graz', 'Linz', 'Salzburgo', 'Innsbruck', 'Klagenfurt', 'Wolfsberg', 'Altach', 'Ried', 'Hartberg', 'Tirol', 'Rapid'],
  grecia: ['Atenas', 'Salónica', 'El Pireo', 'Patras', 'Larisa', 'Volos', 'Ioánina', 'Heraclión', 'Serres', 'Lamia', 'Trípoli', 'Corfú'],
  dinamarca: ['Copenhague', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Silkeborg', 'Viborg', 'Horsens', 'Vejle', 'Sønderborg', 'Lyngby'],
  noruega: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bodø', 'Tromsø', 'Kristiansand', 'Drammen', 'Sarpsborg', 'Molde', 'Haugesund', 'Lillestrøm'],
  suecia: ['Estocolmo', 'Gotemburgo', 'Malmö', 'Uppsala', 'Norrköping', 'Helsingborg', 'Örebro', 'Västerås', 'Kalmar', 'Elfsborg', 'Sirius', 'Halmstad'],
  polonia: ['Varsovia', 'Cracovia', 'Poznan', 'Wroclaw', 'Gdansk', 'Lodz', 'Lublin', 'Szczecin', 'Katowice', 'Bialystok', 'Plock', 'Radom'],
  chequia: ['Praga', 'Brno', 'Ostrava', 'Plzen', 'Olomouc', 'Liberec', 'Hradec', 'Teplice', 'Jablonec', 'Zlin', 'Pardubice', 'Karvina'],
  croacia: ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Zadar', 'Pula', 'Varazdin', 'Sibenik', 'Slavonski', 'Koprivnica', 'Vukovar', 'Karlovac'],
  serbia: ['Belgrado', 'Novi Sad', 'Nis', 'Kragujevac', 'Subotica', 'Cacak', 'Zrenjanin', 'Pancevo', 'Kraljevo', 'Leskovac', 'Sabac', 'Vozdovac'],
  rumania: ['Bucarest', 'Cluj', 'Timisoara', 'Iasi', 'Constanza', 'Craiova', 'Brasov', 'Galati', 'Ploiesti', 'Arad', 'Sibiu', 'Botosani'],
  ucrania: ['Kiev', 'Lviv', 'Odesa', 'Járkov', 'Dnipró', 'Zaporiyia', 'Poltava', 'Vinnytsia', 'Chernihiv', 'Kryvyi Rih', 'Lutsk', 'Rivne'],
  japon: ['Tokio', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Kobe', 'Hiroshima', 'Fukuoka', 'Kioto', 'Kawasaki', 'Urawa', 'Kashima'],
  corea: ['Seúl', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Ulsan', 'Suwon', 'Jeonju', 'Pohang', 'Jeju', 'Gangwon'],
  australia: ['Sídney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaida', 'Newcastle', 'Wellington', 'Gold Coast', 'Canberra', 'Macarthur', 'Hobart', 'Darwin'],
  china: ['Shanghái', 'Pekín', 'Cantón', 'Shenzhen', 'Chengdu', 'Wuhan', 'Tianjin', 'Qingdao', 'Dalian', 'Henan', 'Zhejiang', 'Changchun'],
  egipto: ['El Cairo', 'Alejandría', 'Guiza', 'Port Said', 'Suez', 'Ismailía', 'Asuán', 'Luxor', 'Tanta', 'Mansura', 'Fayún', 'Damieta'],
  sudafrica: ['Johannesburgo', 'Ciudad del Cabo', 'Durban', 'Pretoria', 'Bloemfontein', 'Port Elizabeth', 'Polokwane', 'Nelspruit', 'Kimberley', 'Rustenburg', 'East London', 'Soweto'],
  marruecos: ['Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Tánger', 'Agadir', 'Mequinez', 'Oujda', 'Tetuán', 'Kenitra', 'Safi', 'Berkane'],
  venezuela: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Mérida', 'Puerto La Cruz', 'Ciudad Guayana', 'Barinas', 'Cumaná', 'Táchira', 'Monagas'],
  colombia: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Pereira', 'Manizales', 'Cúcuta', 'Ibagué', 'Santa Marta', 'Neiva', 'Pasto'],
  chile: ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'La Serena', 'Temuco', 'Iquique', 'Rancagua', 'Talca', 'Curicó', 'Coquimbo', 'Calama'],
  peru: ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Chiclayo', 'Piura', 'Huancayo', 'Iquitos', 'Tacna', 'Juliaca', 'Ayacucho', 'Cajamarca'],
  bolivia: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Trinidad', 'El Alto', 'Montero', 'Riberalta', 'Yacuiba'],
  ecuador: ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Manta', 'Machala', 'Portoviejo', 'Loja', 'Ibarra', 'Riobamba', 'Esmeraldas', 'Quevedo'],
  uruguay: ['Montevideo', 'Salto', 'Paysandú', 'Maldonado', 'Rivera', 'Tacuarembó', 'Melo', 'Durazno', 'Florida', 'Colonia', 'Mercedes', 'Minas'],
  paraguay: ['Asunción', 'Ciudad del Este', 'Encarnación', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Pedro Juan', 'Concepción', 'Villarrica', 'Coronel Oviedo', 'Itauguá'],
  championship: ['Leicester', 'Southampton', 'Norwich', 'Watford', 'Coventry', 'Middlesbrough', 'Bristol', 'Swansea', 'Cardiff', 'Preston', 'Millwall', 'Hull', 'Stoke', 'Derby', 'Blackburn', 'QPR', 'Sheffield', 'Portsmouth', 'Oxford', 'Luton'],
};

export function ciudadesDe(competicionId: string): string[] {
  return (
    CIUDADES[competicionId] ?? [
      'Norte', 'Sur', 'Este', 'Oeste', 'Central', 'Real', 'Nueva', 'Vieja',
      'Alta', 'Baja', 'Mayor', 'Menor',
    ]
  );
}

export function nombreClub(competicionId: string, n: number): { nombre: string; corto: string; ciudad: string } {
  const ciudades = ciudadesDe(competicionId);
  const ciudad = ciudades[n % ciudades.length];
  const prefijo = PREFIJOS[(n * 3) % PREFIJOS.length];
  const nombre = `${prefijo} ${ciudad}`;
  const corto = ciudad
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  return { nombre, corto, ciudad };
}
