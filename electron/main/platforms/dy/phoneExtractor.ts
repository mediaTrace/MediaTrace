const CHINESE_TO_DIGIT: Record<string, string> = {
  "①": "1",
  "②": "2",
  "③": "3",
  "④": "4",
  "⑤": "5",
  "⑥": "6",
  "⑦": "7",
  "⑧": "8",
  "⑨": "9",
  "⑩": "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
  零: "0",
  壹: "1",
  贰: "2",
  叁: "3",
  肆: "4",
  伍: "5",
  陆: "6",
  柒: "7",
  捌: "8",
  玖: "9",
};

const VALID_PHONE_PREFIXES = new Set(["13", "14", "15", "16", "17", "18", "19"]);

/**
 * 从文本中提取手机号集合（含分隔符/中文数字等）
 */
export function extractPhonesFromText(text: string): Set<string> {
  if (!text) return new Set<string>();
  const phones = new Set<string>();

  for (const p of text.match(/1[3-9]\d{9}/g) ?? []) {
    if (isValidPhone(p)) phones.add(p);
  }

  for (const p of extractSeparatedPhones(text)) phones.add(p);
  for (const p of extractChineseDigitPhones(text)) phones.add(p);
  for (const p of extractPotentialPhones(text)) phones.add(p);

  return phones;
}

/**
 * 把手机号集合按逗号拼接（稳定排序）
 */
export function extractAndFormatPhones(text: string): string {
  const phones = [...extractPhonesFromText(text)].sort();
  return phones.length ? phones.join(",") : "";
}

function extractSeparatedPhones(text: string): Set<string> {
  const patterns = [/1[3-9][\d\s\-._]{10,15}/g, /1[3-9]\d[\d\-._\s]{7,12}/g];
  const out = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.match(pattern) ?? []) {
      const clean = match.replace(/\D/g, "");
      if (isValidPhone(clean)) out.add(clean);
    }
  }
  return out;
}

function extractChineseDigitPhones(text: string): Set<string> {
  const patterns = [
    /[①②③④⑤⑥⑦⑧⑨](?:[①②③④⑤⑥⑦⑧⑨⑩]){10}/g,
    /[一二三四五六七八九](?:[一二三四五六七八九零]){10}/g,
    /[壹贰叁肆伍陆柒捌玖](?:[壹贰叁肆伍陆柒捌玖零]){10}/g,
  ];

  const out = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.match(pattern) ?? []) {
      const converted = [...match].map((ch) => CHINESE_TO_DIGIT[ch] ?? "").join("");
      if (isValidPhone(converted)) out.add(converted);
    }
  }
  return out;
}

function extractPotentialPhones(text: string): Set<string> {
  const out = new Set<string>();

  const patterns = [/(1[3-9]\d{9})\D/g, /\D(1[3-9]\d{9})/g, /\D(1[3-9]\d{9})\D/g];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const p = match[1];
      if (p && isValidPhone(p)) out.add(p);
    }
  }

  for (const long of text.match(/\d{12,20}/g) ?? []) {
    for (let i = 0; i <= long.length - 11; i++) {
      const p = long.slice(i, i + 11);
      if (isValidPhone(p)) out.add(p);
    }
  }

  return out;
}

function isValidPhone(phone: string): boolean {
  if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) return false;
  if (!VALID_PHONE_PREFIXES.has(phone.slice(0, 2))) return false;
  if (/^1[3-9]0{9}$/.test(phone)) return false;
  if (/^1[3-9]1{9}$/.test(phone)) return false;
  if (/^1[3-9]2{9}$/.test(phone)) return false;
  return true;
}

