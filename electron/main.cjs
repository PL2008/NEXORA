// Processo principal do aplicativo desktop NEXORA (Electron).
// Serve a build do Vite (dist/) por um protocolo próprio — app://nexora — para que
// o IndexedDB tenha uma origem fixa e segura: os dados ficam salvos no computador,
// na pasta de dados do aplicativo (no Windows: %APPDATA%\NEXORA).

const { app, BrowserWindow, Menu, nativeTheme, net, protocol, screen, session, shell } = require('electron')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const SCHEME = 'app'
const HOST = 'nexora'
const ORIGIN = `${SCHEME}://${HOST}`
const DIST = path.join(__dirname, '..', 'dist')
const INDEX = path.join(DIST, 'index.html')
const EXTERNAL = /^(https?:|mailto:|tel:)/i

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

/**
 * Content-Security-Policy do aplicativo: só carrega recursos do próprio app.
 * O script inline do index.html (tema sem piscar) é liberado pelo hash.
 */
function buildCsp() {
  let hashes = ''
  try {
    const html = fs.readFileSync(INDEX, 'utf8')
    hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      // O HTML normaliza CRLF para LF antes de o navegador calcular o hash
      // (no Windows o Git pode fazer checkout com CRLF).
      .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`)
      .join(' ')
  } catch {
    // sem index.html: a janela mostrará erro de carregamento de qualquer forma
  }
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/** Resolve a URL pedida para um arquivo de dist/; rotas do app caem no index.html. */
function resolveAsset(requestUrl) {
  const { pathname } = new URL(requestUrl)
  const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)))
  if (!file.startsWith(DIST + path.sep)) return INDEX
  try {
    if (fs.statSync(file).isFile()) return file
  } catch {
    // não existe: é uma rota do app (ex.: /vendas)
  }
  return INDEX
}

// ——— posição e tamanho da janela entre usos

const statePath = () => path.join(app.getPath('userData'), 'janela.json')

function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(), 'utf8'))
    const visible = screen
      .getAllDisplays()
      .some(({ workArea: a }) => s.x < a.x + a.width && s.x + s.width > a.x && s.y < a.y + a.height && s.y + s.height > a.y)
    return visible ? s : { width: s.width, height: s.height, maximized: s.maximized }
  } catch {
    return null
  }
}

function saveWindowState(win) {
  if (win.isDestroyed()) return
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }))
  } catch {
    // sem permissão de escrita: apenas não lembra a posição
  }
}

// ——— janela

let mainWindow = null

function createWindow() {
  const state = loadWindowState()
  const { workAreaSize } = screen.getPrimaryDisplay()
  const win = new BrowserWindow({
    width: state?.width ?? Math.min(1440, Math.round(workAreaSize.width * 0.9)),
    height: state?.height ?? Math.min(920, Math.round(workAreaSize.height * 0.9)),
    ...(state?.x !== undefined ? { x: state.x, y: state.y } : {}),
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'NEXORA · Gestão',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b0b0c' : '#f6f6f4',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })
  if (state?.maximized) win.maximize()

  win.once('ready-to-show', () => win.show())
  win.on('close', () => saveWindowState(win))

  // Links externos (WhatsApp, e-mail) abrem no navegador/app padrão do sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (EXTERNAL.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${ORIGIN}/`)) return
    event.preventDefault()
    if (EXTERNAL.test(url)) void shell.openExternal(url)
  })

  void win.loadURL(`${ORIGIN}/`)
  return win
}

// ——— ciclo de vida

if (!app.requestSingleInstanceLock()) {
  // Já existe uma janela aberta: ela é trazida para a frente (evento abaixo).
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.nexora.gestao')
    Menu.setApplicationMenu(null)

    const csp = buildCsp()
    protocol.handle(SCHEME, async (request) => {
      const file = resolveAsset(request.url)
      const response = await net.fetch(pathToFileURL(file).toString())
      if (file !== INDEX) return response
      const headers = new Headers(response.headers)
      headers.set('Content-Security-Policy', csp)
      headers.set('Content-Type', 'text/html; charset=utf-8')
      return new Response(response.body, { status: response.status, headers })
    })

    // Exportações (CSV e backup): pergunta onde salvar, começando pela pasta Downloads.
    session.defaultSession.on('will-download', (_event, item) => {
      item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) })
    })

    mainWindow = createWindow()
    mainWindow.on('closed', () => {
      mainWindow = null
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
