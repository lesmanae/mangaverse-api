import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import * as cheerio from 'cheerio'
import { cors } from 'hono/cors'

const app = new OpenAPIHono()

// ==========================================
// 0. IZIN CORS
// ==========================================
app.use('/api/*', cors())

// ==========================================
// 1. UI API CUSTOM (SUPER SIMPLE ALA SONZAIX)
// ==========================================
app.get('/', (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mangaverse API</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0b0d14; color: #a1a1aa; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .json-key { color: #818cf8; }
        .json-string { color: #34d399; }
        .json-number { color: #fbbf24; }
        .json-boolean { color: #f472b6; }
        /* Hilangkan scrollbar bawaan */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0b0d14; }
        ::-webkit-scrollbar-thumb { background: #1f2233; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2d314a; }
    </style>
</head>
<body class="p-4 md:p-8 text-sm">
    <div class="max-w-3xl mx-auto">
        <div class="mb-6 uppercase tracking-[0.2em] text-xs font-bold text-gray-500 border-b border-gray-800 pb-2">MANGAVERSE API</div>
        
        <div class="bg-[#12141d] rounded-xl border border-[#1f2233] overflow-hidden shadow-2xl">
            <div class="p-4 bg-[#181b28] border-b border-[#1f2233] flex justify-between items-center">
                <h2 class="text-blue-500 font-bold text-lg flex items-center gap-3">
                    Mangaverse Endpoint <span class="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold">MANGA</span>
                </h2>
                <span class="text-gray-500 text-xs">11 endpoints</span>
            </div>
            <div id="endpoint-list" class="p-4 space-y-4">
                </div>
        </div>
    </div>

    <script>
        const endpoints = [
            { id: 'search', method: 'GET', path: '/api/search/{query}/{page}', desc: 'Search Manga', params: ['query', 'page'], defaults: { query: 'solo', page: '1' } },
            { id: 'terbaru', method: 'GET', path: '/api/terbaru', desc: 'Latest Updates', params: [], defaults: {} },
            { id: 'populer', method: 'GET', path: '/api/populer', desc: 'Trending', params: [], defaults: {} },
            { id: 'rekomendasi', method: 'GET', path: '/api/rekomendasi', desc: 'Recommended', params: [], defaults: {} },
            { id: 'detail', method: 'GET', path: '/api/detail/{slug}', desc: 'Manga Detail', params: ['slug'], defaults: { slug: 'solo-leveling' } },
            { id: 'baca', method: 'GET', path: '/api/baca/{slug}/{chapter}', desc: 'Read Chapter', params: ['slug', 'chapter'], defaults: { slug: 'solo-leveling', chapter: '1' } },
            { id: 'pustaka', method: 'GET', path: '/api/pustaka/{page}', desc: 'Manga Library', params: ['page'], defaults: { page: '1' } },
            { id: 'berwarna', method: 'GET', path: '/api/berwarna/{page}', desc: 'Colored Manga', params: ['page'], defaults: { page: '1' } },
            { id: 'genreall', method: 'GET', path: '/api/genre-all', desc: 'All Genres List', params: [], defaults: {} },
            { id: 'genrerekom', method: 'GET', path: '/api/genre', desc: 'Genre Recommended', params: [], defaults: {} },
            { id: 'genredetail', method: 'GET', path: '/api/genre/{slug}/page/{page}', desc: 'Manga by Genre', params: ['slug', 'page'], defaults: { slug: 'action', page: '1' } }
        ];

        const listContainer = document.getElementById('endpoint-list');
        const baseUrl = window.location.origin;

        // Syntax Highlighter khusus output JSON biar berwarna
        function syntaxHighlight(json) {
            if (typeof json != 'string') json = JSON.stringify(json, undefined, 2);
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) cls = 'json-key';
                    else cls = 'json-string';
                } else if (/true|false/.test(match)) cls = 'json-boolean';
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        function togglePanel(id) {
            const panel = document.getElementById('panel-' + id);
            panel.classList.toggle('hidden');
        }

        function updateUrl(id, path, params) {
            let compiledUrl = baseUrl + path;
            params.forEach(p => {
                const val = document.getElementById(id + '-' + p).value || '{' + p + '}';
                compiledUrl = compiledUrl.replace('{' + p + '}', encodeURIComponent(val));
            });
            document.getElementById(id + '-url').innerText = compiledUrl;
        }

        async function sendReq(id, path, params) {
            const btn = document.getElementById(id + '-btn');
            const resContainer = document.getElementById(id + '-res-container');
            const jsonBox = document.getElementById(id + '-json');
            const statusBox = document.getElementById(id + '-status');
            const timeBox = document.getElementById(id + '-time');
            
            btn.innerText = 'Sending...';
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            
            let finalUrl = baseUrl + path;
            params.forEach(p => {
                const val = document.getElementById(id + '-' + p).value;
                finalUrl = finalUrl.replace('{' + p + '}', encodeURIComponent(val));
            });

            const startTime = performance.now();
            try {
                const response = await fetch(finalUrl);
                const data = await response.json();
                const endTime = performance.now();
                
                resContainer.classList.remove('hidden');
                statusBox.innerText = response.status;
                statusBox.className = response.ok ? 'text-green-500 font-bold text-xs' : 'text-red-500 font-bold text-xs';
                timeBox.innerText = Math.round(endTime - startTime) + 'ms';
                
                jsonBox.innerHTML = syntaxHighlight(data);
            } catch (err) {
                resContainer.classList.remove('hidden');
                statusBox.innerText = 'ERROR';
                statusBox.className = 'text-red-500 font-bold text-xs';
                timeBox.innerText = '';
                jsonBox.innerHTML = '<span class="text-red-500">' + err.message + '</span>';
            } finally {
                btn.innerText = 'Send Request';
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        function copyUrl(id) {
            const text = document.getElementById(id + '-url').innerText;
            navigator.clipboard.writeText(text);
            const btn = document.getElementById(id + '-copy');
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = 'Copy', 2000);
        }

        function copyJson(id) {
            const text = document.getElementById(id + '-json').innerText;
            navigator.clipboard.writeText(text);
            const btn = document.getElementById(id + '-json-copy');
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = 'Copy', 2000);
        }

        // Render HTML
        endpoints.forEach(ep => {
            let paramInputs = '';
            if (ep.params.length > 0) {
                ep.params.forEach(p => {
                    paramInputs += \`
                        <div class="flex items-center gap-4">
                            <label class="w-20 text-[#a78bfa] text-sm text-right font-medium">\${p}*</label>
                            <input id="\${ep.id}-\${p}" type="text" value="\${ep.defaults[p]}" oninput="updateUrl('\${ep.id}', '\${ep.path}', [\${ep.params.map(x=>\`'\${x}'\`).join(',')}])" class="flex-1 bg-[#0b0d14] border border-[#1f2233] rounded-md p-2.5 text-gray-200 outline-none focus:border-blue-500 transition shadow-inner font-mono text-sm">
                        </div>
                    \`;
                });
            }

            const cardHtml = \`
                <div class="bg-[#181b28] border border-[#1f2233] rounded-xl overflow-hidden shadow-sm">
                    <div class="p-3 flex items-center justify-between cursor-pointer hover:bg-[#1f2233] transition" onclick="togglePanel('\${ep.id}')">
                        <div class="flex items-center gap-4">
                            <span class="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 font-bold px-2 py-1 rounded text-xs tracking-wider">\${ep.method}</span>
                            <span class="text-gray-300 font-mono text-sm">\${ep.path}</span>
                        </div>
                        <span class="text-xs text-gray-500">\${ep.desc}</span>
                    </div>

                    <div id="panel-\${ep.id}" class="hidden p-4 border-t border-[#1f2233] bg-[#12141d]">
                        <div class="space-y-4 max-w-2xl mx-auto">
                            
                            \${paramInputs ? \`<div class="space-y-3 bg-[#181b28] p-4 rounded-lg border border-[#1f2233]">\${paramInputs}</div>\` : ''}

                            <div class="flex gap-2">
                                <div class="flex-1 bg-[#0b0d14] border border-[#1f2233] rounded-lg p-3 text-gray-500 text-xs overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center" id="\${ep.id}-url"></div>
                                <button id="\${ep.id}-copy" onclick="copyUrl('\${ep.id}')" class="bg-[#1f2233] hover:bg-[#2d314a] text-gray-300 px-4 py-2 rounded-lg text-xs font-bold transition border border-[#2d314a]">Copy</button>
                            </div>

                            <button id="\${ep.id}-btn" onclick="sendReq('\${ep.id}', '\${ep.path}', [\${ep.params.map(x=>\`'\${x}'\`).join(',')}])" class="w-full bg-[#3b82f6] hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg transition shadow-[0_0_15px_rgba(59,130,246,0.2)]">Send Request</button>

                            <div id="\${ep.id}-res-container" class="hidden mt-6 border border-[#1f2233] rounded-xl overflow-hidden bg-[#0b0d14]">
                                <div class="flex justify-between items-center p-3 bg-[#181b28] border-b border-[#1f2233]">
                                    <div class="flex gap-4 items-center">
                                        <span class="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded" id="\${ep.id}-status"></span>
                                        <span class="text-gray-500 text-xs" id="\${ep.id}-time"></span>
                                    </div>
                                    <button id="\${ep.id}-json-copy" onclick="copyJson('\${ep.id}')" class="bg-[#1f2233] hover:bg-[#2d314a] text-gray-300 px-3 py-1.5 rounded-md text-xs font-bold transition border border-[#2d314a]">Copy</button>
                                </div>
                                <pre class="p-4 text-[11px] leading-relaxed overflow-x-auto max-h-[500px]" id="\${ep.id}-json"></pre>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
            listContainer.innerHTML += cardHtml;
            updateUrl(ep.id, ep.path, ep.params);
        });
    </script>
</body>
</html>
  `;
  return c.html(html)
})


// ==========================================
// 2. CONFIG & HEADERS
// ==========================================
const URL_KOMIKU = "https://komiku.org/";
const URL_API_KOMIKU = "https://api.komiku.org/";
const URL_API_KOMIKU_ID = "https://api.komiku.id/";

const getHeaders = () => ({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Referer": "https://komiku.org/",
  "Cache-Control": "public, max-age=3600",
});

// ==========================================
// 3. LOGIC CONTROLLERS API
// ==========================================

app.get('/api/terbaru', async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const komikTerbaru: any[] = []

    $("#Terbaru div.ls4w article.ls4").each((i, el) => {
      const element = $(el);
      const linkElement = element.find(".ls4v > a").first();
      const imgElement = linkElement.find("img");
      const detailElement = element.find(".ls4j");

      const titleFromImgAlt = imgElement.attr("alt")?.replace(/^Baca (Manga|Manhwa|Manhua)\s+/i, "").trim();
      const titleFromH3 = detailElement.find("h3 > a").text().trim();
      const title = titleFromH3 || titleFromImgAlt || "Judul Tidak Tersedia";

      const originalLinkPath = linkElement.attr("href");
      let thumbnail = imgElement.attr("data-src") || imgElement.attr("src") || "";

      const typeGenreTimeString = detailElement.find("span.ls4s").text().trim();
      let type = "Unknown", genre = "Unknown", updateTime = "Unknown";

      const typeMatch = typeGenreTimeString.match(/^(Manga|Manhwa|Manhua)/i);
      if (typeMatch) {
        type = typeMatch[0];
        const restOfString = typeGenreTimeString.substring(type.length).trim();
        const timeMatch = restOfString.match(/(.+?)\s+([\d\w\s]+lalu)$/i);
        if (timeMatch) {
          genre = timeMatch[1].trim(); updateTime = timeMatch[2].trim();
        } else {
          genre = restOfString;
        }
      } else {
        const parts = typeGenreTimeString.split(/\s+/);
        if (parts.length >= 2) {
          if (parts[parts.length - 1] === "lalu" && parts.length > 2) {
            updateTime = parts.slice(-2).join(" "); genre = parts.slice(0, -2).join(" ");
          } else {
            genre = typeGenreTimeString;
          }
        } else {
          genre = typeGenreTimeString;
        }
      }

      const latestChapterElement = detailElement.find("a.ls24");
      const latestChapterTitle = latestChapterElement.text().trim();
      const latestChapterLinkPath = latestChapterElement.attr("href");

      let mangaSlug = "";
      if (originalLinkPath) {
        const slugMatches = originalLinkPath.match(/\/manga\/([^/]+)/);
        if (slugMatches && slugMatches[1]) mangaSlug = slugMatches[1];
      }

      let apiChapterLink = null;
      if (latestChapterLinkPath && mangaSlug) {
        const chapterNumMatch = latestChapterLinkPath.match(/-chapter-([\d.]+)\/?$/i) || latestChapterLinkPath.match(/\/([\d.]+)\/?$/i);
        if (chapterNumMatch && chapterNumMatch[1]) {
          apiChapterLink = `/api/baca/${mangaSlug}/${chapterNumMatch[1]}`;
        }
      }

      if (title && title !== "Judul Tidak Tersedia" && thumbnail) {
        komikTerbaru.push({
          title, thumbnail, type, genre, updateTime, latestChapterTitle, 
          apiDetailLink: mangaSlug ? `/api/detail/${mangaSlug}` : null,
          apiChapterLink
        });
      }
    });

    return c.json({ status: true, message: "success", data: komikTerbaru })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/genre-all', async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const allGenres: any[] = []
    $("ul.genre li").each((i, el) => {
      const anchorTag = $(el).find("a");
      const title = anchorTag.text().trim();
      const originalLinkPath = anchorTag.attr("href") || "";
      let genreSlug = "";
      const matches = originalLinkPath.match(/\/genre\/([^/]+)/);
      if (matches && matches[1]) genreSlug = matches[1];
      if (title && originalLinkPath) {
        allGenres.push({ title, slug: genreSlug, apiGenreLink: genreSlug ? `/api/genre/${genreSlug}/page/1` : originalLinkPath });
      }
    });
    return c.json({ status: true, message: "success", data: allGenres })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/genre', async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const rekomendasi: any[] = []
    $(".ls3").each((i, el) => {
      const anchorTag = $(el).find("a").first();
      const imgTag = $(el).find("img");
      const title = $(el).find(".ls3p h4").text().trim();
      let thumbnail = imgTag.attr("src") || imgTag.attr("data-src") || "";
      let genreSlug = "";
      const path = anchorTag.attr("href") || "";
      const matches = path.match(/\/genre\/([^/]+)/) || path.match(/\/(other|statusmanga)\/([^/]+)/);
      if (matches && matches[2]) genreSlug = matches[2];
      else if (matches && matches[1]) genreSlug = matches[1];
      if (title && thumbnail) rekomendasi.push({ title, slug: genreSlug, thumbnail, apiGenreLink: `/api/genre/${genreSlug}/page/1` });
    });
    return c.json({ status: true, message: "success", data: rekomendasi })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/genre/:slug/page/:page', async (c) => {
  try {
    const slug = c.req.param('slug'); const page = c.req.param('page');
    const res = await fetch(`https://api.komiku.org/genre/${slug}/page/${page}/`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge, .daftar .bge, .list-manga .item, .manga-item").each((i, el) => {
      const title = $(el).find(".kan h3, h3, h2, .title").text().trim();
      let thumbnail = $(el).find(".bgei img, img").first().attr("src") || $(el).find("img").first().attr("data-src") || "";
      const type = $(el).find(".tpe1_inf b").text().trim();
      const path = $(el).find(".kan a, a").first().attr("href") || "";
      let mangaSlug = "";
      const match = path.match(/\/manga\/([^/]+)/);
      if (match) mangaSlug = match[1];
      if (title && thumbnail) mangaList.push({ title, slug: mangaSlug, type, thumbnail, apiDetailLink: `/api/detail/${mangaSlug}` });
    });
    return c.json({ status: true, message: "success", data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/rekomendasi', async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const rekomendasi: any[] = []
    $("#Rekomendasi_Komik article.ls2").each((i, el) => {
      const imgTag = $(el).find("img");
      const title = (imgTag.attr("alt") || $(el).find(".ls2j h3 a").text())?.replace(/^Baca (Komik|Manga|Manhwa|Manhua)\s+/i, "").trim();
      let thumbnail = imgTag.attr("data-src") || imgTag.attr("src") || "";
      const path = $(el).find("a").first().attr("href") || "";
      let slug = "";
      const match = path.match(/\/manga\/([^/]+)/);
      if (match) slug = match[1];
      if (title && thumbnail) rekomendasi.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, message: "success", data: rekomendasi })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/populer', async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const scrapeSection = (selector: string) => {
      const items: any[] = [];
      $(selector).find("article.ls2").each((i, el) => {
        const title = $(el).find("img").attr("alt")?.replace(/^Baca (Manga|Manhwa|Manhua|Komik)\s+/i, "").trim() || $(el).find(".ls2j h3 a").text().trim();
        const thumbnail = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
        const chapter = $(el).find("a.ls2l").text().trim();
        const path = $(el).find(".ls2v > a").first().attr("href") || "";
        let slug = "";
        const match = path.match(/\/manga\/([^/]+)/);
        if (match) slug = match[1];
        if (title && thumbnail) items.push({ title, thumbnail, latestChapter: chapter, apiDetailLink: `/api/detail/${slug}` });
      });
      return items;
    }
    return c.json({ status: true, message: "success", data: { manga: scrapeSection("#Komik_Hot_Manga"), manhwa: scrapeSection("#Komik_Hot_Manhwa"), manhua: scrapeSection("#Komik_Hot_Manhua") } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

app.get('/api/berwarna/:page', async (c) => {
  try {
    const page = c.req.param('page');
    const url = parseInt(page) === 1 ? `https://api.komiku.org/other/berwarna/` : `https://api.komiku.org/other/berwarna/page/${page}/`;
    const res = await fetch(url, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge").each((i, el) => {
      const title = $(el).find("h3").text().trim();
      const thumbnail = $(el).find(".sd").attr("src") || "";
      const path = $(el).find(".bgei a").attr("href") || "";
      let slug = "";
      const match = path.match(/\/manga\/(.*?)\//);
      if (match) slug = match[1];
      mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, message: "success", data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/pustaka/:page', async (c) => {
  try {
    const page = c.req.param('page');
    const url = parseInt(page) === 1 ? `https://komiku.org/manga/` : `https://komiku.org/manga/page/${page}/`;
    const res = await fetch(url, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge").each((i, el) => {
      const title = $(el).find(".kan h3").text().trim();
      const thumbnail = $(el).find(".bgei img").attr("src") || $(el).find(".bgei img").attr("data-src") || "";
      const type = $(el).find(".tpe1_inf b").text().trim();
      const path = $(el).find(".bgei a").attr("href") || "";
      let slug = "";
      const match = path.match(/\/manga\/(.*?)\//);
      if (match) slug = match[1];
      mangaList.push({ title, thumbnail, type, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, message: "success", data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/search/:query/:page', async (c) => {
  try {
    const query = c.req.param('query');
    const page = c.req.param('page');
    
    const searchUrl = parseInt(page) === 1 
      ? `https://komiku.org/?s=${encodeURIComponent(query)}&post_type=manga`
      : `https://komiku.org/page/${page}/?post_type=manga&s=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, { headers: getHeaders() });
    const html = await res.text();
    const $ = cheerio.load(html);
    let mangaList: any[] = [];

    const htmxElement = $(".daftar span[hx-get]");
    if (htmxElement.length > 0) {
      const htmxApiUrl = htmxElement.attr("hx-get");
      if (htmxApiUrl) {
        try {
          const htmxRes = await fetch(htmxApiUrl, { headers: { ...getHeaders(), "HX-Request": "true", Referer: searchUrl } });
          const $htmx = cheerio.load(await htmxRes.text());
          $htmx(".bge").each((i, el) => {
            const title = $htmx(el).find(".kan h3").text().trim();
            const thumbnail = $htmx(el).find(".bgei img").attr("data-src") || $htmx(el).find(".bgei img").attr("src") || "";
            const path = $htmx(el).find(".bgei a").attr("href") || "";
            const slug = path.replace("/manga/", "").replace(/\/$/, "");
            if (title && slug) mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
          });
        } catch (e) {}
      }
    }

    if (mangaList.length === 0) {
      $(".bge, .daftar .bge").each((i, el) => {
        const title = $(el).find(".kan h3, h3").text().trim();
        const thumbnail = $(el).find(".bgei img, img").attr("data-src") || $(el).find(".bgei img, img").attr("src") || "";
        const path = $(el).find(".bgei a, a").first().attr("href") || "";
        const slug = path.replace("/manga/", "").replace(/\/$/, "");
        if (title && slug) mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
      });
    }

    if (mangaList.length === 0) {
      $("a").each((i, el) => {
        const link = $(el).attr("href");
        if (link && link.includes("/manga/")) {
          const title = $(el).text().trim() || $(el).find("h3").text().trim() || $(el).attr('title') || "";
          if (title && title.length > 3) {
            const slugMatch = link.match(/\/manga\/([^/]+)/);
            if (slugMatch && slugMatch[1]) {
              const slug = slugMatch[1];
              let thumbnail = $(el).find("img").attr("data-src") || $(el).find("img").attr("src") || "";
              if (!thumbnail.includes('avatar') && !thumbnail.includes('gravatar')) {
                mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
              }
            }
          }
        }
      });
      const seen = new Set();
      mangaList = mangaList.filter(item => {
        if (!seen.has(item.apiDetailLink) && item.thumbnail) {
          seen.add(item.apiDetailLink);
          return true;
        }
        return false;
      });
    }

    return c.json({ status: true, message: "success", data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.get('/api/detail/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const res = await fetch(`${URL_KOMIKU}manga/${slug}/`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    
    const title = $("h1 span[itemprop='name']").text().trim();
    const thumbnail = $("section#Informasi div.ims img").attr("src") || "";
    const sinopsis = $("section#Sinopsis p").text().trim();
    
    const chapters: any[] = [];
    $("table#Daftar_Chapter tbody tr").each((i, el) => {
      if ($(el).find("th").length > 0) return;
      const chapterTitle = $(el).find("td.judulseries a span").text().trim();
      const chapterLink = $(el).find("td.judulseries a").attr("href") || "";
      const match = chapterLink.match(/\/([^/]+)-chapter-([^/]+)\//);
      if (match) chapters.push({ title: chapterTitle, apiChapterLink: `/api/baca/${match[1]}/${match[2]}` });
    });

    return c.json({ status: true, message: "success", data: { title, thumbnail, sinopsis, chapters } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

app.get('/api/baca/:slug/:chapter', async (c) => {
  try {
    const { slug, chapter } = c.req.param();
    const res = await fetch(`${URL_KOMIKU}${slug}-chapter-${chapter}/`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    
    const title = $("#Judul h1").text().trim();
    const images: any[] = [];
    
    $("#Baca_Komik img").each((i, el) => {
      const src = $(el).attr("src") || "";
      if (src && (src.includes("upload"))) images.push({ src });
    });

    return c.json({ status: true, message: "success", data: { title, images } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

export default app
