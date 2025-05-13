const API   = '/api/sectors';
const FAV   = '/api/sectors/favorites';

async function fetchSectors() {
  const res = await fetch(API);
  return res.json();
}

async function fetchFavorites() {
  const res = await fetch(FAV);
  return res.json();
}

async function addFavorite(name) {
  await fetch(FAV, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

async function removeFavorite(name) {
  await fetch(`${FAV}/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

function renderSectors(data, favoritesSet) {
  const container = document.getElementById('sectors-container');
  container.innerHTML = '';

  data.forEach(({ name, performance }) => {
    const card = document.createElement('div');
    card.className = 'sector-card';
    card.innerHTML = `
      <button class="favorite-btn">
        ${favoritesSet.has(name) ? '💚' : '🤍'}
      </button>
      <div class="sector-name">${name}</div>
      <div class="performance ${performance >= 0 ? 'up' : 'down'}">
        ${performance.toFixed(2)}%
      </div>
    `;
    const btn = card.querySelector('.favorite-btn');
    btn.addEventListener('click', async () => {
      if (favoritesSet.has(name)) {
        await removeFavorite(name);
      } else {
        await addFavorite(name);
      }
      init(); // re-fetch & re-render
    });

    container.appendChild(card);
  });
}

function renderFavorites(favs) {
  const ul = document.getElementById('favorites-list');
  ul.innerHTML = favs.map(f => `<li>${f.name}</li>`).join('');
}

async function init() {
  const [ sectors, favs ] = await Promise.all([
    fetchSectors(),
    fetchFavorites()
  ]);
  const favSet = new Set(favs.map(f => f.name));
  renderSectors(sectors, favSet);
  renderFavorites(favs);
}

// auto-refresh every 60 seconds
init();
setInterval(init, 60_000);
