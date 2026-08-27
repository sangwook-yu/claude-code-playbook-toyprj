/** 패널의 모양. shadow DOM 안에 들어가므로 CGV 페이지 CSS와 섞이지 않는다. */
export const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, "Malgun Gothic", sans-serif; }

.shell {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  width: 360px; max-height: 82vh; display: flex; flex-direction: column;
  background: #fff; color: #18181b; border: 1px solid #d4d4d8; border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,.22); font-size: 13px; line-height: 1.55;
}
.shell.folded .body { display: none; }

.head {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-bottom: 1px solid #e4e4e7; cursor: pointer;
}
.head h1 { margin: 0; font-size: 13px; font-weight: 700; flex: 1; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex: none; }
.dot.off { background: #a1a1aa; }
.iconbtn {
  border: 0; background: transparent; cursor: pointer; font-size: 15px;
  line-height: 1; padding: 2px 5px; color: #52525b; border-radius: 4px;
}
.iconbtn:hover { background: #f4f4f5; }

.body { overflow-y: auto; padding: 10px 12px 14px; display: flex; flex-direction: column; gap: 12px; }

.watching { font-size: 12px; color: #3f3f46; display: flex; align-items: center; gap: 8px; }
.watching .grow { flex: 1; }

fieldset { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px; margin: 0; }
legend { font-size: 12px; font-weight: 700; padding: 0 4px; }

label { display: block; font-size: 11px; color: #52525b; margin: 6px 0 2px; }
select, input {
  width: 100%; padding: 5px 7px; font-size: 12px; color: #18181b;
  border: 1px solid #d4d4d8; border-radius: 6px; background: #fff;
}
select:disabled, input:disabled { background: #f4f4f5; color: #a1a1aa; }

.two { display: flex; gap: 8px; }
.two > * { flex: 1; }

.regions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-top: 4px; }
.regions label {
  margin: 0; display: flex; align-items: center; justify-content: center; gap: 3px;
  border: 1px solid #d4d4d8; border-radius: 5px; padding: 5px 2px; cursor: pointer;
  font-size: 11px; color: #3f3f46; text-align: center;
}
.regions label:has(input:checked) { background: #18181b; color: #fff; border-color: #18181b; }
.regions input { width: auto; margin: 0; }

.checkrow {
  display: flex; align-items: center; gap: 6px; margin: 8px 0 0;
  font-size: 11px; color: #3f3f46; cursor: pointer;
}
.checkrow input { width: auto; margin: 0; }

button.action {
  width: 100%; margin-top: 10px; padding: 7px; font-size: 12px; font-weight: 600;
  color: #fff; background: #18181b; border: 0; border-radius: 6px; cursor: pointer;
}
button.action:disabled { background: #a1a1aa; cursor: not-allowed; }

button.small {
  padding: 3px 8px; font-size: 11px; border: 1px solid #d4d4d8;
  background: #fff; border-radius: 5px; cursor: pointer; color: #3f3f46;
}
button.small:hover { background: #f4f4f5; }

h2 { margin: 0 0 6px; font-size: 12px; font-weight: 700; display: flex; align-items: center; }
h2 .grow { flex: 1; }

ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
li.card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 8px; }
li.card .title { font-weight: 600; }
li.card .detail, li.card .status { font-size: 11px; color: #52525b; }
li.card .status.bad { color: #dc2626; font-weight: 600; }
li.card .row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
li.card .row .grow { flex: 1; }

.badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: #e4e4e7; color: #52525b; }
.badge.on { background: #dcfce7; color: #166534; }

button.notifybtn {
  padding: 3px 8px; font-size: 11px; font-weight: 600; border: 0; border-radius: 5px; cursor: pointer;
  background: #e4e4e7; color: #52525b;
}
button.notifybtn.on { background: #22c55e; color: #fff; }
button.notifybtn:disabled { cursor: not-allowed; opacity: .6; }

.intervalbox { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #52525b; }
.intervalbox input {
  width: 42px; padding: 2px 4px; font-size: 11px; text-align: right;
  border: 1px solid #d4d4d8; border-radius: 5px; background: #fff; color: #18181b;
}

li.alarm { border: 2px solid #f59e0b; background: #fffbeb; }
li.alarm .title { color: #92400e; }
li.alarm .detail { color: #a16207; }

.empty { border: 1px dashed #d4d4d8; border-radius: 8px; padding: 14px; text-align: center; font-size: 11px; color: #71717a; }
.error { border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; border-radius: 8px; padding: 8px; font-size: 11px; }
`;
