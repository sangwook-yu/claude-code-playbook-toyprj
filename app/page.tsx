import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { CopyButton } from "./copy-button";

const CGV_URL = "https://cgv.co.kr/";

/** 빌드해 둔 북마클릿 한 줄. `bun run build:bookmarklet`이 만든다. */
async function readBookmarklet(): Promise<string | null> {
  try {
    return (await readFile(join(process.cwd(), "public", "bookmarklet.txt"), "utf8")).trim();
  } catch {
    return null;
  }
}

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
        CGV 좌석 감시
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        매진된 CGV 회차에 원하는 자리가 풀리면 알려드립니다. 아이맥스 같은 특별관은 물론 일반관도
        감시할 수 있습니다. 설치할 것은 없고 북마크 하나만 등록하면 됩니다.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">설치</h2>
        {bookmarklet ? (
          <div className="mt-3">
            <p
              className="[&_a]:inline-block [&_a]:rounded-lg [&_a]:bg-zinc-900 [&_a]:px-5 [&_a]:py-2.5 [&_a]:text-sm [&_a]:font-semibold [&_a]:text-white [&_a]:no-underline dark:[&_a]:bg-zinc-100 dark:[&_a]:text-zinc-900"
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarklet}" draggable="true">CGV 좌석 감시</a>`,
              }}
            />
            <p className="mt-2 text-xs text-zinc-500">
              이 버튼은 눌러도 여기서는 아무 일도 하지 않습니다. 아래 방법 중 하나로 북마크에
              등록하세요.
            </p>

            <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                방법 1 — 끌어다 놓기
              </h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                <li>
                  북마크바가 안 보이면 <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Ctrl</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Shift</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">B</kbd>를 눌러 켭니다. 주소창
                  바로 아래에 빈 줄이 하나 나타납니다.
                </li>
                <li>위에 있는 검은 버튼을 마우스로 눌러 그 줄로 끌어다 놓습니다.</li>
              </ol>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                방법 2 — 북마크를 직접 만들어 붙여넣기
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                끌어다 놓기가 안 되거나 회사 PC라 확장 프로그램·드래그가 막혀 있을 때 씁니다.
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                <li>
                  아래 코드를 복사합니다.{" "}
                  <span className="inline-block align-middle">
                    <CopyButton text={bookmarklet} />
                  </span>
                </li>
                <li>
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Ctrl</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Shift</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">O</kbd>를 눌러 북마크
                  관리자를 엽니다. (Mac은{" "}
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">⌘</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">⌥</kbd>+
                  <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">B</kbd>)
                </li>
                <li>
                  창 오른쪽 위의 점 세 개(⋮)를 누르고 <strong>새 북마크 추가</strong>를 고릅니다.
                </li>
                <li>
                  <strong>이름</strong>에는 아무거나(예: &ldquo;CGV 좌석 감시&rdquo;) 적고,{" "}
                  <strong>URL</strong> 칸에 방금 복사한 코드를 붙여넣은 뒤 저장합니다.
                </li>
                <li>
                  저장한 북마크가 안 보이면, 북마크 관리자 왼쪽에서 <strong>북마크바</strong> 폴더에
                  들어 있는지 확인하세요. 다른 폴더에 저장됐다면 북마크바로 끌어다 옮기면 됩니다.
                </li>
              </ol>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-zinc-500">
                  붙여넣을 코드를 직접 보기
                </summary>
                <textarea
                  readOnly
                  rows={4}
                  defaultValue={bookmarklet}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2 font-mono text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                />
              </details>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            아직 북마클릿이 만들어지지 않았습니다. <code>bun run build:bookmarklet</code>을 먼저
            실행해 주세요.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">사용법</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <a
              href={CGV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              CGV 사이트
            </a>
            를 새 탭으로 엽니다. 어느 페이지든 괜찮습니다.
          </li>
          <li>북마크바에 등록해 둔 &ldquo;CGV 좌석 감시&rdquo;를 클릭합니다.</li>
          <li>화면 오른쪽 아래에 감시 패널이 뜹니다.</li>
          <li>
            노리는 영화·지점·날짜·상영관과 시간대, 좌석 구역, 최소 연석 수를 정해 조건을 추가합니다.
            상영관은 아이맥스 같은 특별관과 일반관 중에서 그날 실제로 상영하는 것만 나옵니다.
          </li>
          <li>그 탭을 열어둔 채로 다른 일을 하시면 됩니다. 조건에 맞는 자리가 나면 알람이 뜹니다.</li>
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
