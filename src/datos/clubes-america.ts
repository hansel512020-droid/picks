import { c, type FilaClub } from './club';

/** Clubes de America: Liga MX, MLS, Brasileirao, Argentina y el resto de CONMEBOL. */

export const LIGAMX: FilaClub[] = [
  c('ame', 'Club América', 'AME', 80, 80, 78, '#FFE500', 'Estadio Azteca', 'Ciudad de México', `
    Luis Ángel Malagón|POR|1|77; Kevin Álvarez|DEF|21|75; Sebastián Cáceres|DEF|22|76;
    Igor Lichnovsky|DEF|4|76; Cristian Borja|DEF|17|73; Álvaro Fidalgo|MED|8|79;
    Diego Valdés|MED|10|77; Brian Rodríguez|DEL|11|76;
    Henry Martín|DEL|21|77; Alejandro Zendejas|DEL|20|76`),
  c('cru', 'Cruz Azul', 'CAZ', 79, 78, 79, '#00549F', 'Estadio Ciudad de los Deportes', 'Ciudad de México', `
    Kevin Mier|POR|1|76; Jorge Sánchez|DEF|2|74; Willer Ditta|DEF|23|75;
    Gonzalo Piovi|DEF|4|76; Erik Lira|MED|6|74; Carlos Rodríguez|MED|20|76;
    Lorenzo Faravelli|MED|10|76; Ignacio Rivero|MED|8|74; Ángel Sepúlveda|DEL|9|74;
    Gabriel Fernández|DEL|11|74; Luka Romero|DEL|7|76`),
  c('mty', 'Monterrey', 'MTY', 80, 81, 77, '#00274C', 'Estadio BBVA', 'Monterrey', `
    Esteban Andrada|POR|1|76; Stefan Medina|DEF|4|74; Víctor Guzmán|DEF|3|74;
    Ricardo Chávez|DEF|2|72; Sergio Canales|MED|10|81; Óliver Torres|MED|8|77;
    Jorge Rodríguez|MED|6|73; Lucas Ocampos|DEL|11|78; Germán Berterame|DEL|9|76;
    Sergio Ramos|DEF|93|78; Roberto de la Rosa|DEL|7|73; Brandon Vázquez|DEL|29|77`),
  c('tig', 'Tigres UANL', 'TIG', 79, 78, 78, '#FFB81C', 'Estadio Universitario', 'San Nicolás', `
    Nahuel Guzmán|POR|1|75; Jesús Angulo|DEF|4|74; Rómulo Zwarg|DEF|3|73;
    Juan Brunetta|MED|10|77; Fernando Gorriarán|MED|8|76;
    Guido Pizarro|MED|19|74; Diego Lainez|DEL|11|75; Ángel Correa|DEL|9|79;
    Nicolás Ibáñez|DEL|30|75; Ozziel Herrera|DEL|7|73`),
  c('gua', 'Chivas de Guadalajara', 'GDL', 76, 75, 75, '#E30613', 'Estadio Akron', 'Zapopan', `
    Raúl Rangel|POR|1|75; Alan Mozo|DEF|2|74;
    Bryan González|DEF|22|72; Fernando González|MED|6|73;
    Roberto Alvarado|DEL|25|76; Isaac Brizuela|DEL|30|72; Armando González|DEL|9|72;
    Javier Hernández|DEL|14|73; Kevin Castañeda|DEL|17|73`),
  c('pum', 'Pumas UNAM', 'PUM', 74, 74, 72, '#00274C', 'Estadio Olímpico Universitario', 'Ciudad de México', `
    Keylor Navas|POR|1|79; Ricardo Galindo|DEF|2|71; Nathan Silva|DEF|4|73;
    Álvaro Angulo|DEF|3|73; Pedro Vite|MED|8|74;
    Santiago Trigos|MED|6|71; Aaron Ramsey|MED|10|76; Guillermo Martínez|DEL|9|72;
    José Caicedo|MED|5|72; Adalberto Carrasquilla|MED|21|73; Jesús Rivas|DEF|2|69`),
  c('too', 'Toluca', 'TOL', 79, 81, 74, '#E30613', 'Estadio Nemesio Díez', 'Toluca', `
    Hugo González|POR|1|74; Jesús Gallardo|DEF|23|76; Federico Pereira|DEF|4|73;
    Everardo López|DEF|3|72; Marcel Ruiz|MED|8|76; Jean Meneses|MED|11|75;
    Juan Domínguez|MED|6|73; Alexis Vega|DEL|10|76; Paulinho|DEL|9|78;
    Nicolás Castro|DEL|7|74; Helinho|DEL|20|75`),
  c('pac', 'Mazatlán FC', 'MAZ', 68, 66, 69, '#8A1E8A', 'Estadio El Encanto', 'Mazatlán', `
    Ricardo Gutiérrez|POR|1|70; Facundo Almada|DEF|4|70; Nicolás Benedetti|MED|10|72;
    Bryan Colula|DEF|2|69; Jordan Sierra|MED|6|70; Fabio Gomes|DEL|9|71;
    Ramiro Árciga|DEL|7|69; Andrés Montaño|MED|8|69; Iván Moreno|DEL|11|69;
    Facundo Batista|DEL|19|70; Kevin Balanta|MED|5|70`),
  c('sla', 'Santos Laguna', 'SAN', 70, 69, 70, '#00A650', 'Estadio Corona', 'Torreón', `
    Carlos Acevedo|POR|1|75; Ismael Govea|DEF|2|70; Néstor Araujo|DEF|4|72;
    Bruno Amione|DEF|3|72; José Abella|DEF|20|70; Juan Brunetta|MED|10|77;
    Aldo López|MED|6|69; Ramiro Sordo|DEL|9|70; Bruno Barticciotto|DEL|11|72;
    Anthony Lozano|DEL|7|71; Cristian Dájome|DEL|19|71; Efraín Orona|DEF|23|69;
    Carlos Gruezo|MED|5|75; Lucas Di Yorio|DEL|18|72`),
  c('nec', 'Necaxa', 'NEC', 70, 69, 70, '#E30613', 'Estadio Victoria', 'Aguascalientes', `
    Ezequiel Unsain|POR|1|72; Alexis Peña|DEF|4|70; Alan Montes|DEF|3|69;
    Agustín Oliveros|DEF|2|71; Diber Cambindo|DEL|9|73; Kevin Rosero|MED|8|70;
    Tomás Badaloni|MED|6|70; Ricardo Monreal|DEL|11|70; Fernando Arce|MED|10|71;
    José Paradela|MED|20|73; Franco Fagúndez|DEL|7|71; Julián Carranza|DEL|17|76`),
  c('atl', 'Atlas', 'ATL', 70, 68, 71, '#E30613', 'Estadio Jalisco', 'Guadalajara', `
    Camilo Vargas|POR|1|76; Gaddi Aguirre|DEF|2|70; Idekel Domínguez|DEF|4|69;
    Matheus Doria|DEF|3|71; Aldo Rocha|MED|5|71; Jeremy Márquez|MED|6|70;
    Mateo García|DEL|11|71; Diego González|MED|10|71; Uroš Đurđević|DEL|9|72;
    Juan Fernando Quintero|MED|8|76; Diego Barbosa|DEF|22|70`),
  c('leo', 'Club León', 'LEO', 73, 73, 72, '#00A650', 'Estadio León', 'León', `
    Óscar Whalley|POR|1|72; Adonis Frías|DEF|4|73; Stiven Barreiro|DEF|3|71;
    Iván Moreno|DEF|2|70; James Rodríguez|MED|10|81; Elías Hernández|MED|11|70;
    Fidel Ambriz|MED|6|71; Lucas Romero|MED|8|72; Ismael Díaz|DEL|9|71;
    Ali Ávila|DEL|7|70; Andrés Guardado|MED|18|73`),
  c('pue', 'Puebla', 'PUE', 66, 64, 67, '#0B2A6B', 'Estadio Cuauhtémoc', 'Puebla', `
    Julio González|POR|1|70; Sebastián Sosa|DEF|4|68; Emmanuel Loeschbor|DEF|3|68;
    Diego de Buen|MED|6|69; Ricardo Marín|DEL|9|69;
    Emiliano Gómez|MED|8|68; Guillermo Martínez|DEL|11|69; Kevin Velasco|DEL|7|69;
    Luis Rodríguez|DEF|21|69`),
  c('qro', 'Querétaro', 'QRO', 66, 64, 67, '#0B2A6B', 'Estadio Corregidora', 'Querétaro', `
    Guillermo Allison|POR|1|70; Omar Mendoza|DEF|4|68; Rodrigo Bogarín|DEF|3|68;
    Sebastián Vegas|DEF|2|70; Jonathan Perlaza|MED|6|68; Pablo Barrera|MED|10|69;
    Ali Ávila|DEL|11|70; Federico Lértora|MED|8|69; Guillermo Rojas|DEL|9|68;
    Diego Martínez|MED|20|68; Alexis Gutiérrez|MED|5|68`),
  c('tij', 'Club Tijuana', 'TIJ', 70, 69, 70, '#E30613', 'Estadio Caliente', 'Tijuana', `
    Antonio Rodríguez|POR|1|71; Rafael Fernández|DEF|4|70; Domingo Blanco|MED|8|71;
    José Rivero|MED|6|70; Gilberto Mora|MED|10|76;
    Mourad El Ghezouani|DEF|3|69; Ramiro Árciga|DEL|7|69; Frank Boya|MED|5|70;
    Amaury Escoto|DEL|9|70; Jesús Ricardo Angulo|DEF|2|70`),
  c('juz', 'FC Juárez', 'JUA', 69, 68, 69, '#00A650', 'Estadio Olímpico Benito Juárez', 'Ciudad Juárez', `
    Sebastián Jurado|POR|1|71; Alan Medina|DEF|4|69; Denzell García|DEF|3|68;
    Óscar Estupiñán|DEL|9|72; Jesús Dueñas|MED|6|70; Rodolfo Pizarro|MED|20|74;
    Diego Campillo|MED|8|69; Jairo Torres|DEL|11|70; Óscar Villa|DEL|7|69;
    Homer Martínez|DEF|2|68; Ángel Zaldívar|DEL|19|69; Javier Aquino|DEF|20|72`),
  c('sla2', 'San Luis', 'ASL', 69, 69, 68, '#E30613', 'Estadio Alfonso Lastras', 'San Luis Potosí', `
    Andrés Sánchez|POR|1|71; Ricardo Chávez|DEF|2|72; Unai Bilbao|DEF|4|70;
    Jhon Murillo|DEL|11|71; Joao Pedro|MED|8|70; Vitinho|DEL|7|71;
    Sebastián Vegas|DEF|3|70; Yeison Guzmán|MED|10|71; Juan Manuel Sanabria|DEF|20|70;
    Abel Hernández|DEL|9|72; Rodrigo Dourado|MED|6|70`),
  c('pch', 'Pachuca', 'PAC', 76, 77, 73, '#0B2A6B', 'Estadio Hidalgo', 'Pachuca', `
    Carlos Moreno|POR|1|73; Bryan González|DEF|22|72; Sergio Barreto|DEF|4|73;
    Luis Rodríguez|DEF|20|72; Elías Montiel|MED|8|74;
    Alan Bautista|MED|10|72; Robert Kenedy|DEL|11|74; Salomón Rondón|DEL|23|76;
    Nelson Deossa|MED|5|75; Enner Valencia|DEL|9|76`),
];

