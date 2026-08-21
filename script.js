// URL do CSV da aba 'Jogos'
const CSV_JOGOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?gid=0&single=true&output=csv'
';

// URL do CSV da aba 'Gols'
const CSV_GOLS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?gid=648851691&single=true&output=csv';

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
  if (lines.length === 0) return [];

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

// Processa as estatísticas da Fase de Grupos
function calculateStandings(groupMatches) {
  const stats = createInitialStats();

  groupMatches.forEach(match => {
    const home = match['Time Mandante'];
    const away = match['Time Visitante'];
    const scoreHomeStr = match['Placar Mandante'];
    const scoreAwayStr = match['Placar Visitante'];

    // Considera apenas jogos com placar numérico preenchido
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

// Processa e renderiza o Ranking de Artilharia
function renderArtilharia(golsData) {
  const players = {};

  golsData.forEach(row => {
    const nome = row['Jogador'] ? row['Jogador'].trim() : '';
    const time = row['Time'] ? row['Time'].trim() : '';
    const qtdGols = parseInt(row['Gols'] || '0', 10);

    if (nome && !isNaN(qtdGols) && qtdGols > 0) {
      const key = `${nome}_${time}`;
      if (!players[key]) {
        players[key] = { nome, time, gols: 0 };
      }
      players[key].gols += qtdGols;
    }
  });

  // Ordena por quantidade de gols (maior para menor)
  const sortedPlayers = Object.values(players).sort((a, b) => b.gols - a.gols);

  const tbody = document.querySelector('#table-artilharia tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (sortedPlayers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Nenhum gol registrado ainda.</td></tr>';
    return;
  }

  sortedPlayers.forEach((player, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}º</td>
      <td>${player.nome}</td>
      <td>${player.time}</td>
      <td><strong>${player.gols}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// Renderiza os cards dos jogos da Fase de Grupos
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

// Renderiza a Fase Final buscando datas, horários e times definidos
function renderPlayoffs(groupA, groupB, allMatches) {
  const team1A = groupA[0] ? groupA[0].name : '1º do Grupo A';
  const team2A = groupA[1] ? groupA[1].name : '2º do Grupo A';
  const team1B = groupB[0] ? groupB[0].name : '1º do Grupo B';
  const team2B = groupB[1] ? groupB[1].name : '2º do Grupo B';

  const semi1Data = allMatches.find(m => m['Fase'] && m['Fase'].toLowerCase().includes('semifinal 1')) || {};
  const semi2Data = allMatches.find(m => m['Fase'] && m['Fase'].toLowerCase().includes('semifinal 2')) || {};
  const finalData = allMatches.find(m => m['Fase'] && m['Fase'].toLowerCase().includes('final')) || {};

  const getHeader = (data) => {
    if (!data['Data'] && !data['Hora']) return 'A definir';
    return `${data['Data'] || ''} ${data['Hora'] ? '• ' + data['Hora'] : ''}`;
  };

  document.getElementById('semi-1').innerHTML = `
    <div class="match-header">${getHeader(semi1Data)}</div>
    <div style="margin-top: 8px;">${team1A} <br><small>vs</small><br> ${team2B}</div>
  `;

  document.getElementById('semi-2').innerHTML = `
    <div class="match-header">${getHeader(semi2Data)}</div>
    <div style="margin-top: 8px;">${team1B} <br><small>vs</small><br> ${team2A}</div>
  `;

  document.getElementById('final-match').innerHTML = `
    <div class="match-header">${getHeader(finalData)}</div>
    <div style="margin-top: 8px;">Vencedor Semifinal 1 <br><small>vs</small><br> Vencedor Semifinal 2</div>
  `;
}

// Função principal de inicialização
async function init() {
  try {
    // Busca dados dos Jogos
    const responseJogos = await fetch(CSV_JOGOS_URL);
    const csvJogosText = await responseJogos.text();
    const allMatches = parseCSV(csvJogosText);

    // Busca dados dos Gols (Artilharia)
    let golsData = [];
    try {
      const responseGols = await fetch(CSV_GOLS_URL);
      const csvGolsText = await responseGols.text();
      golsData = parseCSV(csvGolsText);
    } catch (e) {
      console.warn('Tabela de gols ainda não configurada ou não acessível.', e);
    }

    // Filtra apenas jogos da Fase de Grupos
    const groupMatches = allMatches.filter(m => !m['Fase'] || m['Fase'].toLowerCase().includes('grupo'));

    // Processa classificação
    const stats = calculateStandings(groupMatches);
    const listA = Object.values(stats).filter(t => t.group === 'A');
    const listB = Object.values(stats).filter(t => t.group === 'B');

    const sortedA = sortGroup(listA);
    const sortedB = sortGroup(listB);

    // Renderiza os componentes na tela
    renderTable('table-grupo-a', sortedA);
    renderTable('table-grupo-b', sortedB);
    renderArtilharia(golsData);
    renderMatches(groupMatches);
    renderPlayoffs(sortedA, sortedB, allMatches);

  } catch (error) {
    console.error('Erro ao carregar ou processar os dados:', error);
  }
}

// Executa após o carregamento do DOM
document.addEventListener('DOMContentLoaded', init);
