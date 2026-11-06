(() => {
  'use strict';

  const examples = {
    successor: {
      file: 'bottle.ok',
      kicker: 'IMMUTABILITY',
      title: 'Open a new bottle.',
      description: 'open() returns a successor. The closed bottle stays unchanged, and the new state gets a new name.',
      footnote: 'The original object stays unchanged',
      source: `module bottle v1.0.0;

object Bottle {
    has opened is bool = false;
    Bottle();

    open() is ^Bottle {
        confirm !opened;
        ^opened = true;
    }

    is_open() is bool { opened; }
}

main() is int {
    let bottle = Bottle();
    let opened = bottle.open();

    confirm !bottle.is_open();  // original unchanged
    confirm opened.is_open();  // new state
    0;
}`
    },
    errors: {
      file: 'payment.ok',
      kicker: 'TYPED ERRORS',
      title: 'Errors with a clear meaning.',
      description: 'An error is an enum with data. Handle a specific case and access its payload directly in catch.',
      footnote: 'enum · confirm · throw · catch',
      source: `module payment v1.0.0;
import "io/stdout" take Stdout;

enum PaymentError is Error = (
    declined(reason is string),
    timeout(ms is int)
);

object Gateway {
    Gateway();

    charge(cents is int) is string {
        confirm cents > 0
            else throw PaymentError.declined("empty cart");
        "receipt #" + cents.string();
    }
}

main() is int {
    let out = Stdout();
    try { Gateway().charge(0); }
    catch PaymentError.declined(reason) {
        out.writeln("declined: " + reason);
    }
    catch PaymentError.timeout(_) {
        out.writeln("try again later");
    }
    0;
}`
    },
    roles: {
      file: 'package-test.ok',
      kicker: 'ROLES AND TESTING',
      title: 'A contract you can test.',
      description: 'A role describes the available behavior. Its fake is a test implementation of the same contract, right beside its declaration.',
      footnote: 'Run: okkama -t package-test.ok',
      source: `module packages v1.0.0;

role Package {
    open() is ^Package;
    is_open() is bool;

    fake {
        has opened is bool = false;

        open() is ^Package {
            ^opened = true;
        }

        is_open() is bool { opened; }
    }
}

test "a package can be opened" {
    let package is Package = Package.fake();

    test.ok(package.open().is_open());
    test.ok(!package.is_open());
}`
    }
  };

  const keywords = new Set(['module','object','has','is','let','main','confirm','false','true','enum','else','throw','try','catch','import','take','role','fake','test','does','return']);
  const types = new Set(['bool','int','string','float','byte','any']);
  const escape = value => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  function highlight(source) {
    // A tiny read-only highlighter. Escapes every token before adding markup.
    return source.split('\n').map((line, index) => {
      const tokens = line.match(/\/\/.*$|"(?:\\.|[^"\\])*"|\^[A-Za-z_][A-Za-z0-9_]*|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)*\b|./g) || [];
      const html = tokens.map(token => {
        let kind = '';
        if (token.startsWith('//')) kind = 'comment';
        else if (token.startsWith('"')) kind = 'string';
        else if (token.startsWith('^')) kind = 'successor';
        else if (keywords.has(token)) kind = 'keyword';
        else if (types.has(token) || /^[A-Z]/.test(token)) kind = 'type';
        else if (/^\d/.test(token)) kind = 'number';
        const content = escape(token);
        return kind ? `<span class="token-${kind}">${content}</span>` : content;
      }).join('');
      return `<span class="code-line"><span class="line-number" aria-hidden="true">${index + 1}</span><span class="line-text">${html || ' '}</span></span>`;
    }).join('');
  }

  const tabs = [...document.querySelectorAll('[data-example]')];
  const code = document.getElementById('example-code');
  const panel = document.getElementById('code-panel');
  const download = document.getElementById('download-code');
  let currentExample = 'successor';
  let downloadUrl;
  function chooseExample(key) {
    const example = examples[key];
    if (!example) return;
    currentExample = key;
    tabs.forEach(tab => {
      const selected = tab.dataset.example === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    code.innerHTML = highlight(example.source);
    panel.setAttribute('aria-labelledby', `tab-${key}`);
    panel.scrollTop = 0;
    panel.scrollLeft = 0;
    document.getElementById('example-filename').textContent = example.file;
    document.getElementById('example-kicker').textContent = example.kicker;
    document.getElementById('example-title').textContent = example.title;
    document.getElementById('example-description').textContent = example.description;
    document.getElementById('example-footnote').textContent = example.footnote;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([example.source + '\n'], { type: 'text/plain;charset=utf-8' }));
    download.href = downloadUrl;
    download.download = example.file;
    download.setAttribute('aria-label', `Download ${example.file}`);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseExample(tab.dataset.example));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      chooseExample(tabs[next].dataset.example);
      tabs[next].focus();
    });
  });
  chooseExample(currentExample);

  let toastTimer;
  const toast = document.getElementById('toast');
  function notify(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const active = document.activeElement;
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly','');
        field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (active instanceof HTMLElement) active.focus();
        if (!copied) throw new Error('Clipboard unavailable');
      }
      notify('Copied. Ready to paste into your editor.');
    } catch {
      notify('Could not copy. Select the code manually or download the .ok file.');
    }
  }
  document.getElementById('copy-code').addEventListener('click', () => copyText(examples[currentExample].source));
  document.getElementById('copy-start').addEventListener('click', () => copyText('blade new hello && cd hello\nokkama src/main.ok\n\n# Other engines\nokkama run --engine sparrow src/main.ok\nokkama run --engine jvm src/main.ok'));

  const demo = document.querySelector('.state-demo');
  const run = document.getElementById('run-demo');
  const demoMessage = document.getElementById('demo-message');
  run.addEventListener('click', () => {
    const opened = demo.dataset.opened !== 'true';
    demo.dataset.opened = String(opened);
    demo.querySelector('.successor').setAttribute('aria-hidden', String(!opened));
    run.innerHTML = opened ? '<span aria-hidden="true">↺</span> Try again' : '<span aria-hidden="true">↗</span> Create successor';
    demoMessage.textContent = opened
      ? 'Successor created: opened → true. The original bottle is still → false.'
      : 'Two values. No changes to the original object.';
  });

  const menu = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('navigation');
  function closeMenu() {
    menu.setAttribute('aria-expanded','false');
    menu.setAttribute('aria-label','Open menu');
    navigation.classList.remove('open');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    navigation.classList.toggle('open', open);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target) && !menu.contains(event.target)) closeMenu();
  });
  const wideScreen = window.matchMedia('(min-width: 641px)');
  wideScreen.addEventListener('change', event => { if (event.matches) closeMenu(); });
})();
