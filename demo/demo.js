const ui = {
  input: document.getElementById('input'),
  outputPattern: document.getElementById('outputPattern'),
  outputFlags: document.getElementById('outputFlags'),
  runtime: document.getElementById('runtime'),
  bench: document.getElementById('bench'),
};
const state = {
  flags: {
    i: getValue('flag-i'),
    m: getValue('flag-m'),
    x: getValue('flag-x'),
    D: getValue('flag-D'),
    P: getValue('flag-P'),
    S: getValue('flag-S'),
    W: getValue('flag-W'),
  },
  opts: {
    rules: {
      allowOrphanBackrefs: getValue('option-allowOrphanBackrefs'),
      captureGroup: getValue('option-captureGroup'),
      singleline: getValue('option-singleline'),
    },
  },
  bench: !!(new URL(location).searchParams.get('bench')),
  showFlags: getValue('showFlags'),
  useGenerator: getValue('useGenerator'),
};

autoGrow();
showGenerated();

if (state.bench) {
  ui.bench.classList.remove('hidden');
}

function autoGrow() {
  ui.input.style.height = '0';
  ui.input.style.height = (ui.input.scrollHeight + 5) + 'px';
}

function showGenerated() {
  ui.outputPattern.classList.remove('error', 'subclass');
  const options = {
    ...state.opts,
    flags: `${
      state.flags.i ? 'i' : ''
    }${
      state.flags.m ? 'm' : ''
    }${
      state.flags.x ? 'x' : ''
    }${
      state.flags.D ? 'D' : ''
    }${
      state.flags.P ? 'P' : ''
    }${
      state.flags.S ? 'S' : ''
    }${
      state.flags.W ? 'W' : ''
    }`,
  };
  if (state.useGenerator) {
    options.unicodePropertyMap = OnigurumaParser.OnigUnicodePropertyMap;
    options.skipBackrefValidation = state.opts.rules.allowOrphanBackrefs;
  }
  let outputPattern = '';
  let outputFlags = '';
  let runtime = 0;
  try {
    const startTime = performance.now();
    const result = state.useGenerator ?
      // Using `parse` instead of `toOnigurumaAst` so we can set `skipBackrefValidation`
      OnigurumaParser.generate(OnigurumaParser.parse(ui.input.value, options)) :
      OnigurumaParser.optimize(ui.input.value, options);
    const endTime = performance.now();
    runtime = endTime - startTime;
    outputPattern = result.pattern;
    outputFlags = result.flags;
  } catch (err) {
    runtime = NaN;
    outputPattern = `Error: ${err.message}`;
    outputFlags = '';
    ui.outputPattern.classList.add('error');
  }
  ui.outputPattern.innerHTML = escapeHtml(outputPattern);
  ui.outputFlags.innerHTML = outputFlags;
  if (state.bench) {
    ui.runtime.innerHTML = Number.isNaN(runtime) ? '' : `${Math.round((runtime + Number.EPSILON) * 10) / 10}ms`;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function getValue(id) {
  const el = document.getElementById(id);
  if (el.type === 'number') {
    return +el.value;
  }
  if (el.type === 'checkbox') {
    return el.checked;
  }
  return el.value;
}

function setFlag(flag, value) {
  state.flags[flag] = value;
  showGenerated();
}

function setRule(rule, value) {
  state.opts.rules[rule] = value;
  showGenerated();
}

function setUseGenerator(value) {
  state.useGenerator = value;
  showGenerated();
}

function setShowFlags(value) {
  state.showFlags = value;
  ui.outputFlags.classList.toggle('hidden', !value);
}
