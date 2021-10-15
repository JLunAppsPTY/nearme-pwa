import { Component, Injector, NgZone } from '@angular/core';
import { environment } from '../environments/environment';
import * as Parse from 'parse';
import { LocalStorage } from './services/local-storage';
import { User } from './services/user-service';
import { Installation } from './services/installation';
import { Category } from './services/categories';
import { Place } from './services/place-service';
import { Review } from './services/review-service';
import { Post } from './services/post';
import { Slide } from './services/slider-image';
import { AudioService } from './services/audio-service';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { ActionPerformed, PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { nanoid } from 'nanoid';
import { App } from '@capacitor/app';
import { BasePage } from './pages/base-page/base-page';
import { NavigationEnd } from '@angular/router';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { isPlatform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent extends BasePage {

  constructor(injector: Injector,
    private storage: LocalStorage,
    private userService: User,
    private installationService: Installation,
    private audioService: AudioService,
    private ngZone: NgZone) {
    super(injector);
    this.initializeApp();
  }

  enableMenuSwipe(): boolean {
    return true;
  }

  async initializeApp() {

    this.setupParse();
    this.setupDefaults();
    this.setupEvents();

    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide();
      this.setupPush();
      this.setupStatusBar();
      this.setupOneSignal();
      this.setupNativeAudio();
    }
  }

  async ngOnInit() {

    try {

      this.showLoadingView({ showOverlay: false });

      const user = User.getCurrent();

      if (!user) {
        const user = await this.userService.loginAnonymously();
        await this.userService.becomeWithSessionToken(user.getSessionToken());
      }

      await this.setupDefaults();

      this.showContentView();
      this.loadCurrentUser();
      this.updateInstallation();

    } catch {
      this.showErrorView();
    }
  }

  async setupDefaults() {

    this.translate.setDefaultLang(environment.defaultLang);

    try {

      const supportedLangs = ['en', 'es', 'ar'];
      const browserLang = navigator.language.substr(0, 2);

      let lang = await this.storage.getLang();

      if (lang === null && supportedLangs.indexOf(browserLang) !== -1) {
        lang = browserLang;
      }

      lang = lang || environment.defaultLang;

      if (lang === 'ar') {
        document.dir = 'rtl';
      } else {
        document.dir = 'ltr';
      }

      this.storage.setLang(lang);
      this.translate.use(lang);
      this.preference.lang = lang;
    } catch {
      this.preference.lang = environment.defaultLang;
    }

    try {
      const unit = await this.storage.getUnit() || environment.defaultUnit;
      this.storage.setUnit(unit);
      this.preference.unit = unit;
    } catch {
      this.preference.unit = environment.defaultUnit;
    }

    try {
      const isDarkModeEnabled = await this.storage.getIsDarkModeEnabled();
      this.preference.isDarkModeEnabled = isDarkModeEnabled;

      if (isDarkModeEnabled) {
        this.toggleDarkTheme(isDarkModeEnabled);
      }

    } catch (error) {
      console.log(error);
    }

  }

  setupNativeAudio() {

    let path = 'pristine.mp3';

    if (this.platform.is('ios')) {
      path = 'pristine.m4r';
    }

    this.audioService.preload('ping', path);
  }

  setupEvents() {

    window.addEventListener('user:login', () => {
      this.loadCurrentUser();
      this.updateInstallation();
    });

    window.addEventListener('user:logout', () => {
      this.onLogOut();
    });

    window.addEventListener('installation:update', (event: CustomEvent) => {
      this.updateInstallation(event.detail);
    });

    window.addEventListener('lang:change', (event: CustomEvent) => {
      this.onChangeLang(event.detail);
    });

    window.addEventListener('dark-mode:change', (event: CustomEvent) => {
      const isDarkModeEnabled = event.detail;
      this.toggleDarkTheme(isDarkModeEnabled);
      this.storage.setIsDarkModeEnabled(isDarkModeEnabled);
      this.preference.isDarkModeEnabled = isDarkModeEnabled;
    });

    const topLevelRoutes = [
      '/',
      '/1',
      '/1/home',
      '/1/explore',
      '/1/posts',
      '/1/profile'
    ];

    this.router.events.subscribe(val => {
      if (val instanceof NavigationEnd) {
        this.preference.isSubPage = !topLevelRoutes.includes(val.url);
        const arr = this.router.url.split('/');
        this.preference.currentTab = `/1/${arr[2]}`;
      }
    });

    if (!environment.production) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

      prefersDark.addEventListener(
        'change',
        (mediaQuery) => this.toggleDarkTheme(mediaQuery.matches)
      );
    }
  }

  toggleDarkTheme(isDarkModeEnabled: boolean) {

    // Add body class to body
    document.body.classList.toggle('dark', isDarkModeEnabled)

    // Update theme-color meta tag
    const style = window.getComputedStyle(document.body);

    // When the dark class is applied,
    // the value of the --ion-color-primary
    // is set to a dark color (#222428)

    const primaryColor = style.getPropertyValue('--ion-color-primary').trim();

    document.querySelector('meta[name="theme-color"]')
      .setAttribute('content', primaryColor);

    // Update keyboard style

    if (Capacitor.isNativePlatform()) {

      if (isDarkModeEnabled) {
        Keyboard.setStyle({
          style: KeyboardStyle.Dark,
        });

        if (isPlatform('android')) {
          StatusBar.setBackgroundColor({
            color: primaryColor
          });
        }

      } else {
        Keyboard.setStyle({
          style: KeyboardStyle.Light,
        });

        if (isPlatform('android')) {
          StatusBar.setBackgroundColor({
            color: environment.androidHeaderColor
          });
        }
      }
    }

  }

  async onChangeLang(lang: string) {
    await this.storage.setLang(lang);
    window.location.reload();
  }

  async loadCurrentUser() {
    const user = User.getCurrent();

    try {
      await user?.fetch();
    } catch (error) {
      if (error.code === 209) {
        this.onLogOut();
      }
    }
  }

  setupParse() {
    Slide.getInstance();
    Post.getInstance();
    Review.getInstance();
    Place.getInstance();
    Category.getInstance();
    User.getInstance();

    Parse.initialize(environment.appId);
    (Parse as any).serverURL = environment.serverUrl;
    (Parse as any).idempotency = true;
  }

  setupPush() {

    PushNotifications.addListener('registration', async (token: Token) => {

      const appInfo = await App.getInfo();

      const info = await Device.getInfo();
      const languageCode = await Device.getLanguageCode();
      const id = await this.storage.getInstallationObjectId();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const installationId = nanoid();

      const data: any = {
        channels: [],
        deviceToken: token.value,
        appName: appInfo.name,
        appVersion: appInfo.version,
        appIdentifier: appInfo.id,
        deviceType: info.platform,
        localeIdentifier: languageCode.value,
        timeZone: timezone,
        badge: 0,
      }

      if (!id) {
        data.installationId = installationId;
      }

      const res = await this.installationService.save(id, data);
      this.storage.setInstallationObjectId(res.objectId);

    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.log('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(action));
    });
  }

  setupOneSignal() {

    const appId = environment.oneSignal.appId;

    if (appId) {

      (window as any).plugins.OneSignal.setAppId(environment.oneSignal.appId);

      (window as any).plugins.OneSignal
        .setNotificationWillShowInForegroundHandler((event: any) => {

          const notification = event.notification
          console.log('push received', notification);

          const notificationData: any = {
            ...notification.additionalData
          };
          notificationData.alert = notification.body;

          this.audioService.play('ping');
          this.showNotification(notificationData);

          event.complete(null);
        });

      (window as any).plugins.OneSignal.setNotificationOpenedHandler((res: any) => {
        console.log('push opened', res);

        const notificationData = res.notification.additionalData;

        let page = null;
        let queryParams = {};

        if (notificationData.placeId) {
          page = '/1/home/places/' + notificationData.placeId;
        } else if (notificationData.postId) {
          page = '/1/home/posts/' + notificationData.postId;
        } else if (notificationData.categoryId) {
          page = '/1/home/places';
          queryParams = { cat: notificationData.categoryId };
        }

        if (page) {
          this.ngZone.run(() => {
            this.router.navigate([page], { queryParams });
          });
        }

      });
    }
  }

  setupStatusBar() {
    if (this.platform.is('ios')) {
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setStyle({ style: Style.Dark });
    } else {
      StatusBar.setBackgroundColor({
        color: environment.androidHeaderColor
      });
    }
  }

  async updateInstallation(data: any = {}) {

    try {

      if (Capacitor.isNativePlatform()) {

        const payload: any = {
          user: null,
          ...data,
        };

        const id = await this.storage.getInstallationObjectId();
        const obj = await this.installationService.getOne(id);

        if (obj) {
          payload.isPushEnabled = obj.isPushEnabled;
          this.storage.setIsPushEnabled(obj.isPushEnabled);
          this.preference.isPushEnabled = obj.isPushEnabled;
        }

        const user = User.getCurrent();

        if (user) {
          payload.user = user.toPointer();
        }

        const res = await this.installationService.save(id, payload)
        console.log('Installation updated', res);
      }

    } catch (error) {
      console.log(error);
    }

  }

  async showNotification(notification: any) {

    const viewText = await this.translate.get('VIEW_MORE').toPromise();

    let buttons = null;

    if (notification.placeId) {
      buttons = [{
        side: 'end',
        text: viewText,
        handler: () => {
          this.ngZone.run(() => {
            this.router.navigate(['/1/home/places/' + notification.placeId]);
          });
        }
      }];
    } else if (notification.postId) {
      buttons = [{
        side: 'end',
        text: viewText,
        handler: () => {
          this.ngZone.run(() => {
            this.router.navigate(['/1/home/posts/' + notification.postId]);
          });
        }
      }];
    } else if (notification.categoryId) {
      buttons = [{
        side: 'end',
        text: viewText,
        handler: () => {
          this.ngZone.run(() => {
            this.router.navigate(['/1/home/places'], {
              queryParams: {
                cat: notification.categoryId
              }
            });
          });
        }
      }];
    }

    this.showToast(notification.alert, buttons, 5000);
  }

  async onLogOut() {

    try {

      this.showLoadingView({ showOverlay: true });
      await this.userService.logout();
      await this.updateInstallation();
      this.dismissLoadingView();

      window.location.reload();

    } catch (err) {

      if (err.code === 209) {
        window.location.reload();
      }

      this.dismissLoadingView();
    }

  }

}
