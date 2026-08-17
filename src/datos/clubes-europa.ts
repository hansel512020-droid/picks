import { c, type FilaClub } from './club';

/**
 * Clubes europeos con el nucleo real de cada plantilla. Los jugadores que
 * faltan hasta completar el equipo los pone `plantillas.ts`.
 */

export const PREMIER: FilaClub[] = [
  c('mci', 'Manchester City', 'MCI', 90, 91, 87, '#6CABDD', 'Etihad Stadium', 'Mánchester', `
    Ederson|POR|31|85; Rúben Dias|DEF|3|87; Joško Gvardiol|DEF|24|86; Nathan Aké|DEF|6|81;
    Rodri|MED|16|89; Tijjani Reijnders|MED|4|84; Bernardo Silva|MED|20|85; Phil Foden|DEL|47|85;
    Savinho|DEL|26|80; Erling Haaland|DEL|9|91; Omar Marmoush|DEL|7|82; Rayan Cherki|DEL|10|81`),
  c('liv', 'Liverpool', 'LIV', 90, 90, 87, '#C8102E', 'Anfield', 'Liverpool', `
    Alisson|POR|1|88; Jeremie Frimpong|DEF|30|80; Virgil van Dijk|DEF|4|87; Ibrahima Konaté|DEF|5|83;
    Milos Kerkez|DEF|6|79; Ryan Gravenberch|MED|38|85; Alexis Mac Allister|MED|10|86;
    Dominik Szoboszlai|MED|8|83; Mohamed Salah|DEL|11|89; Florian Wirtz|DEL|7|88;
    Cody Gakpo|DEL|18|84; Hugo Ekitiké|DEL|22|81`),
  c('ars', 'Arsenal', 'ARS', 89, 87, 89, '#EF0107', 'Emirates Stadium', 'Londres', `
    David Raya|POR|22|84; Ben White|DEF|4|80; William Saliba|DEF|2|86; Gabriel Magalhães|DEF|6|84;
    Riccardo Calafiori|DEF|33|81; Declan Rice|MED|41|88; Martín Zubimendi|MED|36|83;
    Martin Ødegaard|MED|8|86; Bukayo Saka|DEL|7|87; Gabriel Martinelli|DEL|11|81;
    Viktor Gyökeres|DEL|14|84; Kai Havertz|DEL|29|83`),
  c('che', 'Chelsea', 'CHE', 86, 85, 84, '#034694', 'Stamford Bridge', 'Londres', `
    Robert Sánchez|POR|1|78; Reece James|DEF|24|81; Levi Colwill|DEF|6|81; Wesley Fofana|DEF|29|79;
    Marc Cucurella|DEF|3|81; Moisés Caicedo|MED|25|86; Enzo Fernández|MED|8|85;
    Cole Palmer|DEL|10|85; Pedro Neto|DEL|7|80; Nicolas Jackson|DEL|15|79;
    João Pedro|DEL|20|80; Estêvão|DEL|41|81`),
  c('tot', 'Tottenham Hotspur', 'TOT', 83, 83, 80, '#132257', 'Tottenham Hotspur Stadium', 'Londres', `
    Guglielmo Vicario|POR|1|81; Pedro Porro|DEF|23|79; Cristian Romero|DEF|17|86;
    Micky van de Ven|DEF|37|82; Destiny Udogie|DEF|13|79; Rodrigo Bentancur|MED|30|79;
    Pape Matar Sarr|MED|29|78; James Maddison|MED|10|81; Dejan Kulusevski|DEL|21|82;
    Mohammed Kudus|DEL|20|83; Dominic Solanke|DEL|19|79; Richarlison|DEL|9|78`),
  c('mun', 'Manchester United', 'MUN', 82, 82, 80, '#DA291C', 'Old Trafford', 'Mánchester', `
    Altay Bayındır|POR|1|76; Noussair Mazraoui|DEF|3|79; Leny Yoro|DEF|15|79;
    Lisandro Martínez|DEF|6|82; Patrick Dorgu|DEF|13|76; Casemiro|MED|18|79;
    Bruno Fernandes|MED|8|86; Manuel Ugarte|MED|25|80; Amad Diallo|DEL|16|80;
    Matheus Cunha|DEL|10|80; Bryan Mbeumo|DEL|19|81; Benjamin Šeško|DEL|30|80`),
  c('new', 'Newcastle United', 'NEW', 83, 82, 82, '#241F20', "St James' Park", 'Newcastle', `
    Nick Pope|POR|22|78; Kieran Trippier|DEF|2|77; Sven Botman|DEF|4|80; Fabian Schär|DEF|5|78;
    Dan Burn|DEF|33|76; Bruno Guimarães|MED|39|84; Sandro Tonali|MED|8|83;
    Joelinton|MED|7|81; Anthony Gordon|DEL|10|80; Anthony Elanga|DEL|20|78;
    Nick Woltemade|DEL|27|79; Harvey Barnes|DEL|11|77`),
  c('avl', 'Aston Villa', 'AVL', 82, 81, 80, '#95BFE5', 'Villa Park', 'Birmingham', `
    Emiliano Martínez|POR|1|85; Matty Cash|DEF|2|76; Ezri Konsa|DEF|4|79; Pau Torres|DEF|14|80;
    Lucas Digne|DEF|12|77; Boubacar Kamara|MED|44|80; Youri Tielemans|MED|8|81;
    Morgan Rogers|MED|27|81; Emiliano Buendía|DEL|10|78; Ollie Watkins|DEL|11|81;
    Donyell Malen|DEL|20|78; John McGinn|MED|7|79`),
  c('bha', 'Brighton', 'BHA', 79, 79, 77, '#0057B8', 'Amex Stadium', 'Brighton', `
    Bart Verbruggen|POR|1|81; Joël Veltman|DEF|6|75; Jan Paul van Hecke|DEF|29|78;
    Adam Webster|DEF|4|74; Pervis Estupiñán|DEF|30|79; Carlos Baleba|MED|17|80;
    Jack Hinshelwood|MED|25|74; Kaoru Mitoma|DEL|22|82; Georginio Rutter|DEL|10|78;
    Danny Welbeck|DEL|18|76; Yankuba Minteh|DEL|11|78`),
  c('whu', 'West Ham United', 'WHU', 76, 75, 75, '#7A263A', 'London Stadium', 'Londres', `
    Alphonse Areola|POR|23|76; Aaron Wan-Bissaka|DEF|29|76; Max Kilman|DEF|26|77;
    Jean-Clair Todibo|DEF|4|77; Emerson|DEF|33|74; Tomáš Souček|MED|28|79;
    Guido Rodríguez|MED|24|75; Lucas Paquetá|MED|10|82; Jarrod Bowen|DEL|20|81;
    Niclas Füllkrug|DEL|11|77; Callum Wilson|DEL|9|75`),
  c('cry', 'Crystal Palace', 'CRY', 78, 76, 78, '#1B458F', 'Selhurst Park', 'Londres', `
    Dean Henderson|POR|1|78; Daniel Muñoz|DEF|12|79; Marc Guéhi|DEF|6|82;
    Maxence Lacroix|DEF|5|77; Tyrick Mitchell|DEF|3|75; Adam Wharton|MED|20|80;
    Will Hughes|MED|19|74; Eberechi Eze|MED|10|82; Ismaïla Sarr|DEL|7|79;
    Jean-Philippe Mateta|DEL|14|79; Daichi Kamada|MED|18|77`),
  c('bre', 'Brentford', 'BRE', 76, 76, 74, '#E30613', 'Gtech Community Stadium', 'Londres', `
    Mark Flekken|POR|1|76; Aaron Hickey|DEF|2|74; Nathan Collins|DEF|22|78;
    Ethan Pinnock|DEF|5|75; Keane Lewis-Potter|DEF|3|74; Christian Nørgaard|MED|6|77;
    Vitaly Janelt|MED|27|74; Mikkel Damsgaard|MED|24|77; Kevin Schade|DEL|7|76;
    Yoane Wissa|DEL|11|78; Igor Thiago|DEL|9|75`),
  c('ful', 'Fulham', 'FUL', 76, 75, 75, '#000000', 'Craven Cottage', 'Londres', `
    Bernd Leno|POR|17|79; Kenny Tete|DEF|2|75; Calvin Bassey|DEF|3|78; Joachim Andersen|DEF|5|78;
    Antonee Robinson|DEF|33|79; Sander Berge|MED|16|76; Emile Smith Rowe|MED|32|77;
    Andreas Pereira|MED|18|76; Alex Iwobi|DEL|17|78; Raúl Jiménez|DEL|7|76;
    Rodrigo Muniz|DEL|9|75`),
  c('eve', 'Everton', 'EVE', 75, 72, 76, '#003399', 'Hill Dickinson Stadium', 'Liverpool', `
    Jordan Pickford|POR|1|83; Nathan Patterson|DEF|2|72; Jarrad Branthwaite|DEF|32|81;
    James Tarkowski|DEF|6|78; Vitalii Mykolenko|DEF|19|75; Idrissa Gueye|MED|27|77;
    James Garner|MED|37|74; Iliman Ndiaye|DEL|10|78; Jack Grealish|DEL|18|80;
    Beto|DEL|14|74; Dwight McNeil|DEL|7|76`),
  c('wol', 'Wolverhampton', 'WOL', 73, 72, 72, '#FDB913', 'Molineux', 'Wolverhampton', `
    José Sá|POR|1|76; Nélson Semedo|DEF|22|75; Toti Gomes|DEF|24|74; Yerson Mosquera|DEF|16|73;
    Rayan Aït-Nouri|DEF|3|78; João Gomes|MED|8|78; André|MED|7|79;
    Hwang Hee-chan|DEL|11|78; Jørgen Strand Larsen|DEL|9|77; Matheus Cunha|DEL|12|80;
    Rodrigo Gomes|DEL|27|73`),
  c('nfo', 'Nottingham Forest', 'NFO', 77, 75, 78, '#DD0000', 'City Ground', 'Nottingham', `
    Matz Sels|POR|26|78; Neco Williams|DEF|7|75; Murillo|DEF|40|81; Nikola Milenković|DEF|6|79;
    Ola Aina|DEF|43|77; Elliot Anderson|MED|8|79; Ryan Yates|MED|22|73;
    Morgan Gibbs-White|MED|10|81; Anthony Elanga|DEL|21|78; Chris Wood|DEL|11|78;
    Callum Hudson-Odoi|DEL|14|76`),
  c('bou', 'Bournemouth', 'BOU', 77, 76, 76, '#B50E12', 'Vitality Stadium', 'Bournemouth', `
    Đorđe Petrović|POR|1|77; Adam Smith|DEF|15|72; Marcos Senesi|DEF|25|78;
    Bafodé Diakité|DEF|3|77; Milos Kerkez|DEF|6|79; Ryan Christie|MED|10|75;
    Tyler Adams|MED|12|78; Alex Scott|MED|23|74; Antoine Semenyo|DEL|24|79;
    Evanilson|DEL|9|77; Justin Kluivert|DEL|19|78`),
  c('lee', 'Leeds United', 'LEE', 72, 71, 71, '#FFCD00', 'Elland Road', 'Leeds', `
    Illan Meslier|POR|1|74; Jayden Bogle|DEF|20|72; Joe Rodon|DEF|6|74; Pascal Struijk|DEF|5|74;
    Junior Firpo|DEF|3|72; Ethan Ampadu|MED|4|75; Ao Tanaka|MED|22|74;
    Brenden Aaronson|MED|7|73; Daniel James|DEL|20|74; Joël Piroe|DEL|19|73;
    Willy Gnonto|DEL|29|74`),
  c('bur', 'Burnley', 'BUR', 70, 68, 70, '#6C1D45', 'Turf Moor', 'Burnley', `
    Martin Dúbravka|POR|1|74; Connor Roberts|DEF|14|70; Maxime Estève|DEF|5|72;
    CJ Egan-Riley|DEF|3|70; Lucas Pires|DEF|22|69; Josh Cullen|MED|24|72;
    Josh Laurent|MED|4|70; Jaidon Anthony|DEL|11|71; Zian Flemming|DEL|10|71;
    Lyle Foster|DEL|17|72; Marcus Edwards|DEL|7|72`),
  c('sun', 'Sunderland', 'SUN', 71, 70, 71, '#EB172B', 'Stadium of Light', 'Sunderland', `
    Robin Roefs|POR|1|71; Trai Hume|DEF|2|71; Dan Ballard|DEF|5|72; Nordi Mukiele|DEF|24|74;
    Reinildo|DEF|33|73; Granit Xhaka|MED|34|84; Noah Sadiki|MED|8|73;
    Enzo Le Fée|MED|10|75; Chemsdine Talbi|DEL|7|72; Wilson Isidor|DEL|9|72;
    Brian Brobbey|DEL|11|75`),
];

