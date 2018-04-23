import * as d from '../../../declarations';
import { mockElement, mockHtml } from '../../../testing/mocks';
import { TestingCompiler } from '../../../testing/testing-compiler';
import { TestingConfig } from '../../../testing/testing-config';
import * as path from 'path';


jest.setTimeout(10000);

describe('www loader/core resourcesUrl', () => {

  let c: TestingCompiler;
  let config: TestingConfig;


  it('default config w/ inlined loader script', async () => {
    config = new TestingConfig();
    config.flags.prerender = true;
    config.devMode = false;
    config.buildEs5 = false;
    config.minifyCss = false;
    config.minifyJs = false;
    config.buildAppCore = true;
    config.hashFileNames = false;
    config.rootDir = path.join('/User', 'testing');
    config.outputTargets = [
      { type: 'www', serviceWorker: null } as d.OutputTargetWww
    ];

    c = new TestingCompiler(config);
    const wwwOutput: d.OutputTargetWww = config.outputTargets.find(o => o.type === 'www');
    expect(wwwOutput.resourcesUrl).toBeUndefined();

    await setupFs(c, '<script src="build/app.js" test-inlined></script>');

    const r = await c.build();
    expect(r.diagnostics).toEqual([]);

    const { win, doc } = mockDom(wwwOutput.indexHtml);

    const loaderContent = doc.body.querySelector('script[test-inlined]').innerHTML;
    execScript(win, doc, loaderContent);

    const coreScriptElm = doc.head.querySelector('script[data-resources-url][data-namespace="app"]');
    const resourcesUrl = coreScriptElm.getAttribute('data-resources-url');
    const coreScriptSrc = coreScriptElm.getAttribute('src');

    expect(resourcesUrl).toBe(path.join('/', 'build', 'app', '/'));
    expect(coreScriptSrc).toBe(path.join('/', 'build', 'app', 'app.core.js'));

    const coreContent = await c.fs.readFile(path.join('/', 'User', 'testing', 'www', 'build', 'app', 'app.core.js'));
    execScript(win, doc, coreContent);

    expect(win.customElements.get('cmp-a')).toBeDefined();
  });


  it('custom resourcesUrl config w/ inlined loader script, do not hydrateComponents', async () => {
    config = new TestingConfig();
    config.flags.prerender = true;
    config.devMode = false;
    config.buildEs5 = false;
    config.minifyCss = false;
    config.minifyJs = false;
    config.buildAppCore = true;
    config.hashFileNames = false;
    config.rootDir = path.join('/', 'User', 'testing');
    config.outputTargets = [
      {
        type: 'www',
        resourcesUrl: path.join('/', 'some', 'resource', 'config', 'path'),
        serviceWorker: null,
        hydrateComponents: false
      } as d.OutputTargetWww
    ];

    c = new TestingCompiler(config);

    const wwwOutput: d.OutputTargetWww = config.outputTargets.find(o => o.type === 'www');
    expect(wwwOutput.resourcesUrl).toEqual(path.join('/', 'some', 'resource', 'config', 'path', '/'));

    await setupFs(c, '<script src="build/app.js" test-inlined></script>');

    const r = await c.build();
    expect(r.diagnostics).toEqual([]);

    const { win, doc } = mockDom(wwwOutput.indexHtml);

    const loaderContent = doc.head.querySelector('script[test-inlined]').innerHTML;
    execScript(win, doc, loaderContent);

    const coreScriptElm = doc.head.querySelector('script[data-resources-url][data-namespace="app"]');
    const resourcesUrl = coreScriptElm.getAttribute('data-resources-url');
    const coreScriptSrc = coreScriptElm.getAttribute('src');

    expect(resourcesUrl).toBe(path.join('/', 'some', 'resource', 'config', 'path', '/'));
    expect(coreScriptSrc).toBe(path.join('/', 'some', 'resource', 'config', 'path', 'app.core.js'));

    const coreContent = await c.fs.readFile(path.join('/', 'User', 'testing', 'www', 'build', 'app', 'app.core.js'));
    execScript(win, doc, coreContent);

    expect(win.customElements.get('cmp-a')).toBeDefined();
  });


  it('custom data-resources-url attr w/ inlined loader script', async () => {
    config = new TestingConfig();
    config.flags.prerender = true;
    config.devMode = false;
    config.buildEs5 = false;
    config.minifyCss = false;
    config.minifyJs = false;
    config.buildAppCore = true;
    config.hashFileNames = false;
    config.rootDir = path.join('/', 'User', 'testing', '/');
    config.outputTargets = [
      {
        type: 'www',
        serviceWorker: null
      } as d.OutputTargetWww
    ];

    c = new TestingCompiler(config);
    const wwwOutput: d.OutputTargetWww = config.outputTargets.find(o => o.type === 'www');
    expect(wwwOutput.resourcesUrl).toBeUndefined();

    await setupFs(c, '<script src="build/app.js" data-resources-url="/some/resource/attr/path/" test-inlined></script>');

    const r = await c.build();
    expect(r.diagnostics).toEqual([]);

    const { win, doc } = mockDom(wwwOutput.indexHtml);

    const loaderContent = doc.body.querySelector('script[test-inlined]').innerHTML;
    execScript(win, doc, loaderContent);

    const coreScriptElm = doc.head.querySelector('script[data-resources-url][data-namespace="app"]');
    const resourcesUrl = coreScriptElm.getAttribute('data-resources-url');
    const coreScriptSrc = coreScriptElm.getAttribute('src');

    expect(resourcesUrl).toBe(path.join('/', 'some', 'resource', 'attr', 'path', '/'));
    expect(coreScriptSrc).toBe(path.join('/', 'some', 'resource', 'attr', 'path', 'app.core.js'));

    const coreContent = await c.fs.readFile(path.join('/', 'User', 'testing', 'www', 'build', 'app', 'app.core.js'));
    execScript(win, doc, coreContent);

    expect(win.customElements.get('cmp-a')).toBeDefined();
  });


  function mockDom(htmlFilePath: string): { win: Window, doc: HTMLDocument } {
    const jsdom = require('jsdom');

    const html = c.fs.readFileSync(htmlFilePath);

    const dom = new jsdom.JSDOM(html, {
      url: 'http://emmitts-garage.com/?core=esm'
    });

    const win = dom.window;
    const doc = win.document;

    win.fetch = {};

    win.CSS = {
      supports: () => true
    };

    win.requestAnimationFrame = (cb: Function) => {
      setTimeout(cb);
    };

    win.performance = {
      now: () => Date.now()
    };

    win.CustomEvent = class {};

    win.customElements = {
      define: (tag: string) => $definedTag[tag] = true,
      get: (tag: string) => $definedTag[tag]
    };

    const $definedTag = {};

    win.dispatchEvent = () => true;

    return { win, doc };
  }


  function execScript(win: any, doc: any, jsContent: string) {
    jsContent = jsContent.replace(/import\(/g, 'mockImport(');
    const winFn = new Function('window', 'document', jsContent);
    winFn(win, doc, jsContent);
  }


  async function setupFs(c: TestingCompiler, loaderSrc: string) {
    await c.fs.writeFile(path.join('/', 'User', 'testing', 'src', 'components', 'cmp-a.tsx'), `@Component({ tag: 'cmp-a' }) export class CmpA {}`);

    await c.fs.writeFile(
      path.join('/', 'User', 'testing', 'src', 'index.html'), `
        <!DOCTYPE html>
        <html>
        <head>
          <script src="http://some-cdn.com/dist/other-stencil-app1.js" data-resources-url="http://some-cdn.com/dist/other-stencil-app1/" data-namespace="other-stencil-app1"></script>
          <script>/* some other inlined script */</script>
          <script src="assets/other-local-stencil-app2.js"></script>
          <script>/* some other inlined script */</script>
          <script src="assets/other-local-stencil-app2/other-local-stencil-app2.core.js" data-resources-url="/assets/other-local-stencil-app2/" data-namespace="other-local-stencil-app2"></script>
          <script src="assets/jquery.js"></script>
          <script src="http://some-cdn.com/dist/other-stencil-app3.js" data-resources-url="http://some-cdn.com/dist/other-stencil-app3/" data-namespace="other-stencil-app3"></script>
          ${loaderSrc}
        </head>
        <body>
          <script>/* some other inlined script */</script>
          <cmp-a></cmp-a>
          <script>/* some other inlined script */</script>
        </body>
        </html>
      `
    );

    await c.fs.commit();
  }

  beforeEach(() => {
    (global as any).HTMLElement = class {};
  });

  afterEach(() => {
    delete (global as any).HTMLElement;
  });

});
