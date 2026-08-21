// ==========================================
// CONFIGURAÇÃO DOS LINKS DAS PLANILHAS (CSV)
// ==========================================
// Aba 'Jogos' (gid=0)
const CSV_JOGOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?gid=0&single=true&output=csv';

// Aba 'Gols' (gid=648851691)
const CSV_GOLS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTSlKPXBa5hNoOfPlwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDIdntNxFO/pub?gid=648851691&single=true&output=csv';

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

// Converte texto CSV simples em matriz de linhas/colunas
function parseCSVRows(text) {
  if (!text) return [];
  const lines = text.replace(/\r/g, '').trim().split('\n');
  return lines.map(line => {
    // Separa por vírgulas respeitando aspas duplas se existirem
    return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
  });
}

// Processa as estatísticas da Fase de Grupos
function calculateStandings(rows) {
  const stats = createInitialStats();
  if (rows.length < 2) return stats;

  // Descobre índice de cada coluna no cabeçalho (linha 0)
  const header = rows[0].map(h => h.toLowerCase());
  const idxMandante = header.findIndex(h => h.includes('mandante') && !h.includes('placar'));
  const idxVisitante = header.findIndex(h => h.includes('visitante') && !h.includes('placar'));
  const idxPlacarM = header.findIndex(h => h.includes('placar mandante') || h.includes('placar_m') || h === 'placar mandante');
  const idxPlacarV = header.findIndex(h => h.includes('placar visitante') || h.includes('placar_v') || h === 'placar visitante');

  // Caso os nomes exatos não sejam achados pelo header, usa as posições padrão da imagem (C=2, D=3, E=4, F=5)
  const colHome = idxMandante !== -1 ? idxMandante : 2;
  const colPlacarHome = idxPlacarM !== -1 ? idxPlacarM : 3;
  const colPlacarAway = idxPlacarV !== -1 ? idxPlacarV : 4;
  const colAway = idxVisitante !== -1 ? idxVisitante : 5;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= colAway) continue;

    const home = row[colHome] ? row[colHome].trim() : '';
    const away = row[colAway] ? row[colAway].trim() : '';
    const pHomeStr = row[colPlacarHome] !== undefined ? row[colPlacarHome].trim() : '';
    const pAwayStr = row[colPlacarAway] !== undefined ? row[colPlacarAway].trim() : '';

    // Verifica se os placares contêm valores numéricos válidos
    if (pHomeStr !== '' && pAwayStr !== '' && !isNaN(pHomeStr) && !isNaN(pAwayStr)) {
      const scoreHome = parseInt(pHomeStr, 10);
      const scoreAway = parseInt(pAwayStr, 10);

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
  }

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

// Renderiza a tabela HTML de um grupo
function renderTable(tableId, teamsData) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
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

