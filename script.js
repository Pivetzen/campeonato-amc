// URLs diretas dos links CSV publicados pelo Google Sheets
const CSV_JOGOS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?gid=0&single=true&output=csv';
const CSV_GOLS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXCCvBBp25kBOPTslKPXBa5hNo0fPIwcOT8t8GXhwpfDMZj-nNm177BGpqJP-SBx_dhDaDldntNxFO/pub?gid=648851691&single=true&output=csv';

// Mapeamento dos times por Grupo
const TEAMS = {
  'AMC FC': 'A',
  'REAL MADRUGA': 'A',
  'MILAN': 'A',
  'BOTAFOGO AMC': 'B',
  'CANA FC': 'B',
  'CHEIOS DE MANHA': 'B'
};

function createInitialStats() {
  const stats = {};
  for (const team in TEAMS) {
    stats[team] = {
      name: team,
      group: TEAMS[team],
      p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0
    };
  }
  return stats;
}

// Converte texto CSV em matriz de dados considerando aspas
function parseCSV(text) {
  if (!text) return [];
  const lines = text.replace(/\r/g, '').trim().split('\n');
  return lines.map(line => {
    const row = [];
    let insideQuote = false;
    let value = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(value.trim().replace(/^"|"$/g, ''));
        value = '';
      } else {
        value += char;
      }
    }
    row.push(value.trim().replace(/^"|"$/g, ''));
    return row;
  });
}

function calculateStandings(rows) {
  const stats = createInitialStats();
  if (rows.length < 2) return stats;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 6) continue;

    const home = row[2] ? row[2].trim() : '';
    const away = row[5] ? row[5].trim() : '';
    const pHomeStr = row[3] !== undefined ? row[3].trim() : '';
    const pAwayStr = row[4] !== undefined ? row[4].trim() : '';

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

function sortGroup(teamsList) {
  return teamsList.sort((a, b) => {
    if (b.p !== a.p) return b.p - a.p;
    if (b.v !== a.v) return b.v - a.v;
    if (b.sg !== a.sg) return b.sg - a.sg;
    return b.gp - a.gp;
  });
}

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

function renderMatches(rows) {
  const container = document.getElementById('matches-list');
  if (!container) return;
  container.innerHTML = '';

  if (rows.length < 2) return;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const fase = row[7] ? row[7].toLowerCase().trim() : '';

    // Filtra apenas jogos da fase de grupos
    if (fase.includes('semifinal') || (fase.includes('final') && !fase.includes('grupo'))) {
      continue;
    }

    const date = row[0] ? row[0].trim() : '';
    const time = row[1] ? row[1].trim() : '';
    const home = row[2] ? row[2].trim() : '';
    const pHome = row[3] !== undefined && row[3].trim() !== '' ? row[3].trim() : '-';
    const pAway = row[4] !== undefined && row[4].trim() !== '' ? row[4].trim() : '-';
    const away = row[5] ? row[5].trim() : '';

    if (!date && !home && !away) continue;

    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div class="match-header">${date}${time ? ' • ' + time : ''}</div>
      <div class="match-body">
        <span class="team-name home">${home || 'A definir'}</span>
        <span class="score">${pHome} x ${pAway}</span>
        <span class="team-name away">${away || 'A definir'}</span>
      </div>
    `;
    container.appendChild(card);
  }
}

function renderArtilharia(rows) {
  const tbody = document.querySelector('#table-artilharia tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const players = {};

  if (rows.length > 1) {
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

function renderPlayoffs(groupA, groupB, rows) {
  const team1A = groupA[0] && groupA[0].j > 0 ? groupA[0].name : '1º do Grupo A';
  const team2A = groupA[1] && groupA[1].j > 0 ? groupA[1].name : '2º do Grupo A';
  const team1B = groupB[0] && groupB[0].j > 0 ? groupB[0].name : '1º do Grupo B';
  const team2B = groupB[1] && groupB[1].j > 0 ? groupB[1].name : '2º do Grupo B';

  let semi1Row = null, semi2Row = null, finalRow = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const fase = row[7] ? row[7].toLowerCase().trim() : '';

    if (fase.includes('semifinal 1')) semi1Row = row;
    else if (fase.includes('semifinal 2')) semi2Row = row;
    else if (fase === 'final' || fase.includes('grande final')) finalRow = row;
  }

  const getHeader = (row) => {
    if (!row) return 'A definir';
    const d = row[0] ? row[0].trim() : '';
    const h = row[1] ? row[1].trim() : '';
    return (d || h) ? `${d}${h ? ' • ' + h : ''}` : 'A definir';
  };

  const elSemi1 = document.getElementById('semi-1');
  const elSemi2 = document.getElementById('semi-2');
  const elFinal = document.getElementById('final-match');

  if (elSemi1) {
    elSemi1.innerHTML = `
      <div class="match-header">${getHeader(semi1Row)}</div>
      <div style="margin-top: 6px;">${team1A} <br><small>vs</small><br> ${team2B}</div>
    `;
  }

  if (elSemi2) {
    elSemi2.innerHTML = `
      <div class="match-header">${getHeader(semi2Row)}</div>
      <div style="margin-top: 6px;">${team1B} <br><small>vs</small><br> ${team2A}</div>
    `;
  }

  if (elFinal) {
    elFinal.innerHTML = `
      <div class="match-header">${getHeader(finalRow)}</div>
      <div style="margin-top: 6px;">Vencedor Semifinal 1 <br><small>vs</small><br> Vencedor Semifinal 2</div>
    `;
  }
}

async function init() {
  let jogosRows = [];
  try {
    const res = await fetch(CSV_JOGOS_URL);
    if (res.ok) {
      const text = await res.text();
      jogosRows = parseCSV(text);
    }
  } catch (err) {
    console.error('Erro ao buscar planilha de jogos:', err);
  }

  let golsRows = [];
  try {
    const res = await fetch(CSV_GOLS_URL);
    if (res.ok) {
      const text = await res.text();
      golsRows = parseCSV(text);
    }
  } catch (err) {
    console.error('Erro ao buscar planilha de gols:', err);
  }

  const stats = calculateStandings(jogosRows);
  const listA = Object.values(stats).filter(t => t.group === 'A');
  const listB = Object.values(stats).filter(t => t.group === 'B');

  const sortedA = sortGroup(listA);
  const sortedB = sortGroup(listB);

  renderTable('table-grupo-a', sortedA);
  renderTable('table-grupo-b', sortedB);
  renderMatches(jogosRows);
  renderArtilharia(golsRows);
  renderPlayoffs(sortedA, sortedB, jogosRows);
}

document.addEventListener('DOMContentLoaded', init);
