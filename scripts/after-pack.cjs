// Gancho do electron-builder: grava ícone e informações de versão no NEXORA.exe.
// Faz em JavaScript puro (resedit) o que o rcedit faria — dispensa o Wine ao
// empacotar para Windows a partir do Linux/macOS.
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return
  const ResEdit = await import('resedit')
  const { productFilename, buildVersion } = context.packager.appInfo
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`)
  const icoPath = path.join(context.packager.info.projectDir, 'build', 'icon.ico')

  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true })
  const res = ResEdit.NtExecutableResource.from(exe)

  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath))
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)
  const target = groups[0] ?? { id: 1, lang: 1033 }
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    target.id,
    target.lang,
    iconFile.icons.map((i) => i.data),
  )

  const [major = 1, minor = 0, patch = 0] = String(buildVersion).split('.').map(Number)
  const versionInfo = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] ?? ResEdit.Resource.VersionInfo.createEmpty()
  versionInfo.setFileVersion(major, minor, patch, 0)
  versionInfo.setProductVersion(major, minor, patch, 0)
  const langs = versionInfo.getAllLanguagesForStringValues()
  for (const lang of langs.length ? langs : [{ lang: 1033, codepage: 1200 }]) {
    versionInfo.setStringValues(lang, {
      ProductName: 'NEXORA',
      FileDescription: 'NEXORA · Gestão',
      CompanyName: 'Pedro Lucas',
      LegalCopyright: 'Criado Por Pedro Lucas!',
      InternalName: 'NEXORA',
      OriginalFilename: `${productFilename}.exe`,
      FileVersion: `${major}.${minor}.${patch}`,
      ProductVersion: `${major}.${minor}.${patch}`,
    })
  }
  versionInfo.outputToResourceEntries(res.entries)

  res.outputResource(exe)
  fs.writeFileSync(exePath, Buffer.from(exe.generate()))
  console.log(`  • ícone e metadados gravados em ${productFilename}.exe`)
}
