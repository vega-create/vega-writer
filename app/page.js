'use client';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

const DEFAULT_CATEGORIES = ['AI', '行銷', '開發', '生活'];

const INITIAL_CONTENT = `## 前言

在這裡寫你的開場白...

## 第一個重點

內容...

## 第二個重點

內容...

## 結語

總結你的想法...`;

// ============ HELPERS ============
function generateSlug(title) {
  const base = title.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || 'untitled';
  const id = Math.random().toString(36).substring(2, 10);
  return `${base}-${id}`;
}

function extractHeadings(md) {
  return md.split('\n').filter(l => /^#{2,3}\s+/.test(l)).map(l => {
    const m = l.match(/^(#{2,3})\s+(.+)/);
    return m ? { level: m[1].length, text: m[2].trim() } : null;
  }).filter(Boolean);
}

function countWords(text) {
  const clean = text.replace(/^---[\s\S]*?---/, '').replace(/[#*\->`\[\]()]/g, '');
  const zh = (clean.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = clean.split(/\s+/).filter(w => w.length > 0 && !/[\u4e00-\u9fff]/.test(w)).length;
  return zh + en;
}

function renderMarkdown(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2 text-stone-800">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-stone-900 border-b border-stone-200 pb-2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-stone-100 px-1.5 py-0.5 rounded text-sm text-rose-600">$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-4 max-w-full" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-teal-600 underline" target="_blank">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-stone-700">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-stone-700">$2</li>');
  html = html.split('\n\n').map(block => {
    if (block.startsWith('<h') || block.startsWith('<li') || block.startsWith('<img')) return block;
    if (block.trim() === '') return '';
    return `<p class="text-stone-700 leading-relaxed mb-4">${block}</p>`;
  }).join('\n');
  return html;
}

// ============ SUB COMPONENTS ============
function SeoChecker({ title, description, content, faqs }) {
  const wc = countWords(content);
  const hc = extractHeadings(content).filter(h => h.level === 2).length;
  const fc = faqs.filter(f => f.q.trim()).length;
  const checks = [
    { label: '標題', pass: title.length >= 10 && title.length <= 60, detail: `${title.length}/60` },
    { label: '描述', pass: description.length >= 50 && description.length <= 160, detail: `${description.length}/160` },
    { label: '字數', pass: wc >= 300, detail: `${wc}` },
    { label: 'H2', pass: hc > 0, detail: `${hc}個` },
    { label: 'FAQ', pass: fc > 0, detail: `${fc}題` },
  ];
  const score = checks.filter(c => c.pass).length;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500">SEO</span>
        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${score >= 4 ? 'bg-emerald-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <span className={`text-xs font-bold ${score >= 4 ? 'text-emerald-600' : 'text-amber-600'}`}>{score}/5</span>
      </div>
      {checks.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="w-3">{c.pass ? '✅' : '⚠️'}</span>
          <span className="text-stone-500">{c.label}</span>
          <span className={c.pass ? 'text-emerald-600' : 'text-amber-500'}>{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

function TOC({ headings }) {
  if (!headings.length) return null;
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-6">
      <div className="text-sm font-bold text-stone-800 mb-2">📋 目錄</div>
      {headings.map((h, i) => (
        <div key={i} className={`text-sm text-teal-700 py-0.5 ${h.level === 3 ? 'ml-4' : ''}`}>{h.text}</div>
      ))}
    </div>
  );
}

function FaqPreview({ faqs }) {
  const valid = faqs.filter(f => f.q.trim() && f.a.trim());
  if (!valid.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-8">
      <h2 className="text-xl font-bold text-stone-900 mb-4">❓ 常見問題</h2>
      {valid.map((f, i) => (
        <div key={i} className="mb-4 last:mb-0">
          <div className="font-semibold text-stone-800 mb-1">Q: {f.q}</div>
          <div className="text-stone-600 text-sm">A: {f.a}</div>
        </div>
      ))}
    </div>
  );
}

// ============ MAIN ============
export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [categories, setCategories] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vega-writer-categories');
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_CATEGORIES;
  });
  const [newCat, setNewCat] = useState('');
  const [tags, setTags] = useState('');
  const [faqs, setFaqs] = useState([{ q: '', a: '' }]);
  const [coverImage, setCoverImage] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [writerKey, setWriterKey] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const textareaRef = useRef(null);
  const slugRef = useRef('');

  useEffect(() => { if (title) slugRef.current = generateSlug(title); }, [title]);
  const slug = slugRef.current || 'untitled';
  const headings = useMemo(() => extractHeadings(content), [content]);
  const wordCount = useMemo(() => countWords(content), [content]);

  const generateMarkdown = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const validFaqs = faqs.filter(f => f.q.trim() && f.a.trim());
    let md = `---\ntitle: "${title}"\ndescription: "${description}"\npublishDate: ${today}\ncategory: "${category}"\n`;
    if (tagList.length) md += `tags: [${tagList.map(t => `"${t}"`).join(', ')}]\n`;
    if (coverImage) md += `image: "${coverImage}"\n`;
    if (validFaqs.length) { md += 'faq:\n'; validFaqs.forEach(f => { md += `  - q: "${f.q}"\n    a: "${f.a}"\n`; }); }
    md += `---\n\n${content}`;
    return md;
  }, [title, description, content, category, tags, faqs, coverImage]);

  const generateSchema = useCallback(() => {
    const validFaqs = faqs.filter(f => f.q.trim() && f.a.trim());
    const s = [{ '@context': 'https://schema.org', '@type': 'Article', headline: title, description, author: { '@type': 'Person', name: 'Vega' }, datePublished: new Date().toISOString().split('T')[0] }];
    if (validFaqs.length) s.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: validFaqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    return JSON.stringify(s, null, 2);
  }, [title, description, faqs]);

  const handlePublish = async () => {
    if (!title.trim()) { alert('請輸入標題'); return; }
    setPublishing(true); setPublishResult(null);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-writer-key': writerKey },
        body: JSON.stringify({ filename: `${slug}.md`, content: generateMarkdown(), message: `新增文章: ${title}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublishResult({ ok: true, msg: '✅ 已發佈！Vercel 部署中...', url: data.url });
    } catch (err) {
      setPublishResult({ ok: false, msg: `❌ ${err.message}` });
    }
    setPublishing(false);
  };

  const handleCopy = () => { navigator.clipboard.writeText(generateMarkdown()); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const addFaq = () => setFaqs([...faqs, { q: '', a: '' }]);
  const removeFaq = (i) => setFaqs(faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i, field, val) => { const u = [...faqs]; u[i][field] = val; setFaqs(u); };
  const addCategory = () => { if (newCat.trim() && !categories.includes(newCat.trim())) { const updated = [...categories, newCat.trim()]; setCategories(updated); localStorage.setItem('vega-writer-categories', JSON.stringify(updated)); setNewCat(''); } };
  const removeCategory = (cat) => { if (categories.length > 1) { const updated = categories.filter(c => c !== cat); setCategories(updated); localStorage.setItem('vega-writer-categories', JSON.stringify(updated)); if (category === cat) setCategory(updated[0]); } };

  const insertAtCursor = (text) => {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    setContent(content.substring(0, s) + text + content.substring(e));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + text.length; ta.focus(); }, 0);
  };

  const handleNew = () => {
    if (title && !confirm('確定要清除目前內容？')) return;
    setTitle(''); setDescription(''); setContent(INITIAL_CONTENT); setTags(''); setFaqs([{ q: '', a: '' }]); setCoverImage(''); setPublishResult(null); slugRef.current = '';
  };

  const toolbar = [
    { label: 'H2', action: () => insertAtCursor('\n## ') },
    { label: 'H3', action: () => insertAtCursor('\n### ') },
    { label: 'B', action: () => insertAtCursor('****'), style: 'font-bold' },
    { label: 'I', action: () => insertAtCursor('**'), style: 'italic' },
    { label: '🔗', action: () => insertAtCursor('[文字](https://)') },
    { label: '🖼️', action: () => insertAtCursor('![描述](圖片URL)') },
    { label: '•', action: () => insertAtCursor('\n- ') },
    { label: '</>', action: () => insertAtCursor('\n```\n\n```\n') },
  ];

  // ===== LOGIN SCREEN =====
  if (showLogin) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900"><span className="text-teal-500">✦</span> Vega Writer</div>
            <p className="text-sm text-stone-500 mt-1">你的專屬寫作後台</p>
          </div>
          <input
            type="password" value={writerKey} onChange={e => setWriterKey(e.target.value)}
            placeholder="輸入通行密碼"
            onKeyDown={e => e.key === 'Enter' && writerKey && setShowLogin(false)}
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => writerKey && setShowLogin(false)}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-colors"
          >
            進入後台
          </button>
        </div>
      </div>
    );
  }

  // ===== MAIN EDITOR =====
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* HEADER */}
      <header className="bg-stone-900 text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold"><span className="text-teal-400">✦</span> Vega Writer</span>
          <button onClick={handleNew} className="text-xs px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-stone-400">📄 新文章</button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500 hidden sm:block">{wordCount} 字</span>
          <button onClick={handleCopy} className="text-xs px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded">{copied ? '✅' : '📋'}</button>
          <button onClick={() => setShowOutput(true)} className="text-xs px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded">{'</>'}</button>
          <button onClick={handlePublish} disabled={publishing}
            className="text-xs px-3 py-1 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 rounded font-bold">
            {publishing ? '⏳ 發佈中...' : '🚀 發佈到網站'}
          </button>
        </div>
      </header>

      {/* Publish Result */}
      {publishResult && (
        <div className={`px-3 py-1.5 text-xs flex items-center justify-between flex-shrink-0 ${publishResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          <span>{publishResult.msg}</span>
          <div className="flex items-center gap-2">
            {publishResult.ok && <a href={publishResult.url} target="_blank" rel="noopener" className="underline">查看文章 ↗</a>}
            <button onClick={() => setPublishResult(null)} className="opacity-50 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      {/* Mobile Tabs */}
      <div className="flex sm:hidden border-b border-stone-200 bg-white flex-shrink-0">
        {[['edit', '✏️ 編輯'], ['preview', '👁️ 預覽'], ['seo', '🔍 SEO']].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex-1 py-1.5 text-xs font-medium ${activeTab === k ? 'text-teal-700 border-b-2 border-teal-600' : 'text-stone-400'}`}>{l}</button>
        ))}
      </div>

      {/* MAIN SPLIT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Editor */}
        <div className={`w-full sm:w-1/2 flex flex-col border-r border-stone-200 ${activeTab !== 'edit' ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-2.5 space-y-1.5 border-b border-stone-100 bg-stone-50 flex-shrink-0">
            <input type="text" placeholder="文章標題" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-base font-bold placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <textarea placeholder="SEO 描述（50-160 字）" value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            <div className="flex gap-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <select value={category} onChange={e => setCategory(e.target.value)} className="px-2 py-1 border border-stone-200 rounded text-xs bg-white">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setShowCatManager(!showCatManager)} className="text-xs px-1 py-0.5 bg-stone-100 rounded">⚙️</button>
              </div>
              <input type="text" placeholder="標籤（逗號分隔）" value={tags} onChange={e => setTags(e.target.value)}
                className="flex-1 min-w-[80px] px-2 py-1 border border-stone-200 rounded text-xs placeholder:text-stone-300 focus:outline-none" />
              <input type="text" placeholder="封面圖 URL" value={coverImage} onChange={e => setCoverImage(e.target.value)}
                className="flex-1 min-w-[80px] px-2 py-1 border border-stone-200 rounded text-xs placeholder:text-stone-300 focus:outline-none" />
            </div>
            {showCatManager && (
              <div className="bg-white border border-stone-200 rounded-lg p-2 space-y-1.5">
                <div className="text-xs font-bold text-stone-500">分類管理</div>
                <div className="flex flex-wrap gap-1">
                  {categories.map(c => (
                    <span key={c} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs">
                      {c}<button onClick={() => removeCategory(c)} className="text-teal-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="新分類" onKeyDown={e => e.key === 'Enter' && addCategory()}
                    className="flex-1 px-2 py-0.5 border border-stone-200 rounded text-xs focus:outline-none" />
                  <button onClick={addCategory} className="px-2 py-0.5 bg-teal-600 text-white rounded text-xs">+</button>
                </div>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-stone-100 flex-shrink-0">
            {toolbar.map((t, i) => (
              <button key={i} onClick={t.action} className={`px-1.5 py-0.5 rounded text-xs hover:bg-stone-100 text-stone-500 ${t.style || ''}`}>{t.label}</button>
            ))}
            <div className="flex-1" />
            <span className="text-xs text-stone-400">{wordCount}字</span>
          </div>

          {/* Content Editor */}
          <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
            className="flex-1 p-3 text-sm text-stone-800 leading-relaxed resize-none focus:outline-none font-mono" placeholder="開始寫作..." spellCheck={false} />

          {/* FAQ Builder */}
          <div className="border-t border-stone-100 p-2.5 bg-stone-50 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-stone-500">❓ FAQ Schema</span>
              <button onClick={addFaq} className="text-xs px-1.5 py-0.5 bg-teal-600 text-white rounded">+</button>
            </div>
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {faqs.map((f, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <div className="flex-1 space-y-1">
                    <input placeholder="問題" value={f.q} onChange={e => updateFaq(i, 'q', e.target.value)}
                      className="w-full px-2 py-0.5 border border-stone-200 rounded text-xs focus:outline-none" />
                    <input placeholder="答案" value={f.a} onChange={e => updateFaq(i, 'a', e.target.value)}
                      className="w-full px-2 py-0.5 border border-stone-200 rounded text-xs focus:outline-none" />
                  </div>
                  {faqs.length > 1 && <button onClick={() => removeFaq(i)} className="text-stone-400 hover:text-red-500 text-xs">🗑️</button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className={`w-full sm:w-1/2 flex flex-col bg-stone-50 ${activeTab === 'edit' ? 'hidden sm:flex' : activeTab === 'seo' ? 'hidden sm:flex' : 'flex'}`}>
          <div className="px-4 py-1.5 bg-white border-b border-stone-100 flex-shrink-0">
            <span className="text-xs text-stone-400">👁️ 即時預覽 — vega-note.com</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <article className="max-w-2xl mx-auto">
              {coverImage && <img src={coverImage} alt={title} className="w-full h-44 object-cover rounded-xl mb-5" />}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">{category}</span>
                <span className="text-xs text-stone-400">{new Date().toLocaleDateString('zh-TW')}</span>
                <span className="text-xs text-stone-400">{wordCount} 字</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">{title || '文章標題'}</h1>
              <p className="text-stone-500 text-sm mb-5">{description || '文章描述...'}</p>
              <TOC headings={headings} />
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              <FaqPreview faqs={faqs} />
            </article>
          </div>
        </div>

        {/* SEO mobile */}
        <div className={`${activeTab === 'seo' ? 'flex' : 'hidden'} sm:hidden w-full flex-col bg-white p-4 overflow-y-auto`}>
          <div className="bg-white border border-stone-200 rounded-lg p-3 mb-4">
            <div className="text-xs text-stone-400 mb-1">Google 搜尋預覽</div>
            <div className="text-blue-700 text-sm font-medium truncate">{title || '文章標題'} | Vega Note</div>
            <div className="text-green-700 text-xs">vega-note.com/posts/{slug}/</div>
            <div className="text-stone-500 text-xs line-clamp-2">{description || '...'}</div>
          </div>
          <SeoChecker title={title} description={description} content={content} faqs={faqs} />
        </div>
      </div>

      {/* BOTTOM SEO BAR */}
      <div className="hidden sm:flex border-t border-stone-200 bg-white px-3 py-1.5 gap-3 items-center flex-shrink-0">
        <div className="flex-1">
          <div className="text-blue-700 text-sm font-medium truncate">{title || '文章標題'} | Vega Note</div>
          <div className="text-green-700 text-xs">vega-note.com/posts/{slug}/ <span className="text-stone-400 ml-2">{description ? description.substring(0, 60) + '...' : ''}</span></div>
        </div>
        <div className="w-48 flex-shrink-0"><SeoChecker title={title} description={description} content={content} faqs={faqs} /></div>
      </div>

      {/* OUTPUT MODAL */}
      {showOutput && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowOutput(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-stone-100">
              <span className="font-bold text-sm">📄 Markdown + Schema</span>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="px-3 py-1 bg-teal-600 text-white rounded text-xs">{copied ? '✅' : '📋 複製'}</button>
                <button onClick={() => setShowOutput(false)} className="px-2 py-1 bg-stone-100 rounded text-xs">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <pre className="bg-stone-900 text-stone-100 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap">{generateMarkdown()}</pre>
              <div>
                <div className="text-xs font-bold text-stone-500 mb-1">Schema JSON-LD</div>
                <pre className="bg-stone-900 text-teal-300 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap">{generateSchema()}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
