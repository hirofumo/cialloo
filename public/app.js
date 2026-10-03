import { CIALLO_POEMS } from "./poems.js";

const greetingEl = document.getElementById("greeting");
const counterEl = document.getElementById("counter");
const sessionEl = document.getElementById("session-counter");
const cialloBtn = document.getElementById("ciallo-btn");

const LOCAL_CLICKS_KEY = "cialloo_local_clicks";

let lastIndex = -1;
let sessionClicks = readLocalClicks();
let pending = false;

function readLocalClicks() {
  try {
    const value = Number.parseInt(localStorage.getItem(LOCAL_CLICKS_KEY), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeLocalClicks(value) {
  try {
    localStorage.setItem(LOCAL_CLICKS_KEY, String(value));
  } catch {
    // 本地存储不可用时忽略，仅当前页面计数
  }
}

function pickPhrase() {
  let index;
  do {
    index = Math.floor(Math.random() * CIALLO_POEMS.length);
  } while (index === lastIndex && CIALLO_POEMS.length > 1);
  lastIndex = index;
  return CIALLO_POEMS[index];
}

function showPhrase() {
  greetingEl.textContent = pickPhrase();
  greetingEl.classList.remove("pop");
  void greetingEl.offsetWidth;
  greetingEl.classList.add("pop");
}

function renderCount(count) {
  if (count === null) {
    counterEl.textContent = "？？？";
    counterEl.classList.add("offline");
    return;
  }
  counterEl.classList.remove("offline");
  counterEl.textContent = count.toLocaleString("zh-CN");
}

function renderSessionCount() {
  sessionEl.textContent =
    sessionClicks === 0
      ? "你还没有打招呼哦"
      : sessionClicks === 1
        ? "你已经 Ciallo 了 1 次"
        : `你已经 Ciallo 了 ${sessionClicks} 次`;
}

async function fetchCount(method) {
  const res = await fetch("/api/counter", {
    method,
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`counter API responded ${res.status}`);
  }

  const data = await res.json();
  if (typeof data.count !== "number" || !Number.isFinite(data.count)) {
    throw new Error("counter API returned a malformed payload");
  }

  return data.count;
}

async function loadCount() {
  try {
    renderCount(await fetchCount("GET"));
  } catch (error) {
    console.warn("[ciallo] 读取计数失败", error);
    renderCount(null);
  }
}

async function ciallo() {
  // 全站只有一条计数记录，点击再快也会被同一个 Durable Object 串行化；
  // 但没必要让用户把请求打满——在飞时直接忽略后续点击。
  if (pending) return;
  pending = true;
  cialloBtn.disabled = true;

  try {
    showPhrase();
    sessionClicks += 1;
    writeLocalClicks(sessionClicks);
    renderSessionCount();
    renderCount(await fetchCount("POST"));
  } catch (error) {
    console.warn("[ciallo] 计数写入失败", error);
    renderCount(null);
  } finally {
    pending = false;
    cialloBtn.disabled = false;
  }
}

cialloBtn.addEventListener("click", ciallo);
renderSessionCount();
showPhrase();
loadCount();