export const MLS: FilaClub[] = [
  c('mia', 'Inter Miami CF', 'MIA', 78, 82, 71, '#F7B5CD', 'Chase Stadium', 'Fort Lauderdale', `
    Óscar Ustari|POR|1|73; Marcelo Weigandt|DEF|2|72; Maxi Falcón|DEF|4|73;
    Noah Allen|DEF|5|71; Jordi Alba|DEF|18|78; Sergio Busquets|MED|5|79;
    Federico Redondo|MED|55|74; Baltasar Rodríguez|MED|10|74; Lionel Messi|DEL|10|89;
    Luis Suárez|DEL|9|76; Tadeo Allende|DEL|11|74`),
  c('lag', 'LAFC', 'LAFC', 77, 78, 74, '#000000', 'BMO Stadium', 'Los Ángeles', `
    Hugo Lloris|POR|1|78; Ryan Hollingshead|DEF|24|72; Aaron Long|DEF|33|73;
    Eddie Segura|DEF|4|72; Sergi Palencia|DEF|2|72; Mark Delgado|MED|8|73;
    Timothy Tillman|MED|11|75; Igor Jesus|MED|21|72; Denis Bouanga|DEL|99|79;
    Son Heung-min|DEL|7|85; Nathan Ordaz|DEL|19|71`),
  c('lag2', 'LA Galaxy', 'LAG', 73, 73, 72, '#00245D', 'Dignity Health Sports Park', 'Carson', `
    Novak Micovic|POR|1|71; Julián Aude|DEF|3|71; Maya Yoshida|DEF|4|73;
    John Nelson|DEF|24|70; Miki Yamane|DEF|2|72; Edwin Cerrillo|MED|6|71;
    Gastón Brugman|MED|5|72; Riqui Puig|MED|6|78; Marco Reus|MED|10|79;
    Joseph Paintsil|DEL|11|76; Dejan Joveljić|DEL|9|74; Diego Fagúndez|MED|14|72`),
  c('cin', 'FC Cincinnati', 'CIN', 75, 74, 76, '#F05323', 'TQL Stadium', 'Cincinnati', `
    Roman Celentano|POR|1|72; Miles Robinson|DEF|12|75; Matt Miazga|DEF|4|74;
    Nick Hagglund|DEF|14|71; Lukas Engel|DEF|3|71; Obinna Nwobodo|MED|5|74;
    Pavel Bucha|MED|21|73; Luca Orellano|DEL|7|74; Evander|MED|10|77;
    Kévin Denkey|DEL|9|76; Sergio Santos|DEL|19|71`),
  c('col', 'Columbus Crew', 'CLB', 76, 77, 74, '#FFF200', 'Lower.com Field', 'Columbus', `
    Patrick Schulte|POR|28|73; Mo Farsi|DEF|17|72; Steven Moreira|DEF|31|74;
    Rudy Camacho|DEF|4|73; Malte Amundsen|DEF|3|72;
    Dylan Chambost|MED|8|73; Dániel Gazdag|MED|21|76; Diego Rossi|DEL|10|78;
    Cucho Hernández|DEL|9|77; Christian Ramírez|DEL|17|72; Wessam Abou Ali|DEL|11|74;
    Max Arfsten|DEF|23|72`),
  c('phi', 'Philadelphia Union', 'PHI', 74, 73, 75, '#071B2C', 'Subaru Park', 'Chester', `
    Andre Blake|POR|18|76; Olivier Mbaizo|DEF|15|71; Jakob Glesnes|DEF|5|74;
    Ian Glavinovich|DEF|4|71; Kai Wagner|DEF|27|74; Jesús Bueno|MED|20|71;
    Danley Jean Jacques|MED|6|64; Quinn Sullivan|MED|33|73; Tai Baribo|DEL|9|74;
    Mikael Uhre|DEL|7|73; Bruno Damiani|DEL|19|71`),
  c('sea', 'Seattle Sounders', 'SEA', 74, 73, 74, '#5D9732', 'Lumen Field', 'Seattle', `
    Stefan Frei|POR|24|74; Alex Roldan|DEF|16|72; Yeimar Gómez|DEF|28|74;
    Jackson Ragen|DEF|25|72; Nouhou Tolo|DEF|5|72; João Paulo|MED|6|75;
    Obed Vargas|MED|73|73; Albert Rusnák|MED|11|76; Jordan Morris|DEL|13|75;
    Danny Musovski|DEL|9|71; Pedro de la Vega|DEL|10|73; Jesús Ferreira|DEL|21|74`),
  c('atu', 'Atlanta United', 'ATL', 72, 73, 70, '#80000B', 'Mercedes-Benz Stadium', 'Atlanta', `
    Brad Guzan|POR|1|72; Brooks Lennon|DEF|11|72; Stian Gregersen|DEF|4|73;
    Luis Abram|DEF|5|72; Pedro Amador|DEF|3|71; Bartosz Slisz|MED|23|73;
    Tristan Muyumba|MED|8|72; Alexey Miranchuk|MED|59|76; Miguel Almirón|MED|10|78;
    Emmanuel Latte Lath|DEL|9|75; Saba Lobjanidze|DEL|7|73; Jamal Thiaré|DEL|19|71`),
  c('nyc', 'New York City FC', 'NYC', 73, 73, 73, '#6CACE4', 'Yankee Stadium', 'Nueva York', `
    Matt Freese|POR|1|72; Mitja Ilenič|DEF|2|71; Thiago Martins|DEF|13|73;
    Justin Haak|DEF|20|71; Kevin O'Toole|DEF|4|71; Andrés Perea|MED|8|72;
    Maxi Moralez|MED|10|74; Hannes Wolf|MED|17|73; Alonso Martínez|DEL|9|75;
    Agustín Ojeda|DEL|11|72; Julián Fernández|DEL|7|72`),
  c('nyr', 'New York Red Bulls', 'RBNY', 72, 72, 71, '#E30613', 'Sports Illustrated Stadium', 'Harrison', `
    Ethan Horvath|POR|1|74; Alexander Hack|DEF|3|72; Sean Nealis|DEF|15|71;
    Dylan Nealis|DEF|12|71; Robert Voloder|DEF|5|73; Daniel Edelman|MED|17|71;
    Peter Stroud|MED|6|70; Emil Forsberg|MED|10|77; Jorge Ruvalcaba|MED|11|74;
    Eric Choupo-Moting|DEL|13|74; Lewis Morgan|DEL|10|73; Cade Cowell|DEL|7|73`),
];