export const LALIGA: FilaClub[] = [
  c('rma', 'Real Madrid', 'RMA', 91, 92, 87, '#FEBE10', 'Santiago Bernabéu', 'Madrid', `
    Thibaut Courtois|POR|1|88; Trent Alexander-Arnold|DEF|12|84; Éder Militão|DEF|3|83;
    Dean Huijsen|DEF|24|80; Álvaro Carreras|DEF|18|79; Aurélien Tchouaméni|MED|14|84;
    Federico Valverde|MED|8|88; Jude Bellingham|MED|5|88; Arda Güler|MED|15|82;
    Kylian Mbappé|DEL|10|91; Vinícius Jr|DEL|7|90; Rodrygo|DEL|11|84;
    Franco Mastantuono|DEL|30|80; Gonzalo García|DEL|16|77`),
  c('fcb', 'FC Barcelona', 'BAR', 90, 92, 85, '#A50044', 'Spotify Camp Nou', 'Barcelona', `
    Joan García|POR|1|82; Jules Koundé|DEF|23|84; Pau Cubarsí|DEF|2|83; Ronald Araújo|DEF|4|84;
    Alejandro Balde|DEF|3|80; Marc Casadó|MED|17|78; Frenkie de Jong|MED|21|86;
    Pedri|MED|8|88; Dani Olmo|MED|20|84; Lamine Yamal|DEL|10|89;
    Raphinha|DEL|11|86; Robert Lewandowski|DEL|9|84; Ferran Torres|DEL|7|81;
    Marcus Rashford|DEL|14|80`),
  c('atm', 'Atlético de Madrid', 'ATM', 85, 84, 85, '#CB3524', 'Riyadh Air Metropolitano', 'Madrid', `
    Jan Oblak|POR|13|85; Nahuel Molina|DEF|16|79; Robin Le Normand|DEF|24|81;
    José María Giménez|DEF|2|82; Matteo Ruggeri|DEF|3|78; Koke|MED|6|80;
    Pablo Barrios|MED|8|80; Nico González|MED|10|79; Antoine Griezmann|DEL|7|84;
    Julián Álvarez|DEL|19|86; Alexander Sørloth|DEL|9|80; Giuliano Simeone|DEL|5|78`),
  c('vil', 'Villarreal', 'VIL', 80, 80, 78, '#FFE667', 'Estadio de la Cerámica', 'Villarreal', `
    Luiz Júnior|POR|1|78; Kiko Femenía|DEF|22|74; Rafa Marín|DEF|4|76; Juan Foyth|DEF|8|79;
    Sergi Cardona|DEF|17|75; Dani Parejo|MED|10|80; Santi Comesaña|MED|14|76;
    Pape Gueye|MED|24|76; Nicolas Pépé|DEL|19|76; Ayoze Pérez|DEL|11|79;
    Georges Mikautadze|DEL|9|78; Alberto Moleiro|DEL|7|78`),
  c('ath', 'Athletic Club', 'ATH', 81, 79, 81, '#EE2523', 'San Mamés', 'Bilbao', `
    Unai Simón|POR|1|83; Óscar de Marcos|DEF|18|75; Dani Vivian|DEF|3|79; Aitor Paredes|DEF|5|77;
    Yuri Berchiche|DEF|17|76; Mikel Jauregizar|MED|6|77; Mikel Vesga|MED|4|75;
    Oihan Sancet|MED|8|81; Nico Williams|DEL|10|85; Iñaki Williams|DEL|9|77;
    Gorka Guruzeta|DEL|12|76; Álex Berenguer|DEL|7|78`),
  c('rbe', 'Real Betis', 'BET', 79, 79, 77, '#00954C', 'Benito Villamarín', 'Sevilla', `
    Álvaro Valles|POR|1|77; Héctor Bellerín|DEF|19|76; Natan|DEF|6|76; Marc Bartra|DEF|5|76;
    Ricardo Rodríguez|DEF|12|74; Marc Roca|MED|21|77; Sergi Altimira|MED|14|75;
    Isco|MED|22|82; Antony|DEL|7|81; Cucho Hernández|DEL|9|77;
    Pablo Fornals|MED|8|77; Abde Ezzalzouli|DEL|10|78`),
  c('rso', 'Real Sociedad', 'RSO', 78, 76, 78, '#0067B1', 'Reale Arena', 'San Sebastián', `
    Álex Remiro|POR|1|80; Hamari Traoré|DEF|12|75; Igor Zubeldia|DEF|4|78; Jon Aramburu|DEF|22|74;
    Sergio Gómez|DEF|3|75; Martín Zubimendi|MED|3|83; Brais Méndez|MED|23|79;
    Takefusa Kubo|DEL|14|81; Mikel Oyarzabal|DEL|10|82; Ander Barrenetxea|DEL|7|77;
    Orri Óskarsson|DEL|9|75`),
  c('sev', 'Sevilla', 'SEV', 75, 73, 75, '#D40026', 'Ramón Sánchez-Pizjuán', 'Sevilla', `
    Ørjan Nyland|POR|1|75; Juanlu Sánchez|DEF|16|74; Kike Salas|DEF|4|73; Marcão|DEF|22|74;
    Adrià Pedrosa|DEF|3|73; Nemanja Gudelj|MED|6|74; Lucien Agoumé|MED|18|75;
    Djibril Sow|MED|24|76; Dodi Lukébakio|DEL|11|78; Isaac Romero|DEL|19|74;
    Rubén Vargas|DEL|7|77`),
  c('val', 'Valencia', 'VAL', 74, 72, 75, '#F5A300', 'Mestalla', 'Valencia', `
    Giorgi Mamardashvili|POR|1|81; Thierry Correia|DEF|2|73; Cristhian Mosquera|DEF|3|77;
    César Tárrega|DEF|24|73; José Gayà|DEF|14|76; Pepelu|MED|10|75;
    Javi Guerra|MED|8|78; André Almeida|MED|18|74; Diego López|DEL|16|76;
    Hugo Duro|DEL|9|75; Luis Rioja|DEL|11|73`),
  c('cel', 'Celta de Vigo', 'CEL', 75, 76, 72, '#8AC3EE', 'Balaídos', 'Vigo', `
    Vicente Guaita|POR|1|75; Óscar Mingueza|DEF|2|76; Marcos Alonso|DEF|3|74;
    Carl Starfelt|DEF|4|75; Javi Rueda|DEF|22|72; Fran Beltrán|MED|14|75;
    Ilaix Moriba|MED|5|75; Hugo Álvarez|MED|17|74; Borja Iglesias|DEL|9|77;
    Iago Aspas|DEL|10|79; Pablo Durán|DEL|19|73`),
  c('rvo', 'Rayo Vallecano', 'RAY', 73, 70, 74, '#E53027', 'Estadio de Vallecas', 'Madrid', `
    Augusto Batalla|POR|13|75; Andrei Rațiu|DEF|2|76; Florian Lejeune|DEF|24|74;
    Abdul Mumin|DEF|22|73; Pep Chavarría|DEF|3|72; Óscar Valentín|MED|20|74;
    Pathé Ciss|MED|6|73; Isi Palazón|MED|7|77; Álvaro García|DEL|11|75;
    Jorge de Frutos|DEL|17|76; Sergio Camello|DEL|9|74`),
  c('osa', 'Osasuna', 'OSA', 73, 71, 74, '#0A346F', 'El Sadar', 'Pamplona', `
    Sergio Herrera|POR|1|74; Jesús Areso|DEF|2|74; Alejandro Catena|DEF|22|73;
    Juan Cruz|DEF|3|72; Valentin Rosier|DEF|16|72; Lucas Torró|MED|6|74;
    Jon Moncayola|MED|5|76; Aimar Oroz|MED|8|76; Rubén García|DEL|14|74;
    Ante Budimir|DEL|17|76; Raúl García de Haro|DEL|9|72`),
  c('gir', 'Girona', 'GIR', 74, 73, 72, '#CD2534', 'Montilivi', 'Girona', `
    Paulo Gazzaniga|POR|13|76; Arnau Martínez|DEF|2|75; Daley Blind|DEF|17|75;
    David López|DEF|6|73; Alejandro Francés|DEF|24|73; Yangel Herrera|MED|16|77;
    Iván Martín|MED|8|76; Cristhian Stuani|DEL|7|73; Bryan Gil|DEL|11|76;
    Abel Ruiz|DEL|9|74; Viktor Tsygankov|DEL|10|78`),
  c('mll', 'Mallorca', 'MLL', 73, 70, 75, '#E20613', 'Son Moix', 'Palma', `
    Leo Román|POR|13|74; Pablo Maffeo|DEF|2|75; Martin Valjent|DEF|4|75;
    Antonio Raíllo|DEF|5|74; Toni Lato|DEF|3|72; Sergi Darder|MED|23|77;
    Samú Costa|MED|6|75; Manu Morlanes|MED|8|73; Vedat Muriqi|DEL|7|77;
    Cyle Larin|DEL|9|74; Takuma Asano|DEL|22|73`),
  c('get', 'Getafe', 'GET', 71, 68, 73, '#005999', 'Coliseum', 'Madrid', `
    David Soria|POR|1|75; Juan Iglesias|DEF|18|73; Djené|DEF|2|75; Domingos Duarte|DEF|24|72;
    Diego Rico|DEF|3|72; Luis Milla|MED|14|73; Mario Martín|MED|8|71;
    Christantus Uche|MED|20|74; Álex Sancris|DEL|11|71; Borja Mayoral|DEL|7|76;
    Adrián Liso|DEL|19|71`),
  c('ala', 'Deportivo Alavés', 'ALA', 71, 69, 72, '#0761AF', 'Mendizorroza', 'Vitoria', `
    Antonio Sivera|POR|1|75; Nahuel Tenaglia|DEF|2|72; Moussa Diarra|DEF|24|72;
    Santiago Mouriño|DEF|22|73; Manu Sánchez|DEF|3|71; Antonio Blanco|MED|6|74;
    Pablo Ibáñez|MED|8|73; Carlos Vicente|DEL|7|74; Toni Martínez|DEL|9|74;
    Kike García|DEL|11|72; Carlos Benavídez|MED|5|72`),
  c('esp', 'RCD Espanyol', 'ESP', 71, 69, 72, '#007FC8', 'RCDE Stadium', 'Barcelona', `
    Marko Dmitrović|POR|1|75; Omar El Hilali|DEF|2|73; Leandro Cabrera|DEF|22|73;
    Fernando Calero|DEF|4|73; Carlos Romero|DEF|3|73; Edu Expósito|MED|8|75;
    Pol Lozano|MED|6|72; Javi Puado|DEL|10|76; Pere Milla|DEL|11|72;
    Roberto Fernández|DEL|9|72; Kike García|DEL|19|72`),
  c('elc', 'Elche', 'ELC', 69, 67, 70, '#00913F', 'Martínez Valero', 'Elche', `
    Iñaki Peña|POR|1|74; Héctor Fort|DEF|2|72; Pedro Bigas|DEF|4|71; David Affengruber|DEF|5|72;
    Álvaro Núñez|DEF|3|70; Aleix Febas|MED|8|72; Marc Aguado|MED|6|71;
    Germán Valera|DEL|11|70; Rafa Mir|DEL|9|73; André Silva|DEL|19|75;
    Josan|DEL|7|70`),
  c('lev', 'Levante', 'LEV', 68, 67, 68, '#004C9F', 'Ciutat de València', 'Valencia', `
    Mathew Ryan|POR|1|75; Manu Sánchez|DEF|3|71; Unai Elgezabal|DEF|4|70;
    Matías Moreno|DEF|22|69; Jeremy Toljan|DEF|2|71; Carlos Álvarez|MED|10|74;
    Unai Vencedor|MED|8|72; Iván Romero|DEL|11|71; Etta Eyong|DEL|19|72;
    Goduine Koyalipou|DEL|9|69; Roger Brugué|DEL|7|70`),
  c('ovi', 'Real Oviedo', 'OVI', 67, 65, 68, '#004B9F', 'Carlos Tartiere', 'Oviedo', `
    Aarón Escandell|POR|1|71; Nacho Vidal|DEF|2|70; David Costas|DEF|5|69;
    Dani Calvo|DEF|4|69; Rahim Alhassane|DEF|3|68; Santiago Cazorla|MED|8|72;
    Ilyas Chaira|MED|11|70; Álex Forés|DEL|9|69; Haissem Hassan|DEL|7|70;
    Josip Brekalo|DEL|10|73; Federico Viñas|DEL|19|70`),
];

