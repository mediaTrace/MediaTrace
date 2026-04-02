import type { BrowserContext, Page } from "playwright";
import { logger } from "../../runtime/logger";
import { createTimeoutSignal } from "./net";

/**
 * 抖音登录模块（对齐 Python: media_platform/douyin/login.py 的核心流程）
 */
export class DouyinLogin {
  private readonly loginType: "qrcode" | "phone" | "cookie";
  private readonly browserContext: BrowserContext;
  private readonly contextPage: Page;
  private readonly loginPhone: string;
  private readonly cookieStr: string;

  public constructor(params: {
    loginType: "qrcode" | "phone" | "cookie";
    browserContext: BrowserContext;
    contextPage: Page;
    loginPhone?: string;
    cookieStr?: string;
  }) {
    this.loginType = params.loginType;
    this.browserContext = params.browserContext;
    this.contextPage = params.contextPage;
    this.loginPhone = params.loginPhone ?? "";
    this.cookieStr = params.cookieStr ?? "";
  }

  /**
   * 启动登录流程（会在需要时弹出登录框并等待登录成功）
   */
  public async begin(): Promise<void> {
    logger.info(`登录方式: ${this.loginType}`);
    if (this.loginType !== "cookie") {
      await this.popupLoginDialog();
    }

    if (this.loginType === "qrcode") {
      await this.loginByQrcode();
    } else if (this.loginType === "phone") {
      await this.loginByMobile();
    } else if (this.loginType === "cookie") {
      await this.loginByCookies();
    } else {
      throw new Error(`不支持的登录方式: ${this.loginType}`);
    }

    await this.sleep(6000);
    const title = await this.contextPage.title().catch(() => "");
    if (title.includes("验证码中间页")) {
      await this.checkPageDisplaySlider();
    }

    logger.info("登录完成，开始确认登录状态");
    const ok = await this.checkLoginState(300);
    if (!ok) {
      throw new Error("登录失败：超时未检测到登录状态");
    }

    await this.sleep(5000);
  }

  /**
   * 检查登录状态：localStorage HasUserLogin 或 Cookie LOGIN_STATUS
   */
  public async checkLoginState(maxSeconds: number): Promise<boolean> {
    const deadline = Date.now() + maxSeconds * 1000;
    while (Date.now() < deadline) {
      try {
        if (this.contextPage.isClosed()) return false;
        const pages = this.browserContext.pages();
        if (!pages.length) return false;
      } catch {
        return false;
      }
      const ok = await this.isLoggedIn();
      if (ok) return true;
      await this.sleep(1000);
    }
    return false;
  }

  /**
   * 如果登录弹窗未自动弹出，手动点击“登录”
   */
  public async popupLoginDialog(): Promise<void> {
    const dialogSelector = "xpath=//div[@id='login-panel-new']";
    try {
      await this.contextPage.waitForSelector(dialogSelector, { timeout: 10_000 });
      return;
    } catch {
      logger.warn("登录弹窗未自动弹出，尝试手动点击登录按钮");
    }

    const loginButton = this.contextPage.locator("xpath=//p[text() = '登录']").first();
    await loginButton.click({ timeout: 10_000 }).catch(() => undefined);
    await this.sleep(500);
  }

  /**
   * 二维码登录：提取二维码图片并提示用户扫码
   */
  public async loginByQrcode(): Promise<void> {
    logger.info("开始二维码登录，请在浏览器中扫码");
    const selector = "xpath=//div[@id='animate_qrcode_container']//img";
    const base64Img = await findLoginQrcode(this.contextPage, selector);
    if (!base64Img) {
      throw new Error("未找到二维码图片，请确认页面是否正确弹出登录框");
    }
    logger.info("二维码已加载，请手动扫码登录");
    await this.sleep(2000);
  }

  /**
   * 手机验证码登录：自动填充手机号并点击获取验证码，验证码需用户手动输入
   */
  public async loginByMobile(): Promise<void> {
    if (!this.loginPhone) {
      throw new Error("phone 登录需要提供 --phone");
    }

    logger.info("开始手机号验证码登录");
    const mobileTab = this.contextPage.locator("xpath=//li[text() = '验证码登录']").first();
    await mobileTab.click({ timeout: 10_000 });
    await this.contextPage.waitForSelector("xpath=//article[@class='web-login-mobile-code']", { timeout: 10_000 });

    const phoneInput = this.contextPage.locator("xpath=//input[@placeholder='手机号']").first();
    await phoneInput.fill(this.loginPhone);
    await this.sleep(500);

    const sendBtn = this.contextPage.locator("xpath=//span[text() = '获取验证码']").first();
    await sendBtn.click({ timeout: 10_000 });

    await this.checkPageDisplaySlider();

    logger.info("请在页面中手动输入短信验证码并点击登录按钮");
  }

