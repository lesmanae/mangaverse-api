import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import * as cheerio from 'cheerio'
import { cors } from 'hono/cors'

const app = new OpenAPIHono()

// ==========================================
// 0. IZIN CORS
// ==========================================
app.use('/api/*', cors())

// ==========================================
// 1. TAMPILAN UI API MODERN (PERSIS KAYA SONZAIX)
// ==========================================
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <title>Mangaverse API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { 
            margin: 0; 
            background-color: #0b0d17; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          /* Custom warna biar persis kaya gambar lu */
          :root {
            --scalar-color-1: #ffffff;
            --scalar-color-2: #94a3b8;
            --scalar-color-3: #64748b;
            --scalar-color-accent: #3b82f6;
            --scalar-background-1: #0b0d17;
            --scalar-background-2: #151828;
            --scalar-background-3: #1e2235;
            --scalar-border-color: #2a2f45;
            --scalar-button-1: #3b82f6;
            --scalar-button-1-hover: #2563eb;
            --scalar-button-1-color: #ffffff;
            --scalar-radius: 12px;
          }
          
          /* MENGHILANGKAN KODE ANEH (Ruby, Node.js, dll) */
          .scalar-client,
          .scalar-api-client,
          .scalar-api-client-wrapper,
          .client-libraries,
          .section-client,
          [class*="client-selector"],
          [class*="scalar-code-block"] {
            display: none !important;
          }
          
          /* Memaksa area response JSON tampil full dan bersih */
          .scalar-card {
            border: 1px solid var(--scalar-border-color) !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          }
          .scalar-button {
            font-weight: bold !important;
            padding: 12px 24px !important;
          }
        </style>
      </head>
      <body>
        <script id="api-reference"></script>
        <script>
          var configuration = {
            spec: { url: '/doc' },
            theme: 'none', 
            layout: 'classic', /* Ini bikin layoutnya memanjang ke bawah kaya gambar lu */
            showSidebar: true,
            hideModels: true,
            hideDownloadButton: true,
            metaData: {
              title: 'Mangaverse API'
            }
          }
          document.getElementById('api-reference').dataset.configuration = JSON.stringify(configuration)
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `)
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

const GenericResponse = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z.any() 
})

// ==========================================
// 3. DEKLARASI ROUTES (DENGAN DEFAULT PARAMETER)
// ==========================================
const routeTerbaru = createRoute({ method: 'get', path: '/api/terbaru', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Terbaru' } } })
const routeGenreAll = createRoute({ method: 'get', path: '/api/genre-all', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Semua Genre' } } })
const routeGenreRekomendasi = createRoute({ method: 'get', path: '/api/genre', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Genre Rekomendasi' } } })
const routeRekomendasi = createRoute({ method: 'get', path: '/api/rekomendasi', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Rekomendasi' } } })
const routePopuler = createRoute({ method: 'get', path: '/api/populer', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Populer' } } })

// Route dengan Parameter yg sudah dikasih Example (Biar gak usah ngetik manual)
const routeGenreDetail = createRoute({ 
  method: 'get', path: '/api/genre/{slug}/page/{page}', 
  request: { params: z.object({ 
    slug: z.string().openapi({ example: 'action' }), 
    page: z.string().openapi({ example: '1' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Manga by Genre' } } 
})

const routeBerwarna = createRoute({ 
  method: 'get', path: '/api/berwarna/{page}', 
  request: { params: z.object({ 
    page: z.string().openapi({ example: '1' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Berwarna' } } 
})

const routePustaka = createRoute({ 
  method: 'get', path: '/api/pustaka/{page}', 
  request: { params: z.object({ 
    page: z.string().openapi({ example: '1' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Pustaka Komik' } } 
})

const routeSearch = createRoute({ 
  method: 'get', path: '/api/search/{query}/{page}', 
  request: { params: z.object({ 
    query: z.string().openapi({ example: 'solo leveling' }), 
    page: z.string().openapi({ example: '1' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Cari Komik' } } 
})

const routeDetail = createRoute({ 
  method: 'get', path: '/api/detail/{slug}', 
  request: { params: z.object({ 
    slug: z.string().openapi({ example: 'solo-leveling' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Detail Komik' } } 
})

const routeBaca = createRoute({ 
  method: 'get', path: '/api/baca/{slug}/{chapter}', 
  request: { params: z.object({ 
    slug: z.string().openapi({ example: 'solo-leveling' }), 
    chapter: z.string().openapi({ example: '1' }) 
  }) }, 
  responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Baca Chapter' } } 
})

// ==========================================
// 4. LOGIC CONTROLLERS
// ==========================================

app.openapi(routeTerbaru, async (c) => {
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

    return c.json({ status: true, data: komikTerbaru })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeGenreAll, async (c) => {
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
    return c.json({ status: true, data: allGenres })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeGenreRekomendasi, async (c) => {
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
    return c.json({ status: true, data: rekomendasi })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeGenreDetail, async (c) => {
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
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeRekomendasi, async (c) => {
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
    return c.json({ status: true, data: rekomendasi })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routePopuler, async (c) => {
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
    return c.json({ status: true, data: { manga: scrapeSection("#Komik_Hot_Manga"), manhwa: scrapeSection("#Komik_Hot_Manhwa"), manhua: scrapeSection("#Komik_Hot_Manhua") } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

app.openapi(routeBerwarna, async (c) => {
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
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routePustaka, async (c) => {
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
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeSearch, async (c) => {
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

    // Lapis 1: HTMX
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

    // Lapis 2: Class .bge biasa
    if (mangaList.length === 0) {
      $(".bge, .daftar .bge").each((i, el) => {
        const title = $(el).find(".kan h3, h3").text().trim();
        const thumbnail = $(el).find(".bgei img, img").attr("data-src") || $(el).find(".bgei img, img").attr("src") || "";
        const path = $(el).find(".bgei a, a").first().attr("href") || "";
        const slug = path.replace("/manga/", "").replace(/\/$/, "");
        if (title && slug) mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
      });
    }

    // Lapis 3: Sapu link
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

    return c.json({ status: true, message: "Success", data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

app.openapi(routeDetail, async (c) => {
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

    return c.json({ status: true, message: "Success", data: { title, thumbnail, sinopsis, chapters } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

app.openapi(routeBaca, async (c) => {
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

    return c.json({ status: true, message: "Success", data: { title, images } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

// ==========================================
// 5. SETUP DOKUMENTASI DATA 
// ==========================================
app.doc('/doc', { 
  openapi: '3.0.0', 
  info: { 
    version: '1.0.0', 
    title: 'Mangaverse API',
    description: 'API scraping manga bahasa Indonesia.'
  } 
})

export default app