// Processa e renderiza o Ranking de Artilharia (busca direta pela Coluna B, C e D)
function renderArtilharia(rows) {
  const tbody = document.querySelector('#table-artilharia tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const players = {};

  if (rows.length > 1) {
    // Posições baseadas no print 3: Coluna B=1 (Jogador), Coluna C=2 (Time), Coluna D=3 (Gols)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      const nome = row[1] ? row[1].trim() : '';
      const time = row[2] ? row[2].trim() : '';
      const qtdGols = parseInt(row[3] || '0', 10);

      if (nome && !isNaN(qtdGols) && qtdGols > 0) {
        const key = `${nome}_${time}`;
        if (!players[key]) {
          players[key] = { nome, time, gols: 0 };
        }
        players[key].gols += qtdGols;
      }
    }
  }

  const sortedPlayers = Object.values(players).sort((a, b) => b.gols - a.gols);

  if (sortedPlayers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#718096; padding:12px;">Nenhum gol registrado ainda.</td></tr>';
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
function renderMatches(rows) {
  const container = document.getElementById('matches-list');
  if (!container) return;
  container.innerHTML = '';

  if (rows.length < 2) return;

  // Índices baseados na estrutura: Data(0), Hora(1), Mandante(2), PlacarM(3), PlacarV(4), Visitante(5), Grupo(6), Fase(7)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 6) continue;

    const fase = row[7] ? row[7].toLowerCase() : '';
    // Exibe apenas os jogos que são da Fase de Grupos
    if (fase && !fase.includes('grupo')) continue;

    const date = row[0] || '';
    const time = row[1] || '';
    const home = row[2] || '';
    const pHome = row[3] !== undefined && row[3] !== '' ? row[3] : '-';
    const pAway = row[4] !== undefined && row[4] !== '' ? row[4] : '-';
    const away = row[5] || '';

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
  }
}

// Renderiza a Fase Final
function renderPlayoffs(groupA, groupB, rows) {
  const team1A = groupA[0] && groupA[0].j > 0 ? groupA[0].name : '1º do Grupo A';
  const team2A = groupA[1] && groupA[1].j > 0 ? groupA[1].name : '2º do Grupo A';
  const team1B = groupB[0] && groupB[0].j > 0 ? groupB[0].name : '1º do Grupo B';
  const team2B = groupB[1] && groupB[1].j > 0 ? groupB[1].name : '2º do Grupo B';

  let semi1Row = null, semi2Row = null, finalRow = null;

  for (let i = 1; i < rows.length; i++) {
    const fase = rows[i][7] ? rows[i][7].toLowerCase() : '';
    if (fase.includes('semifinal 1')) semi1Row = rows[i];
    if (fase.includes('semifinal 2')) semi2Row = rows[i];
    if (fase.includes('final') && !fase.includes('semifinal')) finalRow = rows[i];
  }

  const getHeader = (row) => {
    if (!row || (!row[0] && !row[1])) return 'A definir';
    return `${row[0] || ''} ${row[1] ? '• ' + row[1] : ''}`;
  };

  const elSemi1 = document.getElementById('semi-1');
  const elSemi2 = document.getElementById('semi-2');
  const elFinal = document.getElementById('final-match');

  if (elSemi1) {
    elSemi1.innerHTML = `
      <div class="match-header">${getHeader(semi1Row)}</div>
      <div style="margin-top: 8px;">${team1A} <br><small>vs</small><br> ${team2B}</div>
    `;
  }

  if (elSemi2) {
    elSemi2.innerHTML = `
      <div class="match-header">${getHeader(semi2Row)}</div>
      <div style="margin-top: 8px;">${team1B} <br><small>vs</small><br> ${team2A}</div>
    `;
  }

  if (elFinal) {
    elFinal.innerHTML = `
      <div class="match-header">${getHeader(finalRow)}</div>
      <div style="margin-top: 8px;">Vencedor Semifinal 1 <br><small>vs</small><br> Vencedor Semifinal 2</div>
    `;
  }
}

// Inicialização principal
async function init() {
  let jogosRows = [];
  try {
    const res = await fetch(CSV_JOGOS_URL);
    if (res.ok) {
      const text = await res.text();
      jogosRows = parseCSVRows(text);
    }
  } catch (err) {
    console.error('Erro ao carregar jogos:', err);
  }

  let golsRows = [];
  try {
    const res = await fetch(CSV_GOLS_URL);
    if (res.ok) {
      const text = await res.text();
      golsRows = parseCSVRows(text);
    }
  } catch (err) {
    console.error('Erro ao carregar gols:', err);
  }

  const stats = calculateStandings(jogosRows);
  const listA = Object.values(stats).filter(t => t.group === 'A');
  const listB = Object.values(stats).filter(t => t.group === 'B');

  const sortedA = sortGroup(listA);
  const sortedB = sortGroup(listB);

  renderTable('table-grupo-a', sortedA);
  renderTable('table-grupo-b', sortedB);
  renderArtilharia(golsRows);
  renderMatches(jogosRows);
  renderPlayoffs(sortedA, sortedB, jogosRows);
}

document.addEventListener('DOMContentLoaded', init);
