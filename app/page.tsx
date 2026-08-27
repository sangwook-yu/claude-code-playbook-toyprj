import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** 빌드해 둔 북마클릿 한 줄. `bun run build:bookmarklet`이 만든다. */
async function readBookmarklet(): Promise<string | null> {
  try {
    return (await readFile(join(process.cwd(), "public", "bookmarklet.txt"), "utf8")).trim();
  } catch {
    return null;
  }
}

const steps = [
  "아래 링크를 브라우저의 북마크바로 끌어다 놓습니다. 북마크바가 안 보이면 Ctrl+Shift+B로 켤 수 있습니다.",
  "CGV 사이트(cgv.co.kr)를 엽니다. 어느 페이지든 괜찮습니다.",
  "북마크를 누르면 화면 오른쪽 아래에 감시 패널이 뜹니다.",
  "노리는 영화·지점·날짜·시간대와 좌석 구역, 최소 연석 수를 정해 조건을 추가합니다.",
  "그 탭을 열어둔 채로 다른 일을 하시면 됩니다. 조건에 맞는 자리가 나면 알람이 뜹니다.",
];

const cautions = [
  "감시는 북마크를 누른 그 탭이 살아 있는 동안에만 돕니다. 새로고침하거나 다른 곳으로 옮기면 멈추니, 다시 눌러 주세요.",
  "패널이 화면에 보이면 감시 중이고, 보이지 않으면 감시도 멈춘 것입니다.",
  "등록해 둔 조건은 남아 있어서, 다시 눌렀을 때 이어서 감시합니다.",
  "자리를 찾아 알려줄 뿐 예매는 하지 않습니다. 좌석 선택과 결제는 직접 하셔야 합니다.",
];

export default async function Home() {
  const bookmarklet = await readBookmarklet();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        아이맥스 좌석 감시
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        매진된 CGV 아이맥스 회차에 원하는 자리가 풀리면 알려드립니다. 설치할 것은 없고 북마크 하나만
        등록하면 됩니다.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">설치</h2>
        {bookmarklet ? (
          <div className="mt-3">
            <p
              className="[&_a]:inline-block [&_a]:rounded-lg [&_a]:bg-zinc-900 [&_a]:px-5 [&_a]:py-2.5 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white [&_a]:no-underline dark:[&_a]:bg-zinc-100 dark:[&_a]:text-zinc-900"
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarklet}" draggable="true">아이맥스 좌석 감시</a>`,
              }}
            />
            <p className="mt-2 text-xs text-zinc-500">
              이 버튼은 눌러도 여기서는 아무 일도 하지 않습니다. 북마크바로 끌어다 놓으세요.
            </p>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400">
                끌어다 놓기가 안 되면 직접 붙여넣기
              </summary>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                북마크를 하나 새로 만들고, 주소 칸에 아래 내용을 그대로 붙여넣으세요.
              </p>
              <textarea
                readOnly
                rows={4}
                defaultValue={bookmarklet}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2 font-mono text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              />
            </details>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            아직 북마클릿이 만들어지지 않았습니다. <code>bun run build:bookmarklet</code>을 먼저
            실행해 주세요.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">쓰는 법</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">알아두실 것</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
