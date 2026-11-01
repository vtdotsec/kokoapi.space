(async () => {
  const host = document.querySelector('[data-utility]');
  if (!host) return;
  const $ = id => document.getElementById(id);
  const output = $('utility-output');
  const fileInput = $('utility-file');
  const run = $('utility-run');
  const copy = $('utility-copy');
  const download = $('utility-download');
  let generation = 0;
  const status = (message, error = false) => {
    $('utility-status').textContent = message;
    $('utility-status').classList.toggle('is-error', error);
  };
  const clearOutput = () => {
    if (output) output.value = '';
    if (copy) copy.disabled = true;
    if (download) download.disabled = true;
  };
  let core;
  try { core = await import('./utility-core.js'); }
  catch { status('Could not load the tool. Refresh the page and try again.', true); return; }

  $('utility-clear').addEventListener('click', () => {
    generation++;
    if (fileInput) fileInput.value = '';
    if ($('text-input')) $('text-input').value = '';
    if ($('expected-hash')) $('expected-hash').value = '';
    if ($('file-facts')) {
      $('file-facts').hidden = true;
      $('file-facts').querySelectorAll('dd').forEach(value => { value.textContent = ''; });
    }
    clearOutput();
    if (run) run.disabled = false;
    status('Cleared.');
  });
  if (copy) copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.value); status('Copied to clipboard.'); }
    catch { status('Clipboard access is unavailable. Select and copy the result manually.', true); }
  });
  if (download) download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cleaned-text.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  if (host.dataset.utility === 'text') {
    $('text-input').addEventListener('input', () => { clearOutput(); status(''); });
    document.querySelectorAll('.text-options input').forEach(input => input.addEventListener('change', () => { clearOutput(); status('Options changed. Clean the text again.'); }));
    run.addEventListener('click', () => {
      clearOutput();
      try {
        const input = $('text-input').value;
        output.value = core.cleanText(input, { trim: $('trim-lines').checked, removeEmpty: $('empty-lines').checked, unique: $('deduplicate').checked });
        copy.disabled = download.disabled = output.value.length === 0;
        status(`${input.length.toLocaleString()} → ${output.value.length.toLocaleString()} characters. Review the result before copying or downloading.`);
      } catch (error) { status(error.message, true); }
    });
  }
  if (host.dataset.utility === 'checksum') {
    const compare = () => {
      if (!output.value) return;
      const expected = $('expected-hash').value.trim();
      if (!expected) return status('SHA-256 calculated locally.');
      if (!/^[a-f\d]{64}$/i.test(expected)) return status('Expected SHA-256 must contain exactly 64 hexadecimal characters.', true);
      const match = expected.toLowerCase() === output.value;
      status(match ? 'Match — the calculated and expected SHA-256 are identical.' : 'No match — the calculated SHA-256 differs from the expected value.', !match);
    };
    $('expected-hash').addEventListener('input', compare);
    fileInput.addEventListener('change', () => { generation++; clearOutput(); run.disabled = false; status(''); });
    run.addEventListener('click', async () => {
      clearOutput();
      const file = fileInput.files[0];
      if (!file) return status('Choose a file first.', true);
      if (file.size > 100 * 1024 * 1024) return status('This tool supports files up to 100 MB to limit browser memory use.', true);
      const version = ++generation;
      run.disabled = true;
      status('Calculating on your device…');
      try {
        const hash = await core.sha256(await file.arrayBuffer());
        if (version !== generation) return;
        output.value = hash;
        copy.disabled = false;
        compare();
      } catch { if (version === generation) status('The hash could not be calculated. Try a smaller file in a modern browser.', true); }
      finally { if (version === generation) run.disabled = false; }
    });
  }
  if (host.dataset.utility === 'inspect') fileInput.addEventListener('change', async () => {
    const version = ++generation;
    $('file-facts').hidden = true;
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (version !== generation) return;
      $('fact-name').textContent = file.name;
      $('fact-size').textContent = `${file.size.toLocaleString()} bytes`;
      $('fact-declared').textContent = file.type || 'Not provided by the browser';
      $('fact-detected').textContent = bytes.length ? core.signature(bytes) : 'Empty file';
      $('fact-bytes').textContent = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(' ') || 'None';
      $('file-facts').hidden = false;
      status('Read locally. A declared MIME type or filename can be misleading; the signature is only a hint.');
    } catch { if (version === generation) status('Could not read this file. Choose it again.', true); }
  });
})();
