(() => {
  const input = document.querySelector('#tool-search');
  if (!input) return;
  const items = [...document.querySelectorAll('[data-catalog-item]')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  input.addEventListener('input', () => {
    const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      item.hidden = words.length ? !words.every(word => normalize(item.dataset.search).includes(word)) : item.dataset.secondary === "true";
      if (!item.hidden) count++;
    }
    document.querySelectorAll('[data-catalog-group]').forEach(group => {
      group.hidden = ![...group.querySelectorAll('[data-catalog-item]')].some(item => !item.hidden);
    });
    document.querySelector('#catalog-empty').hidden = count > 0;
    document.querySelector('#catalog-status').textContent = `${count} tools found`;
  });
})();
