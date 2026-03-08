import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import * as cheerio from 'cheerio'
import { cors } from 'hono/cors'

const app = new OpenAPIHono()

// ==========================================
// 0. IZIN CORS (Biar web lu bisa narik data)
// ==========================================
app.use('/api/*', cors())

app.get('/', (c) => c.text('Mangaverse API is Running di Cloudflare Workers! Cek /ui untuk Dokumentasi.'))

// ==========================================
// 1. CONFIG & HEADERS
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
// 2. DEKLARASI ROUTES (SWAGGER UI)
// ==========================================
const routeTerbaru = createRoute({ method: 'get', path: '/api/terbaru', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Terbaru' } } })
const routeGenreAll = createRoute({ method: 'get', path: '/api/genre-all', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Semua Genre' } } })
const routeGenreRekomendasi = createRoute({ method: 'get', path: '/api/genre', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Genre Rekomendasi' } } })
const routeGenreDetail = createRoute({ method: 'get', path: '/api/genre/{slug}/page/{page}', request: { params: z.object({ slug: z.string(), page: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Manga by Genre' } } })
const routeRekomendasi = createRoute({ method: 'get', path: '/api/rekomendasi', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Rekomendasi' } } })
const routePopuler = createRoute({ method: 'get', path: '/api/populer', responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Populer (Manga, Manhwa, Manhua)' } } })
const routeBerwarna = createRoute({ method: 'get', path: '/api/berwarna/{page}', request: { params: z.object({ page: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Komik Berwarna' } } })
const routePustaka = createRoute({ method: 'get', path: '/api/pustaka/{page}', request: { params: z.object({ page: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Pustaka Komik' } } })
const routeSearch = createRoute({ method: 'get', path: '/api/search/{query}', request: { params: z.object({ query: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Cari Komik' } } })
const routeDetail = createRoute({ method: 'get', path: '/api/detail/{slug}', request: { params: z.object({ slug: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Detail Komik' } } })
const routeBaca = createRoute({ method: 'get', path: '/api/baca/{slug}/{chapter}', request: { params: z.object({ slug: z.string(), chapter: z.string() }) }, responses: { 200: { content: { 'application/json': { schema: GenericResponse } }, description: 'Baca Chapter' } } })

// ==========================================
// 3. LOGIC CONTROLLERS
// ==========================================

// 0. TERBARU
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

      const isColored = element.find(".ls4v span.warna").length > 0;
      const updateCountText = element.find(".ls4v span.up").text().trim();

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
          title, thumbnail, type, genre, updateTime, latestChapterTitle, isColored, updateCountText,
          apiDetailLink: mangaSlug ? `/api/detail/${mangaSlug}` : null,
          apiChapterLink
        });
      }
    });

    return c.json({ status: true, data: komikTerbaru })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 1. GENRE ALL
app.openapi(routeGenreAll, async (c) => {
  try {
    const res = await fetch(URL_KOMIKU, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const allGenres: any[] = []
    $("ul.genre li").each((i, el) => {
      const anchorTag = $(el).find("a");
      const title = anchorTag.text().trim();
      const originalLinkPath = anchorTag.attr("href") || "";
      const titleAttr = anchorTag.attr("title");
      let genreSlug = "";
      const matches = originalLinkPath.match(/\/genre\/([^/]+)/);
      if (matches && matches[1]) genreSlug = matches[1];
      if (title && originalLinkPath) {
        allGenres.push({ title, slug: genreSlug, apiGenreLink: genreSlug ? `/api/genre/${genreSlug}/page/1` : originalLinkPath, titleAttr: titleAttr || title });
      }
    });
    return c.json({ status: true, data: allGenres })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 2. GENRE REKOMENDASI
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

// 3. GENRE DETAIL (PAGINATION)
app.openapi(routeGenreDetail, async (c) => {
  try {
    const slug = c.req.param('slug'); const page = c.req.param('page');
    const res = await fetch(`${URL_API_KOMIKU}genre/${slug}/page/${page}/`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge, .daftar .bge, .list-manga .item, .manga-item").each((i, el) => {
      const title = $(el).find(".kan h3, h3, h2, .title").text().trim();
      let thumbnail = $(el).find(".bgei img, img").first().attr("src") || $(el).find("img").first().attr("data-src") || "";
      const type = $(el).find(".tpe1_inf b").text().trim();
      const desc = $(el).find(".kan p").text().trim();
      const path = $(el).find(".kan a, a").first().attr("href") || "";
      let mangaSlug = "";
      const match = path.match(/\/manga\/([^/]+)/);
      if (match) mangaSlug = match[1];
      if (title && thumbnail) mangaList.push({ title, slug: mangaSlug, type, thumbnail, desc, apiDetailLink: `/api/detail/${mangaSlug}` });
    });
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 4. REKOMENDASI KOMIK
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

// 5. KOMIK POPULER
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

// 6. BERWARNA
app.openapi(routeBerwarna, async (c) => {
  try {
    const page = c.req.param('page');
    const url = parseInt(page) === 1 ? `${URL_API_KOMIKU}other/berwarna/` : `${URL_API_KOMIKU}other/berwarna/page/${page}/`;
    const res = await fetch(url, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge").each((i, el) => {
      const title = $(el).find("h3").text().trim();
      const thumbnail = $(el).find(".sd").attr("src") || "";
      const desc = $(el).find(".kan p").text().trim();
      const path = $(el).find(".bgei a").attr("href") || "";
      let slug = "";
      const match = path.match(/\/manga\/(.*?)\//);
      if (match) slug = match[1];
      mangaList.push({ title, thumbnail, desc, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 7. PUSTAKA
app.openapi(routePustaka, async (c) => {
  try {
    const page = c.req.param('page');
    const res = await fetch(`${URL_API_KOMIKU_ID}manga/page/${page}/`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    const mangaList: any[] = []
    $(".bge").each((i, el) => {
      const title = $(el).find(".kan h3").text().trim();
      const thumbnail = $(el).find(".bgei img").attr("src") || "";
      const path = $(el).find(".bgei a").attr("href") || "";
      let slug = "";
      const match = path.match(/\/manga\/(.*?)\//);
      if (match) slug = match[1];
      mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 8. PENCARIAN
app.openapi(routeSearch, async (c) => {
  try {
    const query = c.req.param('query');
    const res = await fetch(`${URL_KOMIKU}?s=${encodeURIComponent(query)}&post_type=manga`, { headers: getHeaders() })
    const $ = cheerio.load(await res.text())
    let mangaList: any[] = []
    $(".bge").each((i, el) => {
      const title = $(el).find(".kan h3").text().trim();
      const thumbnail = $(el).find(".bgei img").attr("src") || "";
      const path = $(el).find(".bgei a").attr("href") || "";
      const slug = path.replace("/manga/", "").replace(/\/$/, "");
      if (title) mangaList.push({ title, thumbnail, apiDetailLink: `/api/detail/${slug}` });
    });
    return c.json({ status: true, data: mangaList })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: [] }, 500) }
})

// 9. DETAIL KOMIK
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

    return c.json({ status: true, data: { title, thumbnail, sinopsis, chapters } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

// 10. BACA CHAPTER
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

    return c.json({ status: true, data: { title, images } })
  } catch (err: any) { return c.json({ status: false, message: err.message, data: null }, 500) }
})

// ==========================================
// 4. SETUP EXPORT UNTUK CLOUDFLARE WORKERS
// ==========================================
app.doc('/doc', { openapi: '3.0.0', info: { version: '1.0.0', title: 'Mangaverse API by Fjrlesmana' } })
app.get('/ui', swaggerUI({ url: '/doc' }))

// Export murni Hono App untuk Cloudflare Workers
export default app
