/** Rodando dentro do aplicativo desktop (Electron)? */
export const IS_DESKTOP_APP = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent)

export const APP_VERSION = __APP_VERSION__

export const CREDIT = 'Criado Por Pedro Lucas!'

/** Onde os dados ficam salvos, para textos de interface. */
export const STORAGE_PLACE = IS_DESKTOP_APP ? 'neste computador' : 'neste navegador'