export const SERIEA: FilaClub[] = [
  c('int', 'Inter de Milán', 'INT', 87, 87, 86, '#0068A8', 'San Siro', 'Milán', `
    Yann Sommer|POR|1|83; Benjamin Pavard|DEF|28|80; Alessandro Bastoni|DEF|95|85;
    Francesco Acerbi|DEF|15|78; Federico Dimarco|DEF|32|83; Nicolò Barella|MED|23|85;
    Hakan Çalhanoğlu|MED|20|85; Henrikh Mkhitaryan|MED|22|79; Denzel Dumfries|DEF|2|82;
    Lautaro Martínez|DEL|10|86; Marcus Thuram|DEL|9|84; Ange-Yoan Bonny|DEL|14|77`),
  c('nap', 'Napoli', 'NAP', 86, 84, 86, '#12A0D7', 'Diego Armando Maradona', 'Nápoles', `
    Alex Meret|POR|1|80; Giovanni Di Lorenzo|DEF|22|80; Amir Rrahmani|DEF|13|80;
    Alessandro Buongiorno|DEF|4|81; Mathías Olivera|DEF|17|77; Stanislav Lobotka|MED|68|82;
    Scott McTominay|MED|8|82; Kevin De Bruyne|MED|11|88; André-Frank Zambo Anguissa|MED|99|81;
    Romelu Lukaku|DEL|11|84; Rasmus Højlund|DEL|9|78; Matteo Politano|DEL|21|79`),
  c('juv', 'Juventus', 'JUV', 84, 82, 84, '#000000', 'Allianz Stadium', 'Turín', `
    Michele Di Gregorio|POR|29|80; Pierre Kalulu|DEF|15|78; Gleison Bremer|DEF|3|84;
    Federico Gatti|DEF|4|78; Andrea Cambiaso|DEF|27|80; Manuel Locatelli|MED|5|79;
    Khéphren Thuram|MED|19|80; Weston McKennie|MED|16|79; Kenan Yıldız|DEL|10|82;
    Dušan Vlahović|DEL|9|81; Jonathan David|DEL|30|82; Francisco Conceição|DEL|7|79`),
  c('mil', 'AC Milan', 'MIL', 84, 83, 83, '#FB090B', 'San Siro', 'Milán', `
    Mike Maignan|POR|16|85; Alessandro Florenzi|DEF|42|74; Fikayo Tomori|DEF|23|80;
    Strahinja Pavlović|DEF|31|79; Theo Hernández|DEF|19|82; Youssouf Fofana|MED|29|80;
    Luka Modrić|MED|14|84; Christian Pulisic|DEL|11|84; Rafael Leão|DEL|10|84;
    Santiago Giménez|DEL|7|80; Álvaro Morata|DEL|7|79; Ruben Loftus-Cheek|MED|8|78`),
  c('atl', 'Atalanta', 'ATA', 83, 84, 80, '#1D5CA9', 'Gewiss Stadium', 'Bérgamo', `
    Marco Carnesecchi|POR|29|80; Rafael Tolói|DEF|3|76; Isak Hien|DEF|4|79;
    Sead Kolašinac|DEF|23|77; Davide Zappacosta|DEF|77|77; Marten de Roon|MED|15|79;
    Éderson|MED|13|82; Mario Pašalić|MED|8|79; Charles De Ketelaere|DEL|17|80;
    Ademola Lookman|DEL|11|83; Mateo Retegui|DEL|32|80; Gianluca Scamacca|DEL|9|78`),
  c('rom', 'AS Roma', 'ROM', 82, 79, 84, '#8E1F2F', 'Stadio Olimpico', 'Roma', `
    Mile Svilar|POR|99|82; Zeki Çelik|DEF|19|75; Gianluca Mancini|DEF|23|79;
    Evan Ndicka|DEF|5|78; Angeliño|DEF|3|78; Bryan Cristante|MED|4|78;
    Manu Koné|MED|17|81; Lorenzo Pellegrini|MED|7|79; Paulo Dybala|DEL|21|83;
    Artem Dovbyk|DEL|11|78; Matías Soulé|DEL|18|77; Stephan El Shaarawy|DEL|92|75`),
  c('laz', 'Lazio', 'LAZ', 79, 78, 78, '#87D8F7', 'Stadio Olimpico', 'Roma', `
    Ivan Provedel|POR|94|79; Adam Marušić|DEF|77|76; Alessio Romagnoli|DEF|13|79;
    Mario Gila|DEF|34|78; Nuno Tavares|DEF|30|77; Nicolò Rovella|MED|6|78;
    Matteo Guendouzi|MED|8|79; Mattia Zaccagni|DEL|10|80; Gustav Isaksen|DEL|18|76;
    Valentín Castellanos|DEL|11|77; Boulaye Dia|DEL|19|76`),
  c('fio', 'Fiorentina', 'FIO', 79, 77, 78, '#592C82', 'Artemio Franchi', 'Florencia', `
    David de Gea|POR|43|80; Dodô|DEF|2|78; Pietro Comuzzo|DEF|15|76; Luca Ranieri|DEF|6|75;
    Robin Gosens|DEF|21|78; Rolando Mandragora|MED|8|76; Nicolò Fagioli|MED|44|77;
    Albert Guðmundsson|DEL|10|79; Moise Kean|DEL|20|80; Edin Džeko|DEL|9|76;
    Roberto Piccoli|DEL|91|75`),
  c('bol', 'Bologna', 'BOL', 79, 77, 79, '#A2242F', "Renato Dall'Ara", 'Bolonia', `
    Łukasz Skorupski|POR|28|77; Emil Holm|DEF|29|75; Sam Beukema|DEF|31|78;
    Jhon Lucumí|DEF|26|78; Charalampos Lykogiannis|DEF|22|74; Remo Freuler|MED|8|77;
    Lewis Ferguson|MED|19|78; Riccardo Orsolini|DEL|7|80; Dan Ndoye|DEL|11|76;
    Santiago Castro|DEL|9|77; Thijs Dallinga|DEL|24|75`),
  c('tor', 'Torino', 'TOR', 74, 71, 76, '#8A1E03', 'Grande Torino', 'Turín', `
    Alberto Paleari|POR|1|73; Marco Pedersen|DEF|13|73; Saúl Coco|DEF|23|74;
    Guillermo Maripán|DEF|6|75; Valentino Lazaro|DEF|20|74; Samuele Ricci|MED|28|78;
    Ivan Ilić|MED|8|75; Nikola Vlašić|MED|10|76; Che Adams|DEL|18|74;
    Duván Zapata|DEL|91|75; Giovanni Simeone|DEL|9|76`),
  c('udi', 'Udinese', 'UDI', 74, 72, 74, '#000000', 'Bluenergy Stadium', 'Udine', `
    Maduka Okoye|POR|40|74; Thomas Kristensen|DEF|4|73; Jaka Bijol|DEF|29|76;
    Oumar Solet|DEF|6|76; Jordan Zemura|DEF|3|73; Sandi Lovrić|MED|4|74;
    Jesper Karlström|MED|20|73; Arthur Atta|MED|8|74; Keinan Davis|DEL|9|74;
    Lorenzo Lucca|DEL|17|76; Iker Bravo|DEL|10|73`),
  c('gen', 'Genoa', 'GEN', 72, 69, 73, '#B01B23', 'Luigi Ferraris', 'Génova', `
    Nicola Leali|POR|1|73; Aarón Martín|DEF|3|73; Koni De Winter|DEF|5|76;
    Johan Vásquez|DEF|22|77; Stefano Sabelli|DEF|20|72; Morten Frendrup|MED|4|76;
    Milan Badelj|MED|47|73; Ruslan Malinovskyi|MED|17|76; Junior Messias|DEL|21|74;
    Vitinha|DEL|9|73; Lorenzo Colombo|DEL|19|72`),
  c('com', 'Como', 'COM', 76, 75, 74, '#004B9F', 'Giuseppe Sinigaglia', 'Como', `
    Jean Butez|POR|1|74; Alberto Moreno|DEF|17|73; Alberto Dossena|DEF|4|74;
    Marc Kempf|DEF|6|73; Álex Valle|DEF|3|74; Máximo Perrone|MED|8|75;
    Nico Paz|MED|10|80; Sergi Roberto|MED|20|76; Assane Diao|DEL|11|76;
    Patrick Cutrone|DEL|9|73; Anastasios Douvikas|DEL|19|74`),
  c('cag', 'Cagliari', 'CAG', 70, 68, 71, '#B4053A', 'Unipol Domus', 'Cagliari', `
    Elia Caprile|POR|25|75; Gabriele Zappa|DEF|28|72; Yerry Mina|DEF|26|76;
    Sebastiano Luperto|DEF|6|73; Tommaso Augello|DEF|3|71; Michel Adopo|MED|80|71;
    Matteo Prati|MED|6|72; Nicolás Viola|MED|10|72; Zito Luvumbo|DEL|77|73;
    Roberto Piccoli|DEL|91|75; Sebastiano Esposito|DEL|94|74`),
  c('par', 'Parma', 'PAR', 70, 68, 71, '#FFD100', 'Ennio Tardini', 'Parma', `
    Zion Suzuki|POR|1|77; Enrico Delprato|DEF|5|72; Alessandro Circati|DEF|15|73;
    Lautaro Valenti|DEF|26|72; Emanuele Valeri|DEF|3|71; Adrián Bernabé|MED|10|75;
    Mandela Keita|MED|8|73; Matteo Cancellieri|DEL|17|73; Pontus Almqvist|DEL|11|72;
    Mateo Pellegrino|DEL|9|73; Ange-Yoan Bonny|DEL|14|77`),
  c('lec', 'Lecce', 'LEC', 68, 65, 70, '#FFE500', 'Via del Mare', 'Lecce', `
    Wladimiro Falcone|POR|30|74; Antonino Gallo|DEF|25|72; Federico Baschirotto|DEF|6|73;
    Kialonda Gaspar|DEF|4|71; Danilo Veiga|DEF|23|70; Ylber Ramadani|MED|20|72;
    Balthazar Pierret|MED|8|71; Santiago Pierotti|DEL|11|71; Nikola Krstović|DEL|9|75;
    Lameck Banda|DEL|7|72; Tete Morente|DEL|10|71`),
  c('ver', 'Hellas Verona', 'VER', 67, 65, 68, '#F8D51C', 'Marcantonio Bentegodi', 'Verona', `
    Lorenzo Montipò|POR|1|73; Diego Coppola|DEF|13|72; Martin Frese|DEF|3|70;
    Unai Núñez|DEF|4|72; Victor Nelsson|DEF|5|72; Suat Serdar|MED|8|73;
    Antoine Bernede|MED|20|70; Gift Orban|DEL|9|73; Amin Sarr|DEL|11|71;
    Daniel Mosquera|DEL|19|70; Giovane|DEL|7|71`),
  c('pis', 'Pisa', 'PIS', 66, 64, 67, '#004B9F', 'Arena Garibaldi', 'Pisa', `
    Adrian Semper|POR|1|71; Simone Canestrelli|DEF|4|71; Antonio Caracciolo|DEF|6|69;
    Raúl Albiol|DEF|33|72; Samuele Angori|DEF|3|69; Marius Marin|MED|8|71;
    Michel Aebischer|MED|20|74; Idrissa Touré|MED|2|70; M'Bala Nzola|DEL|9|73;
    Stefano Moreo|DEL|32|70; Henrik Meister|DEL|11|70`),
  c('sas', 'Sassuolo', 'SAS', 69, 68, 69, '#00A752', 'Mapei Stadium', 'Reggio Emilia', `
    Stefano Turati|POR|1|72; Josh Doig|DEF|3|72; Tarik Muharemović|DEF|4|71;
    Filippo Romagna|DEF|6|70; Jeremy Toljan|DEF|2|71; Kristian Thorstvedt|MED|18|73;
    Daniel Boloca|MED|24|72; Andrea Pinamonti|DEL|99|75; Domenico Berardi|DEL|10|79;
    Armand Laurienté|DEL|45|75; Nicholas Pierini|DEL|7|69`),
  c('cre', 'Cremonese', 'CRE', 66, 64, 67, '#C8102E', 'Giovanni Zini', 'Cremona', `
    Marco Silvestri|POR|1|72; Filippo Terracciano|DEF|2|71; Federico Baschirotto|DEF|6|73;
    Matteo Bianchetti|DEF|4|70; Giuseppe Pezzella|DEF|3|70; Warren Bondo|MED|8|72;
    Michele Collocolo|MED|16|70; Jamie Vardy|DEL|10|74; Federico Bonazzoli|DEL|9|72;
    Franco Vázquez|DEL|20|72; Antonio Sanabria|DEL|19|74`),
];