export const BRASILEIRAO: FilaClub[] = [
  c('fla', 'Flamengo', 'FLA', 83, 84, 81, '#E30613', 'Maracanã', 'Río de Janeiro', `
    Agustín Rossi|POR|1|78; Emerson Royal|DEF|22|77; Léo Ortiz|DEF|4|77;
    Léo Pereira|DEF|3|77; Alex Sandro|DEF|26|77; Lucas Paquetá|MED|20|82;
    Jorginho|MED|21|79; Giorgian de Arrascaeta|MED|10|81; Luiz Araújo|DEL|7|76;
    Pedro|DEL|9|79; Bruno Henrique|DEL|27|77; Gonzalo Plata|DEL|19|75`),
  c('pal', 'Palmeiras', 'PAL', 83, 82, 82, '#00A650', 'Allianz Parque', 'São Paulo', `
    Carlos Miguel|POR|1|78; Alexander Barboza|DEF|2|76; Gustavo Gómez|DEF|15|79;
    Murilo|DEF|26|76; Joaquín Piquerez|DEF|22|77; Maurício|MED|18|75;
    Andreas Pereira|MED|8|81; Marlon Freitas|MED|17|76; Ramón Sosa|DEL|19|76;
    Vitor Roque|DEL|9|77; Flaco López|DEL|42|76; Felipe Anderson|DEL|7|77`),
  c('bot', 'Botafogo', 'BOT', 80, 79, 80, '#000000', 'Nilton Santos', 'Río de Janeiro', `
    Gabriel Batista|POR|12|75; Vitinho|DEF|2|74; Ferraresi|DEF|5|75; Anthony|DEF|26|75;
    Alex Telles|DEF|6|76; Danilo|MED|8|75; Allan|MED|25|76;
    Montoro|MED|10|76; Arthur Cabral|DEL|19|76; Tiquinho Soares|DEL|9|75;
    Júnior Santos|DEL|11|75`),
  c('flu', 'Fluminense', 'FLU', 77, 76, 77, '#7A263A', 'Maracanã', 'Río de Janeiro', `
    Fábio|POR|1|76; Samuel Xavier|DEF|2|73; Thiago Silva|DEF|3|79;
    Ignácio|DEF|4|74; Renê|DEF|6|73; Martinelli|MED|8|75;
    Hércules|MED|29|74; Hulk|DEL|7|79; Germán Cano|DEL|14|76;
    Kevin Serna|DEL|11|74; Paulo Henrique Ganso|MED|10|76`),
  c('spa', 'São Paulo', 'SAO', 78, 76, 79, '#E30613', 'MorumBIS', 'São Paulo', `
    Rafael|POR|23|76; Aurélio Buta|DEF|20|75; Arboleda|DEF|5|76; Domingos Duarte|DEF|22|75;
    Enzo Díaz|DEF|6|74; Bobadilla|MED|8|74; Alisson|MED|25|75;
    Lucas Moura|DEL|7|79; Luciano|DEL|10|76; Jonathan Calleri|DEL|9|77;
    Ferreirinha|DEL|11|74`),
  c('cor', 'Corinthians', 'COR', 76, 75, 76, '#000000', 'Neo Química Arena', 'São Paulo', `
    Hugo Souza|POR|1|76; Matheuzinho|DEF|2|73; André Ramalho|DEF|3|75;
    Gustavo Henrique|DEF|4|74; Hugo|DEF|6|73; Charles|MED|5|73;
    Breno Bidon|MED|7|75; Rodrigo Garro|MED|10|77; Memphis Depay|DEL|94|80;
    Yuri Alberto|DEL|9|77; Jesse Lingard|DEL|77|76`),
  c('int', 'Internacional', 'INT', 76, 75, 76, '#E30613', 'Beira-Rio', 'Porto Alegre', `
    Sergio Rochet|POR|1|75; Aguirre|DEF|2|73; Guillermo Maripán|DEF|4|76;
    Mercado|DEF|25|74; Bernabei|DEF|6|74; Bruno Henrique|MED|8|75;
    Rodrigo Villagra|MED|5|74; Alan Patrick|MED|10|77; Johan Carbonero|DEL|7|75;
    Alerrandro|DEL|9|76; Enner Valencia|DEL|13|76`),
  c('gre', 'Grêmio', 'GRE', 75, 74, 75, '#0B7DC4', 'Arena do Grêmio', 'Porto Alegre', `
    Weverton|POR|1|73; João Pedro|DEF|2|72; Wagner Leonardo|DEF|3|73;
    Gustavo Martins|DEF|4|73; Marlon|DEF|6|73; Villasanti|MED|5|75;
    Dodi|MED|8|72; Krovinović|MED|10|74; Braithwaite|DEL|9|76;
    Carlos Vinícius|DEL|95|76; Pavon|DEL|7|73`),
  c('cru', 'Cruzeiro', 'CRU', 77, 76, 77, '#0B2A6B', 'Mineirão', 'Belo Horizonte', `
    Cássio|POR|12|76; William|DEF|2|73; Fabrício Bruno|DEF|4|77;
    Villalba|DEF|3|74; Kaiki|DEF|6|72; Lucas Romero|MED|5|73;
    Matheus Pereira|MED|10|78; Gerson|MED|8|78; Kaio Jorge|DEL|9|76;
    Wanderson|DEL|11|74; Bruno Rodrigues|DEL|7|75`),
  c('atm2', 'Atlético Mineiro', 'CAM', 77, 76, 77, '#000000', 'Arena MRV', 'Belo Horizonte', `
    Everson|POR|22|75; Natanael|DEF|2|73; Lyanco|DEF|4|75; Ruan Tressoldi|DEF|3|75;
    Renan Lodi|DEF|6|75; Alan Franco|MED|21|74; Maycon|MED|8|75;
    Bernard|MED|11|75; Mateo Cassierra|DEL|9|75; Thiago Borbas|DEL|18|74; Cuello|DEL|28|74`),
  c('bah', 'Bahia', 'BAH', 74, 73, 74, '#0B2A6B', 'Arena Fonte Nova', 'Salvador', `
    Ronaldo|POR|1|73; Marco Moreno|DEF|2|72; Kanu|DEF|4|73;
    Ramos Mingo|DEF|3|73; Luciano Juba|DEF|6|74; Jean Lucas|MED|5|74;
    Caio Alexandre|MED|8|74; Everton Ribeiro|MED|10|76; Ademir|DEL|7|73;
    Erick Pulga|DEL|11|74; Willian José|DEL|9|75`),
  c('vas', 'Vasco da Gama', 'VAS', 73, 73, 72, '#000000', 'São Januário', 'Río de Janeiro', `
    Léo Jardim|POR|1|75; Paulo Henrique|DEF|2|72; Lucas Oliveira|DEF|4|72;
    João Victor|DEF|3|73; Lucas Piton|DEF|6|74; Hugo Moura|MED|5|72;
    Mateus Carvalho|MED|8|72; Philippe Coutinho|MED|11|76; Rayan|DEL|7|73;
    Vegetti|DEL|9|75; David|DEL|10|73`),
];

