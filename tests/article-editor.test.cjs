const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const React = require('react');

const id = 'ed8abe29-d34a-46c4-bcaf-789f4642f74b';
const source = readFileSync(join(__dirname, '../app/mesa-editorial-7k4n/articulos/[id]/page.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadEditor(bodyFormat, loadDrafts) {
  const article = { id, slug: 'prueba', body_format: bodyFormat, body: {} };
  const client = {
    from: () => ({
      select: fields => {
        if (fields === '*') return { eq: () => ({ maybeSingle: async () => ({ data: article }) }) };
        assert.equal(fields, 'id,title');
        const query = { eq: () => query, is: () => query, or: () => query, order: () => query, limit: loadDrafts };
        return query;
      },
    }),
  };
  const mocks = {
    'next/link': { default: 'Link' },
    'next/navigation': {},
    '@/lib/supabase': { adminClient: async () => client },
    '@/lib/articles': { getTerms: async () => [] },
    '@/components/article-form': { ArticleForm: 'ArticleForm' },
    '@/components/admin-forms': { DeleteForm: 'DeleteForm', TermForm: 'TermForm' },
    '@/components/json-dropzone': { JsonDropzone: 'JsonDropzone' },
    '@/lib/news-import': { normalizeNewsDocument: value => value },
  };
  const exports = {};
  new Function('require', 'exports', 'React', code)(name => {
    assert.ok(name in mocks, name);
    return mocks[name];
  }, exports, React);
  return articleId => exports.default({ params: Promise.resolve({ id: articleId }) });
}

test('la edición Tiptap abre sin consultar los borradores editoriales', async () => {
  let draftQueries = 0;
  const render = loadEditor('tiptap', async () => { draftQueries++; return { data: [] }; });
  const page = await render(id);
  assert.equal(draftQueries, 0);
  assert.ok(React.Children.toArray(page.props.children).some(child => child.type === 'ArticleForm'));
});

test('el editor nuevo abre aunque Supabase devuelva un error al listar borradores', async () => {
  const render = loadEditor('editorial', async () => ({ error: { code: '503' } }));
  const page = await render('nuevo');
  assert.equal(page.type, 'JsonDropzone');
  assert.equal(page.props.draftsUnavailable, true);
});

test('la edición editorial abre aunque la consulta de borradores rechace', async () => {
  const render = loadEditor('editorial', async () => { throw new Error('Conexión interrumpida'); });
  const page = await render(id);
  const editor = React.Children.toArray(page.props.children).find(child => child.type === 'JsonDropzone');
  assert.equal(editor.props.article.id, id);
  assert.equal(editor.props.draftsUnavailable, true);
});
