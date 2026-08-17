/**
 * Las 48 selecciones del Mundial repartidas en 12 grupos, con el nucleo real
 * de cada plantilla. El resto del equipo lo completa `plantillas.ts` con el
 * banco de nombres del pais, porque los suplentes no salen en los picks.
 *
 * Formato de cada jugador: "Nombre|POSICION|dorsal|nivel"
 */

export interface FilaSeleccion {
  grupo: string;
  id: string;
  nombre: string;
  corto: string;
  bandera: string;
  pais: string;
  fuerza: number;
  ataque: number;
  defensa: number;
  color: string;
  jugadores: string[];
}

const j = (s: string) => s.split(';').map((x) => x.trim());

export const SELECCIONES: FilaSeleccion[] = [
  // ---------------------------------------------------------------- Grupo A
  {
    grupo: 'A', id: 'mex', nombre: 'México', corto: 'MEX', bandera: '🇲🇽', pais: 'México',
    fuerza: 74, ataque: 73, defensa: 72, color: '#0B6B3A',
    jugadores: j(`Guillermo Ochoa|POR|13|76; Jesús Gallardo|DEF|23|76; César Montes|DEF|3|77;
      Johan Vásquez|DEF|5|77; Edson Álvarez|MED|4|82; Luis Chávez|MED|14|78;
      Orbelín Pineda|MED|10|77; Hirving Lozano|DEL|22|80; Santiago Giménez|DEL|9|80;
      Raúl Jiménez|DEL|19|78; Alexis Vega|DEL|11|75; Julián Quiñones|DEL|7|75`),
  },
  {
    grupo: 'A', id: 'rsa', nombre: 'Sudáfrica', corto: 'RSA', bandera: '🇿🇦', pais: 'Sudáfrica',
    fuerza: 65, ataque: 63, defensa: 66, color: '#007A4D',
    jugadores: j(`Ronwen Williams|POR|1|74; Nyiko Mobbie|DEF|2|66; Mothobi Mvala|DEF|5|68;
      Siyanda Xulu|DEF|4|65; Teboho Mokoena|MED|8|72; Sphephelo Sithole|MED|6|68;
      Themba Zwane|MED|10|73; Percy Tau|DEL|11|73; Lyle Foster|DEL|9|72;
      Evidence Makgopa|DEL|19|67`),
  },
  {
    grupo: 'A', id: 'kor', nombre: 'Corea del Sur', corto: 'KOR', bandera: '🇰🇷', pais: 'Corea del Sur',
    fuerza: 73, ataque: 73, defensa: 71, color: '#C60C30',
    jugadores: j(`Kim Seung-gyu|POR|1|74; Kim Min-jae|DEF|4|84; Kim Young-gwon|DEF|19|74;
      Seol Young-woo|DEF|15|72; Hwang In-beom|MED|6|77; Lee Jae-sung|MED|7|76;
      Lee Kang-in|MED|18|81; Son Heung-min|DEL|7|85; Hwang Hee-chan|DEL|11|78;
      Oh Hyeon-gyu|DEL|9|72`),
  },
  {
    grupo: 'A', id: 'cze', nombre: 'Chequia', corto: 'CZE', bandera: '🇨🇿', pais: 'Chequia',
    fuerza: 71, ataque: 70, defensa: 71, color: '#11457E',
    jugadores: j(`Jindřich Staněk|POR|1|74; Vladimír Coufal|DEF|5|74; Tomáš Holeš|DEF|4|73;
      David Zima|DEF|3|72; Lukáš Provod|MED|20|74; Tomáš Souček|MED|8|79;
      Adam Hložek|MED|15|75; Patrik Schick|DEL|10|80; Mojmír Chytil|DEL|9|71;
      Václav Černý|DEL|7|74`),
  },
  // ---------------------------------------------------------------- Grupo B
  {
    grupo: 'B', id: 'can', nombre: 'Canadá', corto: 'CAN', bandera: '🇨🇦', pais: 'Canadá',
    fuerza: 72, ataque: 73, defensa: 70, color: '#D52B1E',
    jugadores: j(`Maxime Crépeau|POR|16|72; Alistair Johnston|DEF|2|76; Moïse Bombito|DEF|4|73;
      Derek Cornelius|DEF|13|72; Alphonso Davies|DEF|19|85; Stephen Eustáquio|MED|7|76;
      Ismaël Koné|MED|8|74; Tajon Buchanan|DEL|11|75; Jonathan David|DEL|20|82;
      Cyle Larin|DEL|17|74`),
  },
  {
    grupo: 'B', id: 'bel', nombre: 'Bélgica', corto: 'BEL', bandera: '🇧🇪', pais: 'Bélgica',
    fuerza: 83, ataque: 84, defensa: 80, color: '#C8102E',
    jugadores: j(`Koen Casteels|POR|1|79; Timothy Castagne|DEF|21|76; Wout Faes|DEF|4|75;
      Zeno Debast|DEF|3|75; Arthur Theate|DEF|5|75; Amadou Onana|MED|8|80;
      Youri Tielemans|MED|8|81; Kevin De Bruyne|MED|7|88; Jérémy Doku|DEL|11|83;
      Romelu Lukaku|DEL|9|84; Leandro Trossard|DEL|17|80; Charles De Ketelaere|DEL|14|78`),
  },
  {
    grupo: 'B', id: 'qat', nombre: 'Catar', corto: 'QAT', bandera: '🇶🇦', pais: 'Catar',
    fuerza: 63, ataque: 62, defensa: 63, color: '#8A1538',
    jugadores: j(`Meshaal Barsham|POR|22|68; Pedro Miguel|DEF|2|66; Boualem Khoukhi|DEF|15|67;
      Tarek Salman|DEF|3|65; Hassan Al-Haydos|MED|10|70; Karim Boudiaf|MED|16|67;
      Abdulaziz Hatem|MED|23|67; Akram Afif|DEL|11|75; Almoez Ali|DEL|19|72;
      Yusuf Abdurisag|DEL|17|66`),
  },
  {
    grupo: 'B', id: 'sui', nombre: 'Suiza', corto: 'SUI', bandera: '🇨🇭', pais: 'Suiza',
    fuerza: 77, ataque: 74, defensa: 78, color: '#D52B1E',
    jugadores: j(`Yann Sommer|POR|1|83; Ricardo Rodríguez|DEF|13|74; Manuel Akanji|DEF|5|83;
      Nico Elvedi|DEF|4|76; Silvan Widmer|DEF|2|74; Granit Xhaka|MED|10|84;
      Remo Freuler|MED|8|77; Xherdan Shaqiri|MED|23|76; Dan Ndoye|DEL|20|76;
      Breel Embolo|DEL|7|77; Zeki Amdouni|DEL|9|73`),
  },
  // ---------------------------------------------------------------- Grupo C
  {
    grupo: 'C', id: 'bra', nombre: 'Brasil', corto: 'BRA', bandera: '🇧🇷', pais: 'Brasil',
    fuerza: 90, ataque: 91, defensa: 86, color: '#009C3B',
    jugadores: j(`Alisson|POR|1|88; Danilo|DEF|2|78; Marquinhos|DEF|4|85;
      Gabriel Magalhães|DEF|3|84; Wesley|DEF|6|77; Bruno Guimarães|MED|5|84;
      André|MED|17|79; Lucas Paquetá|MED|10|82; Raphinha|DEL|11|86;
      Vinícius Jr|DEL|7|90; Rodrygo|DEL|21|84; Neymar Jr|DEL|10|86;
      Estêvão|DEL|19|81; Matheus Cunha|DEL|9|80`),
  },
  {
    grupo: 'C', id: 'mar', nombre: 'Marruecos', corto: 'MAR', bandera: '🇲🇦', pais: 'Marruecos',
    fuerza: 79, ataque: 78, defensa: 79, color: '#C1272D',
    jugadores: j(`Yassine Bounou|POR|1|82; Achraf Hakimi|DEF|2|85; Nayef Aguerd|DEF|5|78;
      Noussair Mazraoui|DEF|3|79; Romain Saïss|DEF|6|75; Sofyan Amrabat|MED|4|77;
      Azzedine Ounahi|MED|8|76; Ismael Saibari|MED|11|77; Hakim Ziyech|DEL|7|79;
      Brahim Díaz|DEL|10|82; Youssef En-Nesyri|DEL|19|78; Ayoub El Kaabi|DEL|9|76`),
  },
  {
    grupo: 'C', id: 'col', nombre: 'Colombia', corto: 'COL', bandera: '🇨🇴', pais: 'Colombia',
    fuerza: 80, ataque: 81, defensa: 78, color: '#FCD116',
    jugadores: j(`Camilo Vargas|POR|1|76; Daniel Muñoz|DEF|4|79; Yerry Mina|DEF|13|76;
      Dávinson Sánchez|DEF|23|78; Johan Mojica|DEF|17|75; Richard Ríos|MED|15|79;
      Jefferson Lerma|MED|16|77; James Rodríguez|MED|10|81; Luis Díaz|DEL|7|87;
      Jhon Durán|DEL|24|78; Rafael Santos Borré|DEL|19|75; Jhon Arias|DEL|11|78`),
  },
  {
    grupo: 'C', id: 'sco', nombre: 'Escocia', corto: 'SCO', bandera: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', pais: 'Escocia',
    fuerza: 70, ataque: 68, defensa: 71, color: '#005EB8',
    jugadores: j(`Angus Gunn|POR|1|72; Andrew Robertson|DEF|3|82; Kieran Tierney|DEF|6|76;
      Jack Hendry|DEF|5|72; Scott McTominay|MED|4|82; Billy Gilmour|MED|8|76;
      John McGinn|MED|7|79; Ryan Christie|MED|11|73; Ché Adams|DEL|10|74;
      Lyndon Dykes|DEL|9|70`),
  },
  // ---------------------------------------------------------------- Grupo D
  {
    grupo: 'D', id: 'usa', nombre: 'Estados Unidos', corto: 'USA', bandera: '🇺🇸', pais: 'Estados Unidos',
    fuerza: 75, ataque: 75, defensa: 73, color: '#0A3161',
    jugadores: j(`Matt Turner|POR|1|75; Sergiño Dest|DEF|2|78; Chris Richards|DEF|3|76;
      Tim Ream|DEF|13|73; Antonee Robinson|DEF|5|79; Tyler Adams|MED|4|78;
      Weston McKennie|MED|8|79; Yunus Musah|MED|6|76; Christian Pulisic|DEL|10|84;
      Timothy Weah|DEL|21|76; Folarin Balogun|DEL|9|78; Ricardo Pepi|DEL|16|75`),
  },
  {
    grupo: 'D', id: 'par', nombre: 'Paraguay', corto: 'PAR', bandera: '🇵🇾', pais: 'Paraguay',
    fuerza: 71, ataque: 69, defensa: 73, color: '#D52B1E',
    jugadores: j(`Roberto Fernández|POR|1|72; Gustavo Velázquez|DEF|4|71; Omar Alderete|DEF|6|75;
      Juan Cáceres|DEF|3|70; Andrés Cubas|MED|5|73; Damián Bobadilla|MED|8|71;
      Miguel Almirón|MED|10|78; Diego Gómez|MED|15|75; Julio Enciso|DEL|11|76;
      Antonio Sanabria|DEL|9|74; Ramón Sosa|DEL|7|74`),
  },
  {
    grupo: 'D', id: 'aus', nombre: 'Australia', corto: 'AUS', bandera: '🇦🇺', pais: 'Australia',
    fuerza: 68, ataque: 66, defensa: 69, color: '#00843D',
    jugadores: j(`Mathew Ryan|POR|1|75; Milos Degenek|DEF|2|69; Harry Souttar|DEF|19|72;
      Kye Rowles|DEF|5|70; Aziz Behich|DEF|16|71; Aiden O'Neill|MED|13|70;
      Jackson Irvine|MED|22|73; Riley McGree|MED|8|71; Martin Boyle|DEL|7|71;
      Mitchell Duke|DEL|15|68; Kusini Yengi|DEL|9|69`),
  },
  {
    grupo: 'D', id: 'tur', nombre: 'Turquía', corto: 'TUR', bandera: '🇹🇷', pais: 'Turquía',
    fuerza: 77, ataque: 78, defensa: 74, color: '#E30A17',
    jugadores: j(`Mert Günok|POR|1|74; Zeki Çelik|DEF|2|75; Merih Demiral|DEF|3|77;
      Abdülkerim Bardakcı|DEF|4|74; Ferdi Kadıoğlu|DEF|14|77; Hakan Çalhanoğlu|MED|10|85;
      Orkun Kökçü|MED|8|78; Arda Güler|MED|7|82; Kenan Yıldız|DEL|11|82;
      Barış Alper Yılmaz|DEL|9|76; Kerem Aktürkoğlu|DEL|17|77`),
  },
  // ---------------------------------------------------------------- Grupo E
  {
    grupo: 'E', id: 'arg', nombre: 'Argentina', corto: 'ARG', bandera: '🇦🇷', pais: 'Argentina',
    fuerza: 91, ataque: 90, defensa: 89, color: '#6CACE4',
    jugadores: j(`Emiliano Martínez|POR|23|87; Nahuel Molina|DEF|26|79; Cristian Romero|DEF|13|86;
      Nicolás Otamendi|DEF|19|80; Nicolás Tagliafico|DEF|3|79; Rodrigo De Paul|MED|7|82;
      Enzo Fernández|MED|24|85; Alexis Mac Allister|MED|20|86; Lionel Messi|DEL|10|89;
      Julián Álvarez|DEL|9|86; Lautaro Martínez|DEL|22|86; Ángel Di María|DEL|11|80;
      Franco Mastantuono|DEL|18|80; Giuliano Simeone|DEL|15|78`),
  },
  {
    grupo: 'E', id: 'alg', nombre: 'Argelia', corto: 'AGL', bandera: '🇩🇿', pais: 'Argelia',
    fuerza: 71, ataque: 72, defensa: 69, color: '#006233',
    jugadores: j(`Alexis Guendouz|POR|1|69; Youcef Atal|DEF|2|72; Aïssa Mandi|DEF|4|73;
      Ramy Bensebaini|DEF|5|77; Mohamed Amoura|DEL|9|77; Ismaël Bennacer|MED|6|79;
      Nabil Bentaleb|MED|8|73; Houssem Aouar|MED|10|76; Riyad Mahrez|DEL|7|82;
      Baghdad Bounedjah|DEL|19|72; Saïd Benrahma|DEL|11|75`),
  },
  {
    grupo: 'E', id: 'nor', nombre: 'Noruega', corto: 'NOR', bandera: '🇳🇴', pais: 'Noruega',
    fuerza: 79, ataque: 84, defensa: 73, color: '#BA0C2F',
    jugadores: j(`Ørjan Nyland|POR|1|73; Kristoffer Ajer|DEF|5|74; Leo Østigård|DEF|3|73;
      Marius Høibråten|DEF|4|71; David Møller Wolfe|DEF|17|72; Sander Berge|MED|6|76;
      Morten Thorsby|MED|8|72; Martin Ødegaard|MED|10|86; Antonio Nusa|DEL|11|79;
      Erling Haaland|DEL|9|91; Alexander Sørloth|DEL|19|80; Oscar Bobb|DEL|7|77`),
  },
  {
    grupo: 'E', id: 'jpn', nombre: 'Japón', corto: 'JPN', bandera: '🇯🇵', pais: 'Japón',
    fuerza: 78, ataque: 77, defensa: 77, color: '#1B1464',
    jugadores: j(`Zion Suzuki|POR|1|77; Hiroki Ito|DEF|4|77; Ko Itakura|DEF|5|77;
      Takehiro Tomiyasu|DEF|16|77; Yukinari Sugawara|DEF|2|74; Wataru Endo|MED|6|77;
      Hidemasa Morita|MED|13|76; Ritsu Doan|DEL|8|79; Takefusa Kubo|DEL|11|81;
      Kaoru Mitoma|DEL|7|82; Daizen Maeda|DEL|9|76; Ayase Ueda|DEL|20|75`),
  },
  // ---------------------------------------------------------------- Grupo F
  {
    grupo: 'F', id: 'esp', nombre: 'España', corto: 'ESP', bandera: '🇪🇸', pais: 'España',
    fuerza: 90, ataque: 89, defensa: 88, color: '#AA151B',
    jugadores: j(`Unai Simón|POR|23|83; Pedro Porro|DEF|2|79; Robin Le Normand|DEF|3|81;
      Dean Huijsen|DEF|24|80; Marc Cucurella|DEF|14|81; Rodri|MED|16|89;
      Martín Zubimendi|MED|18|83; Pedri|MED|9|88; Fabián Ruiz|MED|8|83;
      Lamine Yamal|DEL|19|89; Nico Williams|DEL|17|85; Mikel Oyarzabal|DEL|10|82;
      Álvaro Morata|DEL|7|79; Ferran Torres|DEL|11|81`),
  },
  {
    grupo: 'F', id: 'uru', nombre: 'Uruguay', corto: 'URU', bandera: '🇺🇾', pais: 'Uruguay',
    fuerza: 81, ataque: 80, defensa: 81, color: '#7B9FD4',
    jugadores: j(`Sergio Rochet|POR|1|75; Nahitan Nández|DEF|8|76; Ronald Araújo|DEF|4|84;
      José María Giménez|DEF|2|82; Matías Olivera|DEF|17|77; Manuel Ugarte|MED|5|80;
      Federico Valverde|MED|15|88; Nicolás De La Cruz|MED|10|79; Facundo Pellistri|DEL|11|75;
      Darwin Núñez|DEL|9|81; Maxi Araújo|DEL|16|76; Rodrigo Aguirre|DEL|19|74`),
  },
  {
    grupo: 'F', id: 'egy', nombre: 'Egipto', corto: 'EGY', bandera: '🇪🇬', pais: 'Egipto',
    fuerza: 70, ataque: 72, defensa: 68, color: '#C8102E',
    jugadores: j(`Mohamed El Shenawy|POR|1|72; Ahmed Hegazi|DEF|6|71; Mohamed Abdelmonem|DEF|2|71;
      Ahmed Fattouh|DEF|3|69; Mohamed Elneny|MED|17|73; Emam Ashour|MED|8|73;
      Mahmoud Trezeguet|DEL|11|75; Mohamed Salah|DEL|10|89; Omar Marmoush|DEL|9|82;
      Mostafa Mohamed|DEL|19|73`),
  },
  {
    grupo: 'F', id: 'nzl', nombre: 'Nueva Zelanda', corto: 'NZL', bandera: '🇳🇿', pais: 'Nueva Zelanda',
    fuerza: 60, ataque: 58, defensa: 61, color: '#FFFFFF',
    jugadores: j(`Alex Paulsen|POR|1|66; Tim Payne|DEF|2|63; Michael Boxall|DEF|5|66;
      Nando Pijnaker|DEF|4|63; Liberato Cacace|DEF|3|68; Joe Bell|MED|6|65;
      Marko Stamenic|MED|8|66; Matthew Garbett|MED|10|64; Chris Wood|DEL|9|78;
      Ben Waine|DEL|11|63`),
  },
  // ---------------------------------------------------------------- Grupo G
  {
    grupo: 'G', id: 'fra', nombre: 'Francia', corto: 'FRA', bandera: '🇫🇷', pais: 'Francia',
    fuerza: 90, ataque: 90, defensa: 88, color: '#0055A4',
    jugadores: j(`Mike Maignan|POR|16|85; Jules Koundé|DEF|5|84; William Saliba|DEF|4|86;
      Dayot Upamecano|DEF|18|83; Theo Hernández|DEF|22|82; Aurélien Tchouaméni|MED|8|84;
      Eduardo Camavinga|MED|6|84; Warren Zaïre-Emery|MED|21|80; Kylian Mbappé|DEL|10|91;
      Ousmane Dembélé|DEL|11|87; Michael Olise|DEL|7|85; Bradley Barcola|DEL|20|81;
      Randal Kolo Muani|DEL|9|79; Désiré Doué|DEL|14|82`),
  },
  {
    grupo: 'G', id: 'sen', nombre: 'Senegal', corto: 'SEN', bandera: '🇸🇳', pais: 'Senegal',
    fuerza: 78, ataque: 78, defensa: 78, color: '#00853F',
    jugadores: j(`Édouard Mendy|POR|16|78; Kalidou Koulibaly|DEF|3|79; Moussa Niakhaté|DEF|22|75;
      Abdou Diallo|DEF|22|74; Krépin Diatta|DEF|2|75; Idrissa Gueye|MED|5|77;
      Pape Matar Sarr|MED|17|78; Lamine Camara|MED|6|76; Ismaïla Sarr|DEL|18|79;
      Sadio Mané|DEL|10|82; Nicolas Jackson|DEL|9|79; Habib Diallo|DEL|19|74`),
  },
  {
    grupo: 'G', id: 'ecu', nombre: 'Ecuador', corto: 'ECU', bandera: '🇪🇨', pais: 'Ecuador',
    fuerza: 74, ataque: 71, defensa: 78, color: '#FFDD00',
    jugadores: j(`Hernán Galíndez|POR|1|72; Pervis Estupiñán|DEF|7|79; Willian Pacho|DEF|3|82;
      Piero Hincapié|DEF|2|81; Ángelo Preciado|DEF|17|74; Moisés Caicedo|MED|23|86;
      Alan Franco|MED|20|74; Jhegson Méndez|MED|5|73; Kendry Páez|MED|10|77;
      Enner Valencia|DEL|13|76; Kevin Rodríguez|DEL|9|72; Gonzalo Plata|DEL|19|75`),
  },
  {
    grupo: 'G', id: 'irn', nombre: 'Irán', corto: 'IRN', bandera: '🇮🇷', pais: 'Irán',
    fuerza: 69, ataque: 68, defensa: 70, color: '#239F40',
    jugadores: j(`Alireza Beiranvand|POR|1|71; Sadegh Moharrami|DEF|2|68; Majid Hosseini|DEF|5|68;
      Shojae Khalilzadeh|DEF|4|68; Milad Mohammadi|DEF|3|69; Saeid Ezatolahi|MED|6|70;
      Alireza Jahanbakhsh|MED|7|74; Mehdi Taremi|DEL|9|80; Sardar Azmoun|DEL|20|76;
      Mehdi Ghayedi|DEL|11|69`),
  },
  // ---------------------------------------------------------------- Grupo H
  {
    grupo: 'H', id: 'eng', nombre: 'Inglaterra', corto: 'ENG', bandera: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', pais: 'Inglaterra',
    fuerza: 89, ataque: 88, defensa: 87, color: '#FFFFFF',
    jugadores: j(`Jordan Pickford|POR|1|83; Reece James|DEF|2|81; John Stones|DEF|5|83;
      Marc Guéhi|DEF|6|82; Lewis Hall|DEF|3|78; Declan Rice|MED|4|88;
      Jude Bellingham|MED|10|88; Morgan Rogers|MED|8|81; Bukayo Saka|DEL|7|87;
      Harry Kane|DEL|9|89; Phil Foden|DEL|11|85; Cole Palmer|DEL|20|85;
      Anthony Gordon|DEL|17|80; Ollie Watkins|DEL|19|81`),
  },
  {
    grupo: 'H', id: 'cro', nombre: 'Croacia', corto: 'CRO', bandera: '🇭🇷', pais: 'Croacia',
    fuerza: 80, ataque: 78, defensa: 80, color: '#FF0000',
    jugadores: j(`Dominik Livaković|POR|1|78; Josip Stanišić|DEF|2|77; Joško Gvardiol|DEF|20|86;
      Josip Šutalo|DEF|6|76; Borna Sosa|DEF|3|74; Marcelo Brozović|MED|11|80;
      Mateo Kovačić|MED|8|83; Luka Modrić|MED|10|84; Petar Musa|DEL|9|75;
      Ante Budimir|DEL|17|75; Luka Sučić|MED|7|76; Martin Baturina|MED|14|76`),
  },
  {
    grupo: 'H', id: 'gha', nombre: 'Ghana', corto: 'GHA', bandera: '🇬🇭', pais: 'Ghana',
    fuerza: 70, ataque: 71, defensa: 68, color: '#006B3F',
    jugadores: j(`Lawrence Ati-Zigi|POR|1|70; Tariq Lamptey|DEF|2|73; Alexander Djiku|DEF|18|72;
      Mohammed Salisu|DEF|5|74; Gideon Mensah|DEF|3|69; Thomas Partey|MED|5|81;
      Elisha Owusu|MED|8|71; Mohammed Kudus|DEL|20|83; Antoine Semenyo|DEL|11|79;
      Iñaki Williams|DEL|19|77; Jordan Ayew|DEL|10|74`),
  },
  {
    grupo: 'H', id: 'pan', nombre: 'Panamá', corto: 'PAN', bandera: '🇵🇦', pais: 'Panamá',
    fuerza: 64, ataque: 64, defensa: 63, color: '#DA121A',
    jugadores: j(`Orlando Mosquera|POR|1|68; Michael Amir Murillo|DEF|2|72; Fidel Escobar|DEF|5|67;
      Andrés Andrade|MED|20|68; Adalberto Carrasquilla|MED|6|71; Aníbal Godoy|MED|20|68;
      Cristian Martínez|MED|10|68; José Fajardo|DEL|9|68; Ismael Díaz|DEL|11|70;
      Eduardo Guerrero|DEL|19|66`),
  },
  // ---------------------------------------------------------------- Grupo I
  {
    grupo: 'I', id: 'por', nombre: 'Portugal', corto: 'POR', bandera: '🇵🇹', pais: 'Portugal',
    fuerza: 89, ataque: 89, defensa: 86, color: '#046A38',
    jugadores: j(`Diogo Costa|POR|22|84; João Cancelo|DEF|20|81; Rúben Dias|DEF|3|87;
      Gonçalo Inácio|DEF|14|80; Nuno Mendes|DEF|19|84; João Palhinha|MED|6|82;
      Vitinha|MED|8|86; Bruno Fernandes|MED|8|86; Bernardo Silva|DEL|10|85;
      Cristiano Ronaldo|DEL|7|84; Rafael Leão|DEL|17|84; João Félix|DEL|11|79;
      Pedro Neto|DEL|21|80; Francisco Trincão|DEL|16|79`),
  },
  {
    grupo: 'I', id: 'civ', nombre: 'Costa de Marfil', corto: 'CIV', bandera: '🇨🇮', pais: 'Costa de Marfil',
    fuerza: 74, ataque: 74, defensa: 73, color: '#F77F00',
    jugadores: j(`Yahia Fofana|POR|1|72; Serge Aurier|DEF|2|72; Odilon Kossounou|DEF|5|76;
      Evan Ndicka|DEF|4|78; Ghislain Konan|DEF|3|71; Franck Kessié|MED|8|79;
      Ibrahim Sangaré|MED|6|76; Seko Fofana|MED|15|75; Simon Adingra|DEL|11|76;
      Sébastien Haller|DEL|9|76; Amad Diallo|DEL|7|80; Nicolas Pépé|DEL|19|74`),
  },
  {
    grupo: 'I', id: 'ksa', nombre: 'Arabia Saudí', corto: 'KSA', bandera: '🇸🇦', pais: 'Arabia Saudí',
    fuerza: 64, ataque: 63, defensa: 65, color: '#006C35',
    jugadores: j(`Nawaf Al-Aqidi|POR|1|68; Sultan Al-Ghannam|DEF|2|68; Ali Al-Bulaihi|DEF|5|69;
      Hassan Tambakti|DEF|4|68; Saud Abdulhamid|DEF|3|69; Mohamed Kanno|MED|6|69;
      Nasser Al-Dawsari|MED|18|69; Salem Al-Dawsari|DEL|10|75; Firas Al-Buraikan|DEL|9|71;
      Saleh Al-Shehri|DEL|11|69`),
  },
  {
    grupo: 'I', id: 'cuw', nombre: 'Curazao', corto: 'CUW', bandera: '🇨🇼', pais: 'Curazao',
    fuerza: 58, ataque: 57, defensa: 58, color: '#002B7F',
    jugadores: j(`Eloy Room|POR|1|66; Cuco Martina|DEF|2|62; Jurien Gaari|DEF|5|61;
      Roshon van Eijma|DEF|3|60; Leandro Bacuna|MED|8|67; Juninho Bacuna|MED|6|66;
      Godfried Roemeratoe|MED|10|61; Tahith Chong|DEL|11|68; Kenji Gorré|DEL|7|63;
      Livano Comenencia|MED|14|62`),
  },
  // ---------------------------------------------------------------- Grupo J
  {
    grupo: 'J', id: 'ger', nombre: 'Alemania', corto: 'GER', bandera: '🇩🇪', pais: 'Alemania',
    fuerza: 88, ataque: 88, defensa: 85, color: '#000000',
    jugadores: j(`Marc-André ter Stegen|POR|1|85; Joshua Kimmich|DEF|6|87; Antonio Rüdiger|DEF|2|84;
      Jonathan Tah|DEF|4|82; Maximilian Mittelstädt|DEF|18|78; Robert Andrich|MED|23|78;
      Aleksandar Pavlović|MED|20|80; Jamal Musiala|MED|10|88; Florian Wirtz|MED|17|88;
      Kai Havertz|DEL|7|83; Niclas Füllkrug|DEL|9|77; Serge Gnabry|DEL|11|81;
      Karim Adeyemi|DEL|19|79; Nick Woltemade|DEL|14|79`),
  },
  {
    grupo: 'J', id: 'tun', nombre: 'Túnez', corto: 'TUN', bandera: '🇹🇳', pais: 'Túnez',
    fuerza: 67, ataque: 65, defensa: 69, color: '#E70013',
    jugadores: j(`Aymen Dahmen|POR|1|69; Mohamed Dräger|DEF|2|68; Montassar Talbi|DEF|4|70;
      Yassine Meriah|DEF|3|68; Ali Abdi|DEF|17|70; Aïssa Laïdouni|MED|14|73;
      Ellyes Skhiri|MED|6|76; Hannibal Mejbri|MED|10|72; Youssef Msakni|DEL|7|70;
      Elias Achouri|DEL|11|71; Seifeddine Jaziri|DEL|9|68`),
  },
  {
    grupo: 'J', id: 'uzb', nombre: 'Uzbekistán', corto: 'UZB', bandera: '🇺🇿', pais: 'Uzbekistán',
    fuerza: 65, ataque: 64, defensa: 66, color: '#1EB53A',
    jugadores: j(`Utkir Yusupov|POR|1|67; Abdukodir Khusanov|DEF|4|78; Rustam Ashurmatov|DEF|5|67;
      Farrukh Sayfiev|DEF|2|65; Abbosbek Fayzullaev|MED|10|72; Otabek Shukurov|MED|6|67;
      Jaloliddin Masharipov|MED|7|69; Eldor Shomurodov|DEL|9|74; Igor Sergeev|DEL|11|67;
      Khojimat Erkinov|MED|8|66`),
  },
  {
    grupo: 'J', id: 'bol', nombre: 'Bolivia', corto: 'BOL', bandera: '🇧🇴', pais: 'Bolivia',
    fuerza: 60, ataque: 60, defensa: 58, color: '#007934',
    jugadores: j(`Carlos Lampe|POR|1|68; Diego Medina|DEF|4|60; Luis Haquin|DEF|2|63;
      José Sagredo|DEF|3|60; Roberto Fernández|MED|5|63; Gabriel Villamil|MED|8|65;
      Ramiro Vaca|MED|10|66; Miguelito|DEL|11|65; Carmelo Algarañaz|DEL|9|63;
      Enzo Monteiro|DEL|7|62; Moisés Villarroel|MED|6|61`),
  },
  // ---------------------------------------------------------------- Grupo K
  {
    grupo: 'K', id: 'ned', nombre: 'Países Bajos', corto: 'NED', bandera: '🇳🇱', pais: 'Países Bajos',
    fuerza: 87, ataque: 86, defensa: 85, color: '#FF6C00',
    jugadores: j(`Bart Verbruggen|POR|1|81; Denzel Dumfries|DEF|22|82; Virgil van Dijk|DEF|4|87;
      Jurriën Timber|DEF|2|84; Nathan Aké|DEF|5|81; Frenkie de Jong|MED|21|86;
      Ryan Gravenberch|MED|18|85; Tijjani Reijnders|MED|14|84; Cody Gakpo|DEL|11|84;
      Memphis Depay|DEL|10|80; Xavi Simons|DEL|7|84; Donyell Malen|DEL|19|78`),
  },
  {
    grupo: 'K', id: 'nga', nombre: 'Nigeria', corto: 'NGA', bandera: '🇳🇬', pais: 'Nigeria',
    fuerza: 76, ataque: 78, defensa: 74, color: '#008751',
    jugadores: j(`Stanley Nwabali|POR|23|72; Ola Aina|DEF|2|77; Calvin Bassey|DEF|5|78;
      William Troost-Ekong|DEF|4|74; Bright Osayi-Samuel|DEF|21|73; Wilfred Ndidi|MED|4|78;
      Alex Iwobi|MED|18|78; Frank Onyeka|MED|8|72; Ademola Lookman|DEL|11|83;
      Victor Osimhen|DEL|9|86; Samuel Chukwueze|DEL|7|76; Cyriel Dessers|DEL|19|72`),
  },
  {
    grupo: 'K', id: 'jor', nombre: 'Jordania', corto: 'JOR', bandera: '🇯🇴', pais: 'Jordania',
    fuerza: 62, ataque: 62, defensa: 62, color: '#007A3D',
    jugadores: j(`Yazid Abulaila|POR|1|66; Ehsan Haddad|DEF|2|63; Yazan Al-Arab|DEF|5|64;
      Abdallah Nasib|DEF|3|62; Nizar Al-Rashdan|MED|6|64; Mahmoud Al-Mardi|MED|8|64;
      Noor Al-Rawabdeh|MED|10|65; Musa Al-Taamari|DEL|7|74; Yazan Al-Naimat|DEL|9|68;
      Ali Olwan|DEL|11|65`),
  },
  {
    grupo: 'K', id: 'hai', nombre: 'Haití', corto: 'HAI', bandera: '🇭🇹', pais: 'Haití',
    fuerza: 59, ataque: 59, defensa: 58, color: '#00209F',
    jugadores: j(`Johny Placide|POR|1|64; Ricardo Adé|DEF|4|61; Andrew Jean-Baptiste|DEF|5|60;
      Carlens Arcus|DEF|2|62; Danley Jean Jacques|MED|6|64; Jean-Ricner Bellegarde|MED|8|73;
      Leverton Pierre|MED|10|60; Frantzdy Pierrot|DEL|9|66; Duckens Nazon|DEL|11|64;
      Ruben Providence|DEL|7|64`),
  },
  // ---------------------------------------------------------------- Grupo L
  {
    grupo: 'L', id: 'ita', nombre: 'Italia', corto: 'ITA', bandera: '🇮🇹', pais: 'Italia',
    fuerza: 84, ataque: 82, defensa: 85, color: '#0064AA',
    jugadores: j(`Gianluigi Donnarumma|POR|21|86; Giovanni Di Lorenzo|DEF|2|80; Alessandro Bastoni|DEF|23|85;
      Riccardo Calafiori|DEF|5|81; Federico Dimarco|DEF|32|83; Nicolò Barella|MED|18|85;
      Sandro Tonali|MED|8|83; Davide Frattesi|MED|16|79; Federico Chiesa|DEL|14|79;
      Mateo Retegui|DEL|9|80; Moise Kean|DEL|17|80; Giacomo Raspadori|DEL|10|77`),
  },
  {
    grupo: 'L', id: 'aut', nombre: 'Austria', corto: 'AUT', bandera: '🇦🇹', pais: 'Austria',
    fuerza: 76, ataque: 75, defensa: 76, color: '#ED2939',
    jugadores: j(`Patrick Pentz|POR|1|73; Stefan Posch|DEF|3|74; Kevin Danso|DEF|4|76;
      Philipp Lienhart|DEF|5|75; Phillipp Mwene|DEF|21|73; Nicolas Seiwald|MED|6|77;
      Konrad Laimer|MED|8|80; Christoph Baumgartner|MED|19|78; Marcel Sabitzer|MED|9|80;
      Marko Arnautović|DEL|7|75; Michael Gregoritsch|DEL|11|74`),
  },
  {
    grupo: 'L', id: 'cpv', nombre: 'Cabo Verde', corto: 'CPV', bandera: '🇨🇻', pais: 'Cabo Verde',
    fuerza: 63, ataque: 63, defensa: 62, color: '#003893',
    jugadores: j(`Vozinha|POR|1|66; Stopira|DEF|3|63; Diney|DEF|4|62;
      Roberto Lopes|DEF|5|66; Logan Costa|DEF|2|73; Kevin Pina|MED|8|65;
      Jamiro Monteiro|MED|10|69; Ryan Mendes|DEL|11|66; Garry Rodrigues|DEL|7|68;
      Bebé|DEL|9|68`),
  },
  {
    grupo: 'L', id: 'hon', nombre: 'Honduras', corto: 'HON', bandera: '🇭🇳', pais: 'Honduras',
    fuerza: 61, ataque: 60, defensa: 61, color: '#0073CF',
    jugadores: j(`Luis López|POR|1|66; Andy Nájar|DEF|2|65; Denil Maldonado|DEF|4|64;
      Marcelo Pereira|DEF|3|62; Deiby Flores|MED|6|65; Kervin Arriaga|MED|8|66;
      Alexander López|MED|10|63; Anthony Lozano|DEL|9|67; Romell Quioto|DEL|11|68;
      Jorge Benguché|DEL|19|62`),
  },
];