export const BUNDESLIGA: FilaClub[] = [
  c('bay', 'Bayern de Múnich', 'BAY', 91, 93, 87, '#DC052D', 'Allianz Arena', 'Múnich', `
    Manuel Neuer|POR|1|85; Konrad Laimer|DEF|24|80; Dayot Upamecano|DEF|2|83;
    Jonathan Tah|DEF|4|82; Alphonso Davies|DEF|19|85; Joshua Kimmich|MED|6|87;
    Leon Goretzka|MED|8|81; Aleksandar Pavlović|MED|45|80; Michael Olise|DEL|17|85;
    Harry Kane|DEL|9|89; Luis Díaz|DEL|14|87; Serge Gnabry|DEL|7|81;
    Jamal Musiala|MED|10|88`),
  c('lev', 'Bayer Leverkusen', 'B04', 84, 83, 83, '#E32221', 'BayArena', 'Leverkusen', `
    Mark Flekken|POR|1|76; Jarell Quansah|DEF|4|78; Loïc Badé|DEF|30|79;
    Edmond Tapsoba|DEF|12|80; Alejandro Grimaldo|DEF|20|83; Robert Andrich|MED|8|78;
    Exequiel Palacios|MED|25|79; Malik Tillman|MED|10|80; Ernest Poku|DEL|11|76;
    Patrik Schick|DEL|14|80; Christian Kofane|DEL|9|75`),
  c('bvb', 'Borussia Dortmund', 'BVB', 84, 83, 82, '#FDE100', 'Signal Iduna Park', 'Dortmund', `
    Gregor Kobel|POR|1|85; Julian Ryerson|DEF|26|78; Nico Schlotterbeck|DEF|4|82;
    Waldemar Anton|DEF|2|79; Ramy Bensebaini|DEF|5|77; Pascal Groß|MED|13|79;
    Felix Nmecha|MED|8|79; Jobe Bellingham|MED|7|78; Karim Adeyemi|DEL|27|79;
    Serhou Guirassy|DEL|9|83; Maximilian Beier|DEL|14|78; Julian Brandt|MED|10|80`),
  c('rbl', 'RB Leipzig', 'RBL', 82, 81, 81, '#DD0741', 'Red Bull Arena', 'Leipzig', `
    Péter Gulácsi|POR|1|79; Lutsharel Geertruida|DEF|4|78; Willi Orbán|DEF|4|79;
    Castello Lukeba|DEF|5|80; David Raum|DEF|22|79; Xaver Schlager|MED|23|79;
    Christoph Baumgartner|MED|14|78; Xavi Simons|MED|10|84; Antonio Nusa|DEL|7|79;
    Loïs Openda|DEL|17|81; Benjamin Šeško|DEL|30|80; Yussuf Poulsen|DEL|9|76`),
  c('sge', 'Eintracht Fráncfort', 'SGE', 80, 81, 77, '#E1000F', 'Deutsche Bank Park', 'Fráncfort', `
    Kaua Santos|POR|31|76; Rasmus Kristensen|DEF|2|75; Robin Koch|DEF|3|79;
    Arthur Theate|DEF|5|76; Nathaniel Brown|DEF|18|75; Ellyes Skhiri|MED|15|77;
    Hugo Larsson|MED|16|79; Mario Götze|MED|27|78; Ansgar Knauff|DEL|36|77;
    Jonathan Burkardt|DEL|9|78; Can Uzun|DEL|10|77; Ritsu Doan|DEL|8|79`),
  c('vfb', 'VfB Stuttgart', 'VFB', 79, 78, 78, '#E32219', 'MHPArena', 'Stuttgart', `
    Alexander Nübel|POR|33|80; Josha Vagnoman|DEF|3|75; Jeff Chabot|DEF|20|76;
    Ramon Hendriks|DEF|4|74; Maximilian Mittelstädt|DEF|6|78; Angelo Stiller|MED|6|81;
    Atakan Karazor|MED|16|76; Chris Führich|DEL|27|78; Jamie Leweling|DEL|10|76;
    Ermedin Demirović|DEL|9|78; Deniz Undav|DEL|26|81`),
  c('vfl', 'VfL Wolfsburgo', 'WOB', 74, 73, 74, '#65B32E', 'Volkswagen Arena', 'Wolfsburgo', `
    Kamil Grabara|POR|1|77; Joakim Mæhle|DEF|2|75; Cédric Zesiger|DEF|5|73;
    Konstantinos Koulierakis|DEF|4|75; Maxence Lacroix|DEF|3|77; Mattias Svanberg|MED|8|75;
    Aster Vranckx|MED|27|74; Yannick Gerhardt|MED|31|73; Patrick Wimmer|DEL|11|75;
    Jonas Wind|DEL|21|77; Mohammed Amoura|DEL|9|77`),
  c('fcu', 'Union Berlín', 'FCU', 71, 68, 73, '#EB1923', 'An der Alten Försterei', 'Berlín', `
    Frederik Rønnow|POR|1|76; Christopher Trimmel|DEF|28|72; Danilho Doekhi|DEF|4|75;
    Diogo Leite|DEF|25|75; Tom Rothe|DEF|3|73; Rani Khedira|MED|21|74;
    János Kovács|MED|8|71; Andrej Ilić|DEL|9|73; Ilyas Ansah|DEL|11|72;
    Oliver Burke|DEL|33|72; Benedict Hollerbach|DEL|24|73`),
  c('scf', 'SC Friburgo', 'SCF', 76, 74, 76, '#000000', 'Europa-Park Stadion', 'Friburgo', `
    Noah Atubolu|POR|1|76; Lukas Kübler|DEF|31|72; Matthias Ginter|DEF|4|77;
    Philipp Lienhart|DEF|3|75; Christian Günter|DEF|30|75; Maximilian Eggestein|MED|8|75;
    Patrick Osterhage|MED|18|73; Vincenzo Grifo|MED|32|78; Ritsu Doan|DEL|42|79;
    Lucas Höler|DEL|9|73; Junior Adamu|DEL|17|73`),
  c('m05', 'Mainz 05', 'M05', 73, 71, 74, '#C3141E', 'Mewa Arena', 'Maguncia', `
    Robin Zentner|POR|27|75; Silvan Widmer|DEF|3|74; Stefan Bell|DEF|4|72;
    Sepp van den Berg|DEF|17|76; Danny da Costa|DEF|24|72; Kaishu Sano|MED|6|74;
    Nadiem Amiri|MED|10|77; Paul Nebel|MED|14|74; Jonathan Burkardt|DEL|9|78;
    Armindo Sieb|DEL|20|74; Nelson Weiper|DEL|29|73`),
  c('bmg', 'Borussia Mönchengladbach', 'BMG', 73, 72, 72, '#000000', 'Borussia-Park', 'Mönchengladbach', `
    Moritz Nicolas|POR|1|73; Joe Scally|DEF|29|75; Ko Itakura|DEF|3|77;
    Nico Elvedi|DEF|30|76; Luca Netz|DEF|4|74; Rocco Reitz|MED|8|75;
    Julian Weigl|MED|21|75; Kevin Stöger|MED|7|75; Franck Honorat|DEL|17|76;
    Tim Kleindienst|DEL|45|77; Haris Tabaković|DEL|9|74`),
  c('tsg', 'TSG Hoffenheim', 'TSG', 72, 72, 70, '#1961B5', 'PreZero Arena', 'Sinsheim', `
    Oliver Baumann|POR|1|77; Pavel Kadeřábek|DEF|2|73; Stanley Nsoki|DEF|21|73;
    Ozan Kabak|DEF|31|76; Robin Hranáč|DEF|3|72; Anton Stach|MED|33|75;
    Grischa Prömel|MED|6|75; Andrej Kramarić|DEL|27|78; Bazoumana Touré|DEL|22|73;
    Fisnik Asllani|DEL|9|73; Wouter Burger|MED|8|73`),
  c('wer', 'Werder Bremen', 'WER', 72, 71, 71, '#1D9053', 'Weserstadion', 'Bremen', `
    Michael Zetterer|POR|30|74; Julián Malatini|DEF|4|72; Marco Friedl|DEF|32|75;
    Niklas Stark|DEF|5|73; Mitchell Weiser|DEF|8|75; Jens Stage|MED|6|74;
    Senne Lynen|MED|17|74; Romano Schmid|MED|20|75; Marco Grüll|DEL|11|73;
    Marvin Ducksch|DEL|7|77; Justin Njinmah|DEL|24|73`),
  c('fca', 'FC Augsburgo', 'FCA', 70, 68, 71, '#BA3733', 'WWK Arena', 'Augsburgo', `
    Finn Dahmen|POR|22|73; Mads Pedersen|DEF|17|73; Keven Schlotterbeck|DEF|29|72;
    Chrislain Matsima|DEF|4|72; Robin Gosens|DEF|21|78; Elvis Rexhbeçaj|MED|30|72;
    Arne Maier|MED|10|73; Kristijan Jakić|MED|4|73; Alexis Claude-Maurice|DEL|11|74;
    Phillip Tietz|DEL|29|72; Samuel Essende|DEL|9|72`),
  c('sca', 'FC St. Pauli', 'STP', 67, 64, 69, '#614F45', 'Millerntor-Stadion', 'Hamburgo', `
    Nikola Vasilj|POR|1|72; Philipp Treu|DEF|17|69; Hauke Wahl|DEF|4|71;
    Karol Mets|DEF|5|70; Manolis Saliakas|DEF|2|70; Jackson Irvine|MED|16|73;
    Carlo Boukhalfa|MED|6|70; Johannes Eggestein|DEL|24|71; Andréas Hountondji|DEL|9|70;
    Morgan Guilavogui|DEL|11|70; Danel Sinani|MED|10|71`),
  c('hei', 'FC Heidenheim', 'HDH', 66, 64, 67, '#E30613', 'Voith-Arena', 'Heidenheim', `
    Kevin Müller|POR|1|71; Marnon Busch|DEF|22|69; Patrick Mainka|DEF|6|70;
    Benedikt Gimber|DEF|32|69; Omar Traoré|DEF|5|68; Jan Schöppner|MED|20|70;
    Niklas Dorsch|MED|17|71; Adrian Beck|MED|8|69; Mathias Honsak|DEL|27|70;
    Budu Zivzivadze|DEL|11|71; Sirlord Conteh|DEL|39|69`),
  c('hsv', 'Hamburgo SV', 'HSV', 69, 67, 70, '#0A5CA8', 'Volksparkstadion', 'Hamburgo', `
    Daniel Heuer Fernandes|POR|1|72; Guilherme Ramos|DEF|4|70; Sebastian Schonlau|DEF|6|71;
    Dennis Hadžikadunić|DEF|5|70; Miro Muheim|DEF|17|71; Jonas Meffert|MED|8|72;
    Nicolás Capaldo|MED|5|73; Fábio Vieira|MED|10|76; Ransford Königsdörffer|DEL|7|71;
    Robert Glatzel|DEL|9|73; Davie Selke|DEL|27|72`),
  c('koe', '1. FC Colonia', 'KOE', 68, 67, 68, '#ED1C24', 'RheinEnergieStadion', 'Colonia', `
    Marvin Schwäbe|POR|1|73; Joel Schmied|DEF|4|69; Timo Hübers|DEF|5|71;
    Dominique Heintz|DEF|3|69; Leart Paqarada|DEF|22|70; Eric Martel|MED|6|72;
    Denis Huseinbašić|MED|8|70; Florian Kainz|MED|30|74; Linton Maina|DEL|17|71;
    Damion Downs|DEL|9|71; Said El Mala|DEL|11|72`),
];

