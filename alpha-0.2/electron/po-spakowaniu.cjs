// electron-builder (afterPack): ikona i opis w Trzewia.exe. Na Linuksie electron-builder robi to przez Wine (rcedit) —
// tu robi to resedit (czysty JS), więc plik .exe buduje się bez Wine. Ikona: zasoby/ikona.ico (z zasoby/ikona.svg — node zasoby/ikona.mjs).
const fs = require('fs');
const path = require('path');

exports.default = async function poSpakowaniu(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const { NtExecutable, NtExecutableResource, Resource, Data } = await import('resedit');
  const plik = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const exe = NtExecutable.from(fs.readFileSync(plik), { ignoreCert: true });
  const res = NtExecutableResource.from(exe);
  // ikona: podmienia grupę, którą Windows pokazuje (pierwszą w pliku), żeby nie została ikona Electrona
  const ico = Data.IconFile.from(fs.readFileSync(path.join(ctx.packager.info.buildResourcesDir, 'ikona.ico')));
  const grupa = Resource.IconGroupEntry.fromEntries(res.entries)[0] ?? { id: 1, lang: 1033 };
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, grupa.id, grupa.lang, ico.icons.map((i) => i.data));
  const wersja = Resource.VersionInfo.fromEntries(res.entries)[0];
  if (wersja) {
    const [a, b, c] = ctx.packager.appInfo.version.split('.').map(Number);
    const jezyk = wersja.getAllLanguagesForStringValues()[0] ?? { lang: 1033, codepage: 1200 };
    wersja.setFileVersion(a, b, c, 0, jezyk.lang);
    wersja.setProductVersion(a, b, c, 0, jezyk.lang);
    wersja.setStringValues(jezyk, {
      FileDescription: 'Trzewia — Alpha 0.2', ProductName: 'Trzewia', CompanyName: 'Trzewia',
      InternalName: 'Trzewia', OriginalFilename: 'Trzewia.exe', LegalCopyright: 'Trzewia',
    });
    wersja.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(plik, Buffer.from(exe.generate()));
};
