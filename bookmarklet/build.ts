/**
 * 북마클릿 한 줄을 만든다.
 * 소스를 번들해 최소화한 뒤 `javascript:` 주소로 감싸 public/에 저장한다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outputPath = join(root, "public", "bookmarklet.txt");

const built = await Bun.build({
  entrypoints: [join(here, "src", "entry.ts")],
  target: "browser",
  minify: true,
});

if (!built.success) {
  for (const log of built.logs) console.error(log);
  throw new Error("번들에 실패했습니다.");
}

const code = await built.outputs[0].text();
// 페이지에 남는 흔적을 줄이려고 즉시 실행 함수로 감싼다.
const wrapped = `(function(){${code}})();`;
const bookmarklet = `javascript:${encodeURIComponent(wrapped)}`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bookmarklet, "utf8");

const kb = (bookmarklet.length / 1024).toFixed(1);
console.log(`북마클릿을 만들었습니다: public/bookmarklet.txt (${bookmarklet.length}자, ${kb}KB)`);