export const ARGENTINA: FilaClub[] = [
  c('rvp', 'River Plate', 'RIV', 80, 80, 79, '#E30613', 'Más Monumental', 'Buenos Aires', `
    Santiago Beltrán|POR|1|74; Gonzalo Montiel|DEF|4|76; Paulo Díaz|DEF|17|76;
    Germán Pezzella|DEF|2|76; Marcos Acuña|DEF|8|77; Enzo Pérez|MED|24|74;
    Kevin Castaño|MED|5|75; Giuliano Galoppo|MED|32|74; Franco Mastantuono|DEL|30|80;
    Facundo Colidio|DEL|11|75; Miguel Borja|DEL|9|75; Sebastián Driussi|DEL|7|76;
    Fausto Vera|MED|22|76; Aníbal Moreno|MED|18|78`),
  c('boc', 'Boca Juniors', 'BOC', 79, 78, 78, '#0B2A6B', 'La Bombonera', 'Buenos Aires', `
    Agustín Marchesín|POR|1|76; Juan Barinaga|DEF|17|73; Ayrton Costa|DEF|6|73;
    Marco Pellegrino|DEF|2|73; Lautaro Blanco|DEF|3|73; Rodrigo Battaglia|MED|5|74;
    Leandro Paredes|MED|5|80; Carlos Palacios|MED|10|75; Exequiel Zeballos|DEL|7|74;
    Edinson Cavani|DEL|10|76; Miguel Merentiel|DEL|16|76`),
  c('rac', 'Racing Club', 'RAC', 77, 77, 76, '#6CACE4', 'El Cilindro', 'Avellaneda', `
    Facundo Cambeses|POR|1|74; Gastón Martirena|DEF|4|73; Matko Miljevic|DEF|5|75;
    Marco Di Césare|DEF|2|73; Gastón Lodico|DEF|3|72; Matías Pérez|MED|8|72;
    Bruno Zuculini|MED|6|73; Juan Fernando Quintero|MED|10|76; Adrián Martínez|DEL|9|76;
    Maxi Salas|DEL|11|74; Santiago Solari|DEL|7|74`),
  c('idp', 'Independiente', 'IND', 74, 73, 74, '#E30613', 'Libertadores de América', 'Avellaneda', `
    Rodrigo Rey|POR|1|73; Sergio Barreto|DEF|4|73; Franco Calderón|DEF|2|73;
    Alex Luna|MED|10|73; Maximiliano Meza|MED|8|75; Iván Marcone|MED|5|73;
    Ezequiel Ávila|DEL|9|73; Matías Giménez|DEL|11|72; Santiago López|DEF|3|71;
    Felipe Loyola|MED|6|73; Diego Tarzia|DEL|7|71`),
  c('slo', 'San Lorenzo', 'SLO', 72, 70, 73, '#0B2A6B', 'Nuevo Gasómetro', 'Buenos Aires', `
    Facundo Altamirano|POR|1|72; Danilo Arboleda|DEF|2|73; Gastón Hernández|DEF|4|71;
    Elián Irala|MED|8|72; Nahuel Barrios|DEL|11|72; Alexis Cuello|DEL|9|71;
    Iker Muniain|MED|10|76; Ezequiel Cerutti|DEL|7|72; Agustín Giay|DEF|3|72;
    Malcom Braida|DEF|6|71; Ignacio Perruzzi|MED|5|70`),
  c('vel', 'Vélez Sarsfield', 'VEL', 75, 74, 75, '#0B2A6B', 'José Amalfitani', 'Buenos Aires', `
    Tomás Marchiori|POR|1|73; Damián Fernández|DEF|4|72; Aarón Quirós|DEF|2|72;
    Elías Gómez|DEF|3|72; Claudio Baeza|MED|5|73;
    Matías Pellegrini|DEL|11|73; Braian Romero|DEL|9|74;
    Michael Santos|DEL|19|74; Rodrigo Aliendro|MED|6|72`),
  c('est', 'Estudiantes de La Plata', 'EDLP', 74, 72, 76, '#E30613', 'Jorge Luis Hirschi', 'La Plata', `
    Fernando Muslera|POR|1|76; Santiago Núñez|DEF|4|72; Facundo Rodríguez|DEF|2|72;
    Gastón Benedetti|DEF|3|72; Santiago Ascacíbar|MED|5|76; Cristian Medina|MED|8|76;
    Tiago Palacios|DEL|11|73; Guido Carrillo|DEL|9|74; Edwuin Cetré|DEL|7|73;
    Eric Meza|DEF|22|72; Mikel Amondarain|MED|6|71`),
  c('tal', 'Talleres', 'TAL', 72, 71, 72, '#0B2A6B', 'Mario Alberto Kempes', 'Córdoba', `
    Guido Herrera|POR|1|73; Juan Portillo|MED|5|72; Nahuel Bustos|DEL|9|73;
    Martín Río|DEL|11|73; Rubén Botta|MED|10|72; Miguel Navarro|DEF|3|72;
    Alexandro Maidana|DEF|2|72; Juan Cruz Komar|DEF|4|72; Rick|DEL|7|72;
    Ulises Ortegoza|MED|8|72; Matías Galarza|MED|6|72`),
];

