// URL do CSV publicado na Web pelo Google Sheets
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?output=csv';

// Definição dos times e seus respectivos grupos
const TEAMS = {
  'AMC FC': 'A',
  'REAL MADRUGA': 'A',
  'MILAN': 'A',
  'BOTAFOGO AMC': 'B',
  'CANA FC': 'B',
  'CHEIOS DE MANHA': 'B'
};

// Estrutura inicial das estatísticas de cada time
function createInitialStats() {
  const stats = {};
  for (const team in TEAMS) {
    stats[team] = {
      name: team,
      group: TEAMS[team],
      p: 0,  // Pontos
      j: 0,  // Jogos
      v: 0,  // Vitórias
      e: 0,  // Empates
      d: 0,  // Derrotas
      gp: 0, // Gols Pró
      gc: 0, // Gols Contra
      sg: 0  // Saldo de Gols
    };
  }
  return stats;
}

// Converte texto CSV em Array/Objetos
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',').map(v => v.trim().replace(/\r/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}

// Processa as estatísticas com base nos jogos preenchidos
function calculateStandings(matches) {
  const stats = createInitialStats();

  matches.forEach(match => {
    const home = match['Time Mandante'];
    const away = match['Time Visitante'];
    const scoreHomeStr = match['Placar Mandante'];
    const scoreAwayStr = match['Placar Visitante'];

    // Considera apenas jogos com placar preenchido
    if (scoreHomeStr !== '' && scoreAwayStr !== '' && !isNaN(scoreHomeStr) && !isNaN(scoreAwayStr)) {
      const scoreHome = parseInt(scoreHomeStr, 10);
      const scoreAway = parseInt(scoreAwayStr, 10);

      if (stats[home] && stats[away]) {
        stats[home].j++;
        stats[away].j++;

        stats[home].gp += scoreHome;
        stats[home].gc += scoreAway;
        stats[away].gp += scoreAway;
        stats[away].gc += scoreHome;

        stats[home].sg = stats[home].gp - stats[home].gc;
        stats[away].sg = stats[away].gp - stats[away].gc;

        if (scoreHome > scoreAway) {
          stats[home].p += 3;
          stats[home].v++;
          stats[away].d++;
        } else if (scoreAway > scoreHome) {
          stats[away].p += 3;
          stats[away].v++;
          stats[home].d++;
        } else {
          stats[home].p += 1;
          stats[away].p += 1;
          stats[home].e++;
          stats[away].e++;
        }
      }
    }
  });

  return stats;
}

// Ordena os times seguindo os critérios de desempate
function sortGroup(teamsList) {
  return teamsList.sort((a, b) => {
    if (b.p !== a.p) return b.p - a.p;   // 1º Pontos
    if (b.v !== a.v) return b.v - a.v;   // 2º Vitórias
    if (b.sg !== a.sg) return b.sg - a.sg; // 3º Saldo de Gols
    return b.gp - a.gp;                   // 4º Gols Marcados
  });
}

// Renderiza a tabela HTML de um determinado grupo
function renderTable(tableId, teamsData) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  teamsData.forEach((team, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}º</td>
      <td>${team.name}</td>
      <td><strong>${team.p}</strong></td>
      <td>${team.j}</td>
      <td>${team.v}</td>
      <td>${team.e}</td>
      <td>${team.d}</td>
      <td>${team.gp}</td>
      <td>${team.gc}</td>
      <td>${team.sg}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Renderiza os cards de todos os jogos
function renderMatches(matches) {
  const container = document.getElementById('matches-list');
  container.innerHTML = '';

  matches.forEach(match => {
    const home = match['Time Mandante'];
    const away = match['Time Visitante'];
    const pHome = match['Placar Mandante'] !== '' ? match['Placar Mandante'] : '-';
    const pAway = match['Placar Visitante'] !== '' ? match['Placar Visitante'] : '-';
    const date = match['Data'] || '';
    const time = match['Hora'] || '';

    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div class="match-header">${date} ${time ? '• ' + time : ''}</div>
      <div class="match-body">
        <span class="team-name home">${home}</span>
        <span class="score">${pHome} x ${pAway}</span>
        <span class="team-name away">${away}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Renderiza o chaveamento do mata-mata
function renderPlayoffs(groupA, groupB) {
  const team1A = groupA[0] ? groupA[0].name : '1º do Grupo A';
  const team2A = groupA[1] ? groupA[1].name : '2º do Grupo A';
  const team1B = groupB[0] ? groupB[0].name : '1º do Grupo B';
  const team2B = groupB[1] ? groupB[1].name : '2º do Grupo B';

  document.getElementById('semi-1').innerHTML = `${team1A} <br><small>vs</small><br> ${team2B}`;
  document.getElementById('semi-2').innerHTML = `${team1B} <br><small>vs</small><br> ${team2A}`;
  document.getElementById('final-match').innerHTML = `Vencedor Semifinal 1 <br><small>vs</small><br> Vencedor Semifinal 2`;
}

// Função principal de inicialização
async function init() {
  try {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    const matches = parseCSV(csvText);

    // Filtrar apenas os jogos da fase de grupos
    const groupMatches = matches.filter(m => !m['Fase'] || m['Fase'].toLowerCase().includes('grupo'));

    const stats = calculateStandings(groupMatches);

    const listA = Object.values(stats).filter(t => t.group === 'A');
    const listB = Object.values(stats).filter(t => t.group === 'B');

    const sortedA = sortGroup(listA);
    const sortedB = sortGroup(listB);

    renderTable('table-grupo-a', sortedA);
    renderTable('table-grupo-b', sortedB);
    renderMatches(groupMatches);
    renderPlayoffs(sortedA, sortedB);

  } catch (error) {
    console.error('Erro ao carregar os dados da planilha:', error);
  }
}

// Executa ao carregar a página
document.addEventListener('DOMContentLoaded', init);