export const LIGUE1: FilaClub[] = [
  c('psg', 'Paris Saint-Germain', 'PSG', 90, 91, 87, '#004170', 'Parc des Princes', 'París', `
    Lucas Chevalier|POR|30|81; Achraf Hakimi|DEF|2|85; Marquinhos|DEF|5|85;
    Willian Pacho|DEF|51|82; Nuno Mendes|DEF|25|84; Vitinha|MED|17|86;
    João Neves|MED|87|84; Fabián Ruiz|MED|8|83; Ousmane Dembélé|DEL|10|87;
    Bradley Barcola|DEL|29|81; Désiré Doué|DEL|14|82; Khvicha Kvaratskhelia|DEL|7|85`),
  c('mar', 'Olympique de Marsella', 'OM', 82, 82, 80, '#2FAEE0', 'Orange Vélodrome', 'Marsella', `
    Gerónimo Rulli|POR|16|79; Amir Murillo|DEF|24|75; Leonardo Balerdi|DEF|5|79;
    CJ Egan-Riley|DEF|3|71; Facundo Medina|DEF|12|77; Arkadiusz Milik|DEL|19|76;
    Geoffrey Kondogbia|MED|8|78; Adrien Rabiot|MED|25|83; Mason Greenwood|DEL|10|82;
    Amine Gouiri|DEL|9|78; Pierre-Emerick Aubameyang|DEL|97|78; Igor Paixão|DEL|11|79`),
  c('mon', 'AS Mónaco', 'MON', 80, 80, 78, '#CE242D', 'Stade Louis II', 'Mónaco', `
    Philipp Köhn|POR|39|76; Vanderson|DEF|22|78; Thilo Kehrer|DEF|4|78;
    Mohammed Salisu|DEF|17|76; Caio Henrique|DEF|12|76; Denis Zakaria|MED|20|80;
    Lamine Camara|MED|6|76; Maghnes Akliouche|MED|11|80; Takumi Minamino|DEL|18|76;
    Folarin Balogun|DEL|29|78; Mika Biereth|DEL|9|77; Ansu Fati|DEL|31|76`),
  c('lil', 'Lille OSC', 'LIL', 78, 77, 78, '#E01E13', 'Stade Pierre-Mauroy', 'Lille', `
    Berke Özer|POR|30|76; Thomas Meunier|DEF|24|74; Aïssa Mandi|DEF|22|74;
    Alexsandro|DEF|5|77; Romain Perraud|DEF|3|74; Benjamin André|MED|21|76;
    Ayyoub Bouaddi|MED|32|76; Ngal'ayel Mukau|MED|8|75; Hamza Igamane|DEL|9|75;
    Olivier Giroud|DEL|17|76; Félix Correia|DEL|11|74`),
  c('lyo', 'Olympique de Lyon', 'OL', 78, 77, 77, '#E4022E', 'Groupama Stadium', 'Lyon', `
    Rémy Descamps|POR|1|74; Ainsley Maitland-Niles|DEF|15|75; Moussa Niakhaté|DEF|4|76;
    Clinton Mata|DEF|3|76; Nicolás Tagliafico|DEF|2|78; Corentin Tolisso|MED|8|78;
    Tanner Tessmann|MED|32|74; Pavel Šulc|MED|20|77; Malick Fofana|DEL|11|79;
    Martín Satriano|DEL|9|74; Afonso Moreira|DEL|17|74`),
  c('nic', 'OGC Niza', 'NIC', 75, 74, 75, '#E30613', 'Allianz Riviera', 'Niza', `
    Yehvann Diouf|POR|1|74; Jonathan Clauss|DEF|7|77; Dante|DEF|31|74;
    Melvin Bard|DEF|22|75; Antoine Mendy|DEF|2|72; Morgan Sanson|MED|8|74;
    Hicham Boudaoui|MED|6|74; Tom Louchet|MED|18|72; Sofiane Diop|DEL|10|76;
    Terem Moffi|DEL|9|76; Kevin Carlos|DEL|11|73`),
  c('ren', 'Stade Rennais', 'REN', 76, 76, 74, '#E23B33', 'Roazhon Park', 'Rennes', `
    Brice Samba|POR|30|78; Anthony Rouault|DEF|4|74; Jérémy Jacquet|DEF|5|74;
    Alidu Seidu|DEF|2|73; Adrien Truffert|DEF|3|76; Djaoui Cissé|MED|8|73;
    Valentin Rongier|MED|21|77; Ludovic Blas|MED|10|77; Estéban Lepaul|DEL|9|75;
    Breel Embolo|DEL|36|77; Mahdi Camara|MED|6|73`),
  c('str', 'RC Estrasburgo', 'STR', 75, 76, 72, '#009FE3', 'Stade de la Meinau', 'Estrasburgo', `
    Mike Penders|POR|1|74; Guela Doué|DEF|2|75; Ismaël Doukouré|DEF|4|74;
    Mamadou Sarr|DEF|5|74; Marvin Barnes-Homer|DEF|3|71; Habib Diarra|MED|6|77;
    Andrey Santos|MED|8|78; Dilane Bakwa|DEL|11|77; Emanuel Emegha|DEL|9|77;
    Joaquín Panichelli|DEL|19|75; Félix Lemaréchal|MED|10|74`),
  c('len', 'RC Lens', 'LEN', 75, 73, 76, '#FFE500', 'Stade Bollaert-Delelis', 'Lens', `
    Robin Risser|POR|1|73; Jonathan Gradit|DEF|24|75; Facundo Medina|DEF|22|77;
    Malang Sarr|DEF|3|74; Deiver Machado|DEF|12|74; Adrien Thomasson|MED|20|75;
    Neil El Aynaoui|MED|8|75; Florian Sotoca|DEL|7|76; Wesley Saïd|DEL|11|74;
    M'Bala Nzola|DEL|9|73; Odsonne Édouard|DEL|10|74`),
  c('bre', 'Stade Brestois', 'BRE', 71, 70, 71, '#E30613', 'Stade Francis-Le Blé', 'Brest', `
    Marco Bizot|POR|1|76; Kenny Lala|DEF|29|72; Lilian Brassier|DEF|3|73;
    Soumaïla Coulibaly|DEF|4|72; Bradley Locko|DEF|20|73; Mahdi Camara|MED|6|73;
    Pierre Lees-Melou|MED|8|75; Romain Del Castillo|MED|10|75; Ludovic Ajorque|DEL|9|75;
    Abdallah Sima|DEL|11|74; Kamory Doumbia|MED|18|73`),
  c('tou', 'Toulouse FC', 'TFC', 71, 70, 71, '#5F259F', 'Stadium de Toulouse', 'Toulouse', `
    Guillaume Restes|POR|1|76; Rasmus Nicolaisen|DEF|4|72; Charlie Cresswell|DEF|5|74;
    Kévin Keben|DEF|3|71; Gabriel Suazo|DEF|12|74; Vincent Sierro|MED|8|74;
    Cristian Cásseres|MED|6|73; Aron Dønnum|DEL|11|74; Yann Gboho|DEL|10|74;
    Frank Magri|DEL|9|73; Santiago Hidalgo|DEL|19|71`),
  c('nan', 'FC Nantes', 'NAN', 68, 65, 70, '#FFE500', 'Stade de la Beaujoire', 'Nantes', `
    Anthony Lopes|POR|1|75; Nathan Zézé|DEF|4|72; Nicolas Cozza|DEF|3|72;
    Chidozie Awaziem|DEF|5|71; Jean-Kévin Duverne|DEF|24|70; Douglas Augusto|MED|8|72;
    Johann Lepenant|MED|6|72; Mostafa Mohamed|DEL|9|73; Matthis Abline|DEL|11|74;
    Herba Guirassy|DEL|10|70; Louis Leroux|MED|20|70`),
  c('aux', 'AJ Auxerre', 'AUX', 67, 65, 68, '#0067B1', 'Stade Abbé-Deschamps', 'Auxerre', `
    Donovan Léon|POR|30|71; Paul Joly|DEF|29|69; Jubal|DEF|4|70;
    Clément Akpa|DEF|5|69; Gaëtan Perrin|MED|10|72; Elisha Owusu|MED|6|71;
    Rayan Raveloson|MED|8|71; Lasso Coulibaly|MED|18|69; Gauthier Hein|DEL|11|71;
    Sinaly Diomandé|DEF|3|70; Théo Bair|DEL|9|71`),
  c('ang', 'Angers SCO', 'ANG', 66, 63, 68, '#000000', 'Stade Raymond Kopa', 'Angers', `
    Yahia Fofana|POR|16|72; Ibrahim Amadou|DEF|4|70; Jean-Eudes Aholou|DEF|5|71;
    Zinédine Ould Khaled|MED|8|69; Himad Abdelli|MED|10|74; Jim Allevinah|DEL|11|70;
    Esteban Lepaul|DEL|9|75; Marouan Fakhreddine|MED|6|69; Yann Kitala|DEL|19|69;
    Emmanuel Biumla|DEF|3|68; Louis Mouton|MED|20|69`),
  c('mtp', 'Montpellier HSC', 'MHSC', 66, 64, 67, '#0B2A6B', 'Stade de la Mosson', 'Montpellier', `
    Benjamin Lecomte|POR|1|73; Issiaga Sylla|DEF|3|70; Christopher Jullien|DEF|5|71;
    Kiki Kouyaté|DEF|4|70; Enzo Tchato|DEF|2|69; Joris Chotard|MED|8|72;
    Téji Savanier|MED|10|76; Jordan Ferri|MED|6|71; Akor Adams|DEL|9|72;
    Musa Al-Taamari|DEL|7|74; Becir Omeragic|DEF|24|70`),
  c('hav', 'Le Havre AC', 'HAC', 65, 62, 67, '#0B2A6B', 'Stade Océane', 'Le Havre', `
    Mory Diaw|POR|30|71; Arouna Sangante|DEF|4|70; Yassine Kechta|MED|10|69;
    Gautier Lloris|DEF|5|70; Antoine Joujou|MED|8|68; Rassoul Ndiaye|MED|6|69;
    Abdoulaye Touré|MED|21|72; Josué Casimir|DEL|11|69; Ayumu Seko|DEF|3|70;
    Simon Ebonog|DEL|9|68; Issa Soumaré|DEL|7|69`),
  c('mez', 'FC Metz', 'MET', 64, 62, 65, '#8A0F1E', 'Stade Saint-Symphorien', 'Metz', `
    Jonathan Fischer|POR|30|69; Matthieu Udol|DEF|24|70; Koffi Kouao|DEF|4|68;
    Sadibou Sané|DEF|5|68; Fali Candé|DEF|3|68; Joseph N'Duquidi|MED|6|68;
    Habib Diallo|DEL|9|74; Gauthier Hein|DEL|11|71; Cheikh Sabaly|DEL|7|69;
    Idrissa Gueye|MED|8|69; Boubacar Traoré|MED|18|70`),
  c('par2', 'Paris FC', 'PFC', 68, 67, 68, '#0B2A6B', 'Stade Jean-Bouin', 'París', `
    Obed Nkambadio|POR|1|71; Thibault De Smet|DEF|3|70; Otávio|DEF|5|71;
    Maxime Lopez|MED|8|75; Vincent Marchetti|MED|10|71; Ilan Kebbal|MED|7|73;
    Jean-Philippe Krasso|DEL|9|73; Moses Simon|DEL|11|76; Adama Camara|MED|6|70;
    Samir Chergui|DEF|4|70; Willem Geubbels|DEL|19|72`),
];