export const OTROS_AMERICA: FilaClub[] = [
  c('atn', 'Atlético Nacional', 'NAC', 74, 74, 73, '#00A650', 'Atanasio Girardot', 'Medellín', `
    Franco Armani|POR|1|76; Andrés Román|DEF|4|71; William Tesillo|DEF|3|73;
    Simón García|DEF|2|71; Juan Bauzá|MED|10|72; Edwin Cardona|MED|8|74;
    Marino Hinestroza|DEL|11|74; Alfredo Morelos|DEL|9|74; Cristian Arango|DEL|7|75;
    Juan Zapata|MED|5|71; Milton Casco|DEF|6|73`),
  c('mil2', 'Millonarios', 'MIL', 71, 70, 71, '#0B2A6B', 'El Campín', 'Bogotá', `
    Álvaro Montero|POR|1|73; Andrés Llinás|DEF|4|71; Juan Pablo Vargas|DEF|3|72;
    Delvin Alfonzo|DEF|2|70; David Mackalister Silva|MED|10|72; Daniel Cataño|MED|8|71;
    Leonardo Castro|DEL|9|72; Beckham Castro|DEL|11|70; Danovis Banguero|DEF|6|70;
    Juan Pereira|DEL|7|70; Stiven Vega|MED|5|70; Radamel Falcao|DEL|10|77`),
  c('col', 'Colo-Colo', 'COL', 72, 71, 72, '#000000', 'Estadio Monumental', 'Santiago', `
    Fernando de Paul|POR|1|72; Joaquín Sosa|DEF|4|71; Ramiro González|DEF|2|71;
    Erick Wiemberg|DEF|3|71; Javier Méndez|MED|5|71; Matías Fernández|MED|8|73;
    Arturo Vidal|MED|23|76; Álvaro Madrid|DEL|11|72; Javier Correa|DEL|9|72;
    Claudio Aquino|MED|10|72; Maximiliano Romero|DEL|7|72`),
  c('uch', 'Universidad de Chile', 'UCH', 72, 71, 72, '#0B2A6B', 'Estadio Nacional', 'Santiago', `
    Gabriel Castellón|POR|1|72; Matías Zaldivia|DEF|4|71;
    Matías Sepúlveda|DEF|3|71; Marcelo Díaz|MED|21|72; Israel Poblete|MED|5|71;
    Lucas Assadi|MED|10|72; Eduardo Vargas|DEL|9|76; Juan Martín Lucero|DEL|11|75;
    Octavio Rivero|DEL|17|75; Charles Aránguiz|MED|20|74; Fabián Hormazábal|DEF|6|71`),
  c('uni', 'Universitario', 'UNI', 70, 69, 70, '#B4053A', 'Estadio Monumental', 'Lima', `
    Diego Romero|POR|1|72; Aldo Corzo|DEF|4|70; Matías Di Benedetto|DEF|2|70;
    Nelson Cabanillas|DEF|3|69; Jairo Concha|MED|10|71; Caín Fara|DEF|5|73;
    Alex Valera|DEL|9|71; Edison Flores|DEL|11|71; José Rivera|DEL|7|69;
    Martín Pérez Guedes|MED|8|70; Andy Polo|DEL|19|70`),
  c('bol', 'Club Bolívar', 'BOL', 68, 68, 67, '#0B2A6B', 'Hernando Siles', 'La Paz', `
    Guillermo Viscarra|POR|1|69; José Sagredo|DEF|4|60; Luis Haquin|DEF|2|63;
    Diego Medina|DEF|3|60; Ramiro Vaca|MED|10|66; Gabriel Villamil|MED|8|65;
    Francisco da Costa|DEL|11|64; Carmelo Algarañaz|DEL|9|63; Rodrigo Ramallo|DEL|7|63;
    Leonardo Zabala|MED|5|61; Robson Matheus|DEL|19|63`),
  c('sw', 'The Strongest', 'STR', 67, 67, 66, '#FFE500', 'Rafael Mendoza', 'La Paz', `
    Guillermo Vizcarra|POR|1|66; Adalid Terrazas|DEF|4|61; Jaime Cardozo|DEF|2|61;
    Diego Wayar|DEF|3|61; Jeyson Chura|MED|8|63; Jaime Arrascaita|MED|10|63;
    Enrique Triverio|DEL|9|65; Bruno Miranda|DEL|11|63; Martín Prost|DEL|7|62;
    Ramiro Ballivián|MED|5|61; Rodrigo Vargas|DEF|6|60`),
  c('ori', 'Oriente Petrolero', 'ORI', 63, 62, 63, '#00A650', 'Ramón Tahuichi Aguilera', 'Santa Cruz', `
    Ronaldo Suárez|POR|1|63; Jorge Ortiz|DEF|4|59; Juan Godoy|DEF|2|59;
    Marcos Riquelme|DEL|9|63; Luis Barboza|MED|8|60; Ronaldo Sánchez|MED|10|60;
    Julio Herrera|DEL|11|60; Marcelo Suárez|DEL|7|59; Diego Medina|DEF|3|60;
    José Sagredo|MED|5|59; Gilbert Álvarez|DEL|19|60`),
  c('pen', 'Peñarol', 'PEN', 73, 72, 73, '#FFE500', 'Campeón del Siglo', 'Montevideo', `
    Martín Campaña|POR|1|72; Guillermo Varela|DEF|4|73; Franco Escobar|DEF|2|74;
    Emanuel Gularte|DEF|3|71; Eric Remedi|MED|5|72; Rodrigo Pérez|MED|8|71;
    Leonardo Fernández|MED|10|75; Maximiliano Silvera|DEL|9|72; Matías Arezo|DEL|11|73;
    David Terans|DEL|7|72; Javier Cabrera|MED|6|71`),
  c('nac2', 'Nacional', 'NAC', 73, 72, 73, '#0B2A6B', 'Gran Parque Central', 'Montevideo', `
    Luis Mejía|POR|1|72; Nicolás Marichal|DEF|4|73; Emiliano Ancheta|DEF|2|71;
    Alfonso Trezza|DEF|3|71; Christian Oliva|MED|5|73; Lucas Rodríguez|MED|8|72;
    Maximiliano Gómez|DEL|9|74; Gonzalo Carneiro|DEL|7|72;
    Diego Romero|MED|10|71; Juan Cruz de los Santos|MED|6|71`),
  c('olm', 'Olimpia', 'OLI', 71, 70, 71, '#000000', 'Manuel Ferreira', 'Asunción', `
    Gaspar Servio|POR|1|71; Iván Torres|DEF|4|70; Ismael Díaz|DEL|9|70;
    Rodney Redes|DEL|11|71; Richard Ortiz|MED|5|70; Hugo Fernández|MED|8|70;
    Derlis González|DEL|10|73; Fabián Franco|DEF|3|69;
    Manuel Capasso|DEF|6|70; Guillermo Paiva|DEL|7|70`),
  c('cer', 'Cerro Porteño', 'CER', 72, 71, 72, '#E30613', 'La Nueva Olla', 'Asunción', `
    Jean Fernandes|POR|1|71; Blas Riveros|DEF|4|71; Alexis Duarte|DEF|2|72;
    Juan Espínola|DEF|3|70; Federico Carrizo|MED|10|72; Wilder Viera|MED|5|70;
    Jorge Morel|MED|8|70; Diego Churín|DEL|9|72; Robert Morales|DEL|11|71;
    Ronaldo Martínez|DEL|7|71; Fabrizio Peralta|DEF|6|70`),
  c('bsc', 'Barcelona SC', 'BSC', 70, 70, 69, '#FFE500', 'Monumental Banco Pichincha', 'Guayaquil', `
    Javier Burrai|POR|1|71; Byron Castillo|DEF|4|71; Luca Sosa|DEF|2|70;
    Mario Pineida|DEF|3|70; Damián Díaz|MED|10|71; Joao Rojas|DEL|11|71;
    Janner Corozo|DEL|7|70; Byron Palacios|MED|8|70;
    Jorge Ordóñez|MED|5|69; Leonai Souza|DEF|6|69`),
  c('ldu', 'LDU Quito', 'LDU', 72, 71, 72, '#FFE500', 'Rodrigo Paz Delgado', 'Quito', `
    Gonzalo Valle|POR|1|71; Ricardo Adé|DEF|4|61; Richard Mina|DEF|2|71;
    Leonel Quiñónez|DEF|3|71; Ezequiel Piovi|MED|5|71; Jhojan Julio|DEL|11|72;
    Alexander Alvarado|MED|10|72; Álex Arce|DEL|9|73; Michael Estrada|DEL|7|71;
    Lautaro Pastrán|MED|8|73; Fernando Cornejo|MED|6|70`),
];