  /**
   * Cookie 登录：把 cookie 字符串写入浏览器上下文
   */
  public async loginByCookies(): Promise<void> {
    logger.info("使用 Cookie 登录");
    logger.info(`Cookie: ${this.cookieStr}`);
    // const cookiesString = 'ddd'
    const s = String(this.cookieStr || "").trim();
    if (!s) return;
    if (s.startsWith("[")) {
      const arr = safeParseJsonArray(s);
      if (!arr.length) return;
      const cookies = arr
        .map((c) => normalizeCookieForPlaywright(c))
        .filter((c) => Boolean(c?.name) && Boolean(c?.value));
      if (!cookies.length) return;
      console.log("Cookie1111111111111111:");
      await this.browserContext.addCookies(cookies as any).catch(() => undefined);
      await this.contextPage.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
      return;
    }
    const list = parseCookieString(s);
    if (!list.length) return;
    const cookies = list.map((c) => ({
      name: c.name,
      value: c.value,
      url: "https://www.douyin.com",
    }));
    await this.browserContext.addCookies(cookies as any).catch(() => undefined);
    await this.contextPage.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
  }

  /**
   * 检查页面是否出现滑块验证码（Node 版不做图像识别，提示用户手动完成）
   */
  public async checkPageDisplaySlider(): Promise<void> {
    const backSelector = "#captcha-verify-image";
    try {
      await this.contextPage.waitForSelector(backSelector, { state: "visible", timeout: 30_000 });
    } catch {
      return;
    }

    logger.warn("检测到滑块验证码，请在浏览器中手动完成验证");
  }

  private async isLoggedIn(): Promise<boolean> {
    for (const page of this.browserContext.pages()) {
      const ok = await page
        .evaluate(() => {
          try {
            return (globalThis as any).localStorage?.getItem("HasUserLogin") === "1";
          } catch {
            return false;
          }
        })
        .catch(() => false);
      if (ok) return true;
    }

    const cookies = await this.browserContext.cookies().catch(() => []);
    const loginStatus = cookies.find((c) => c.name === "LOGIN_STATUS")?.value;
    if (loginStatus === "1") return true;
    return false;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * 从页面提取登录二维码图片（dataURL 或下载后转 base64）
 */
async function findLoginQrcode(page: Page, selector: string): Promise<string | null> {
  const img = page.locator(selector).first();
  await img.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  const src = (await img.getAttribute("src").catch(() => null)) ?? "";
  if (!src) return null;
  if (src.startsWith("data:image/")) return src;
  if (src.startsWith("http")) {
    const { fetch } = await import("undici");
    const res = await fetch(src, { signal: createTimeoutSignal(10_000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const b64 = Buffer.from(ab).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/png";
    return `data:${mime};base64,${b64}`;
  }
  return null;
}

function parseCookieString(cookieStr: string): Array<{ name: string; value: string }> {
  return cookieStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((kv) => {
      const idx = kv.indexOf("=");
      if (idx < 0) return null;
      return { name: kv.slice(0, idx).trim(), value: kv.slice(idx + 1).trim() };
    })
    .filter((x): x is { name: string; value: string } => Boolean(x?.name));
}

function safeParseJsonArray(text: string): any[] {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normalizeCookieForPlaywright(raw: any): any {
  const cookie: any = {
    name: String(raw?.name ?? ""),
    value: String(raw?.value ?? ""),
    domain: raw?.domain ? String(raw.domain) : ".douyin.com",
    path: raw?.path ? String(raw.path) : "/",
  };
  if (raw?.expires !== undefined) cookie.expires = Number(raw.expires);
  if (raw?.httpOnly !== undefined) cookie.httpOnly = Boolean(raw.httpOnly);
  if (raw?.secure !== undefined) cookie.secure = Boolean(raw.secure);
  if (raw?.sameSite !== undefined) cookie.sameSite = raw.sameSite;
  return cookie;
}