export const OTROS_EUROPA: FilaClub[] = [
  c('spo', 'Sporting CP', 'SCP', 82, 82, 80, '#008057', 'José Alvalade', 'Lisboa', `
    Rui Silva|POR|1|78; Ousmane Diomande|DEF|25|80; Gonçalo Inácio|DEF|22|80;
    Zeno Debast|DEF|4|76; Nuno Santos|DEF|8|76; Morten Hjulmand|MED|42|80;
    Hidemasa Morita|MED|5|77; Pedro Gonçalves|DEL|28|80; Geovany Quenda|DEL|47|79;
    Luis Suárez|DEL|9|77; Francisco Trincão|DEL|11|79`),
  c('ben', 'Benfica', 'SLB', 82, 81, 81, '#E30613', 'Estádio da Luz', 'Lisboa', `
    Anatoliy Trubin|POR|1|80; Álvaro Carreras|DEF|3|79; Nicolás Otamendi|DEF|30|80;
    António Silva|DEF|4|78; Alexander Bah|DEF|34|76; Florentino Luís|MED|61|78;
    Orkun Kökçü|MED|10|78; Fredrik Aursnes|MED|8|78; Ángel Di María|DEL|11|80;
    Vangelis Pavlidis|DEL|14|78; Kerem Aktürkoğlu|DEL|17|77`),
  c('fcp', 'FC Oporto', 'FCP', 81, 80, 80, '#00428C', 'Estádio do Dragão', 'Oporto', `
    Diogo Costa|POR|99|84; João Mário|DEF|20|76; Nehuén Pérez|DEF|4|77;
    Zé Pedro|DEF|3|75; Francisco Moura|DEF|14|75; Alan Varela|MED|22|79;
    Stephen Eustáquio|MED|16|76; Rodrigo Mora|MED|10|79; Pepê|DEL|7|79;
    Samu Aghehowa|DEL|9|79; Gabri Veiga|MED|8|78`),
  c('bra', 'SC Braga', 'SCB', 76, 75, 75, '#E30613', 'Estádio Municipal', 'Braga', `
    Hornicek|POR|1|74; Víctor Gómez|DEF|22|73; Sikou Niakaté|DEF|5|74;
    Paulo Oliveira|DEF|3|73; Adrián Marín|DEF|12|73; Rodrigo Zalazar|MED|10|76;
    João Moutinho|MED|8|74; Ricardo Horta|DEL|21|77; Fran Navarro|DEL|9|74;
    Roger Fernandes|DEL|17|74; Gabri Martínez|DEL|11|73`),
  c('aja', 'Ajax', 'AJA', 78, 78, 76, '#D2122E', 'Johan Cruijff ArenA', 'Ámsterdam', `
    Remko Pasveer|POR|22|74; Anton Gaaei|DEF|2|73; Youri Baas|DEF|4|75;
    Josip Šutalo|DEF|6|76; Owen Wijndal|DEF|17|74; Jordan Henderson|MED|6|76;
    Kenneth Taylor|MED|8|78; Davy Klaassen|MED|14|76; Mika Godts|DEL|11|76;
    Wout Weghorst|DEL|9|75; Steven Berghuis|DEL|7|76`),
  c('psv', 'PSV Eindhoven', 'PSV', 81, 82, 78, '#EE1C25', 'Philips Stadion', 'Eindhoven', `
    Walter Benítez|POR|1|78; Sergiño Dest|DEF|2|78; Ryan Flamingo|DEF|4|76;
    Yarek Gasiorowski|DEF|5|74; Anass Salah-Eddine|DEF|3|75; Joey Veerman|MED|23|79;
    Jerdy Schouten|MED|6|79; Guus Til|MED|8|77; Ivan Perišić|DEL|14|79;
    Ricardo Pepi|DEL|9|75; Dennis Man|DEL|7|77; Ismael Saibari|MED|10|77`),
  c('fey', 'Feyenoord', 'FEY', 77, 77, 75, '#E30613', 'De Kuip', 'Róterdam', `
    Timon Wellenreuther|POR|1|75; Bart Nieuwkoop|DEF|2|73; Gijs Smal|DEF|3|74;
    Thomas Beelen|DEF|4|74; Anel Ahmedhodžić|DEF|5|76; Quinten Timber|MED|20|79;
    In-beom Hwang|MED|6|77; Antoni Milambo|MED|8|76; Igor Paixão|DEL|11|79;
    Ayase Ueda|DEL|9|75; Anis Hadj Moussa|DEL|7|75`),
  c('gal', 'Galatasaray', 'GAL', 80, 81, 77, '#FDB912', 'RAMS Park', 'Estambul', `
    Uğurcan Çakır|POR|1|78; Wilfried Singo|DEF|4|79; Davinson Sánchez|DEF|6|78;
    Abdülkerim Bardakcı|DEF|5|75; Ismail Jakobs|DEF|3|75; Lucas Torreira|MED|34|79;
    Gabriel Sara|MED|20|78; Leroy Sané|DEL|19|82; Barış Alper Yılmaz|DEL|53|77;
    Victor Osimhen|DEL|45|86; Yunus Akgün|DEL|7|76`),
  c('fen', 'Fenerbahçe', 'FEN', 79, 79, 77, '#FFED00', 'Şükrü Saracoğlu', 'Estambul', `
    Ederson|POR|1|84; Nélson Semedo|DEF|22|75; Milan Škriniar|DEF|37|81;
    Jayden Oosterwolde|DEF|3|76; Levent Mercan|DEF|21|73; İsmail Yüksek|MED|5|75;
    Fred|MED|8|78; Sebastian Szymański|MED|10|78; Kerem Aktürkoğlu|DEL|7|77;
    Youssef En-Nesyri|DEL|9|78; Anderson Talisca|DEL|11|77`),
  c('cel2', 'Celtic', 'CEL', 76, 77, 74, '#008C45', 'Celtic Park', 'Glasgow', `
    Kasper Schmeichel|POR|1|76; Alistair Johnston|DEF|56|76; Cameron Carter-Vickers|DEF|6|77;
    Liam Scales|DEF|4|74; Greg Taylor|DEF|3|73; Callum McGregor|MED|42|77;
    Reo Hatate|MED|41|76; Arne Engels|MED|8|75; Nicolas Kühn|DEL|18|76;
    Daizen Maeda|DEL|38|76; Adam Idah|DEL|9|73`),
  c('ran', 'Rangers', 'RAN', 74, 74, 73, '#0B2A6B', 'Ibrox Stadium', 'Glasgow', `
    Jack Butland|POR|1|76; James Tavernier|DEF|2|75; John Souttar|DEF|4|74;
    Leon Balogun|DEF|5|72; Ridvan Yılmaz|DEF|3|73; Nicolas Raskin|MED|43|75;
    Mohamed Diomande|MED|18|74; Vaclav Cerny|DEL|11|74; Cyriel Dessers|DEL|9|72;
    Hamza Igamane|DEL|17|75; Ianis Hagi|MED|10|74`),
  c('rbs', 'Red Bull Salzburgo', 'RBS', 74, 74, 72, '#E30613', 'Red Bull Arena', 'Salzburgo', `
    Alexander Schlager|POR|1|74; Amar Dedić|DEF|2|76; Jacob Rasmussen|DEF|4|72;
    Hendry Blank|DEF|5|74; Joane Gadou|DEF|3|72; Mads Bidstrup|MED|6|74;
    Maurits Kjærgaard|MED|10|76; Petar Ratkov|DEL|9|74; Karim Konaté|DEL|11|75;
    Dorgeles Nene|DEL|7|75; Bobby Clark|MED|8|74`),
  c('cbr', 'Club Brujas', 'CLB', 76, 76, 74, '#0B2A6B', 'Jan Breydelstadion', 'Brujas', `
    Simon Mignolet|POR|22|77; Kyriani Sabbe|DEF|2|73; Brandon Mechele|DEF|44|74;
    Joel Ordóñez|DEF|4|76; Bjorn Meijer|DEF|3|74; Hans Vanaken|MED|20|77;
    Raphael Onyedika|MED|8|76; Ardon Jashari|MED|6|76; Christos Tzolis|DEL|11|78;
    Ferran Jutglà|DEL|9|76; Chemsdine Talbi|DEL|7|73`),
  c('ola', 'Olympiacos', 'OLY', 75, 74, 74, '#E30613', 'Karaiskakis', 'El Pireo', `
    Konstantinos Tzolakis|POR|1|74; Rodinei|DEF|2|74; Panagiotis Retsos|DEF|3|74;
    David Carmo|DEF|4|74; Francisco Ortega|DEF|12|73; Santiago Hezze|MED|5|74;
    Chiquinho|MED|8|75; Daniel Podence|DEL|10|76; Gelson Martins|DEL|7|75;
    Ayoub El Kaabi|DEL|9|76; Rodrigo Costa|DEL|11|73`),
  c('sha', 'Shakhtar Donetsk', 'SHK', 73, 73, 71, '#F58220', 'Arena Lviv', 'Lviv', `
    Dmytro Riznyk|POR|1|74; Yukhym Konoplia|DEF|2|73; Mykola Matviyenko|DEF|22|76;
    Valeriy Bondar|DEF|27|73; Irakli Azarovi|DEF|3|72; Marlon Gomes|MED|8|73;
    Oleh Ocheretko|MED|6|72; Georgiy Sudakov|MED|10|79; Kevin|DEL|11|75;
    Eguinaldo|DEL|9|73; Newerton|DEL|7|72`),
  c('sla', 'Slavia Praga', 'SLA', 72, 71, 72, '#E30613', 'Eden Aréna', 'Praga', `
    Jindřich Staněk|POR|1|74; David Douděra|DEF|22|71; David Zima|DEF|3|72;
    Igoh Ogbu|DEF|5|73; El Hadji Malick Diouf|DEF|21|73; Oscar Dorley|MED|6|72;
    Christos Zafeiris|MED|8|73; Lukáš Provod|MED|20|74; Vasil Kušej|DEL|11|72;
    Mojmír Chytil|DEL|9|71; Tomáš Chorý|DEL|32|72`),
  c('cop', 'FC Copenhague', 'FCK', 71, 70, 71, '#0B2A6B', 'Parken', 'Copenhague', `
    Dominik Kotarski|POR|1|72; Elias Achouri|DEL|11|71; Gabriel Pereira|DEF|3|70;
    Scott McKenna|DEF|5|73; Birger Meling|DEF|20|72; Rasmus Falk|MED|33|73;
    Lukas Lerager|MED|17|72; Mohamed Elyounoussi|MED|7|74; Andreas Cornelius|DEL|9|73;
    Jordan Larsson|DEL|10|73; Viktor Dadason|DEL|19|69`),
  c('bod', 'Bodø/Glimt', 'BOD', 72, 73, 70, '#FDD100', 'Aspmyra Stadion', 'Bodø', `
    Nikita Haikin|POR|1|72; Fredrik Bjørkan|DEF|3|72; Odin Bjørtuft|DEF|5|71;
    Brede Moe|DEF|4|71; Villads Nielsen|DEF|2|70; Patrick Berg|MED|6|74;
    Håkon Evjen|MED|8|73; Sondre Brunstad Fet|MED|10|72; Jens Petter Hauge|DEL|11|75;
    Kasper Høgh|DEL|9|73; Ole Blomberg|DEL|7|72`),
];
