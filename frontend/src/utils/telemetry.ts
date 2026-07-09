/**
 * smartPOS - Native Startup Telemetry & Profiling Tracker
 */

class BootTelemetry {
  public bootStart: number = Date.now();
  public appReady: number = Date.now();
  public windowCreated: number = Date.now();
  public reactStart: number = Date.now();
  public reactLoaded: number = Date.now();
  public dbStart: number = Date.now();
  public dbInitialized: number = Date.now();
  public loginRendered: number = Date.now();

  constructor() {
    this.reactStart = Date.now();
    this.parseQueryParams();
  }

  private parseQueryParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const bootStart = params.get('bootStart');
      const appReady = params.get('appReady');
      const windowCreated = params.get('windowCreated');

      if (bootStart) this.bootStart = parseInt(bootStart);
      else this.bootStart = Date.now() - 400; // fallback web dev offset

      if (appReady) this.appReady = parseInt(appReady);
      else this.appReady = this.bootStart + 120;

      if (windowCreated) this.windowCreated = parseInt(windowCreated);
      else this.windowCreated = this.appReady + 40;
    } catch (e) {
      console.warn("Failed to parse boot telemetry parameters", e);
    }
  }

  public getTimeline() {
    const electronReady = Math.max(1, this.appReady - this.bootStart);
    const windowCreation = Math.max(1, this.windowCreated - this.appReady);
    const reactLoad = Math.max(1, this.reactLoaded - this.windowCreated);
    const dbInit = Math.max(1, this.dbInitialized - this.dbStart);
    const loginRender = Math.max(1, this.loginRendered - this.reactLoaded);
    const totalBoot = Math.max(1, this.loginRendered - this.bootStart);

    return {
      electronReady,
      windowCreation,
      reactLoad,
      dbInit,
      loginRender,
      totalBoot
    };
  }

  public printProfile() {
    const timeline = this.getTimeline();
    console.log("%c smartPOS Performance Profile", "color: #3b82f6; font-weight: bold; font-size: 14px;");
    console.log(`Electron started ............ ${timeline.electronReady}ms`);
    console.log(`Window created .............. ${timeline.windowCreation}ms`);
    console.log(`React loaded ................ ${timeline.reactLoad}ms`);
    console.log(`Database initialized ........ ${timeline.dbInit}ms`);
    console.log(`Login screen rendered ....... ${timeline.loginRender}ms`);
    console.log(`Dashboard lazy loaded ....... Background`);
    console.log(`%cTotal Native Boot .......... ${timeline.totalBoot}ms`, "color: #10b981; font-weight: bold;");
  }
}

export const telemetry = new BootTelemetry();
// Expose globally for UI components
(window as any).telemetry = telemetry;
