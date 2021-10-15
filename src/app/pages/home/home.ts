import { Component, Injector, ViewChild } from '@angular/core';
import { IonContent, IonInput, isPlatform } from '@ionic/angular';
import { BasePage } from '../base-page/base-page';
import * as Parse from 'parse';
import { Category } from '../../services/categories';
import { Place } from '../../services/place-service';
import { GeolocationService } from 'src/app/services/geolocation.service';
import { Slide } from 'src/app/services/slider-image';
import { LocationSelectPage } from '../location-select/location-select';
import { LocalStorage } from 'src/app/services/local-storage';
import { LocationAddress } from 'src/app/models/location-address';
import { WalkthroughPage } from '../walkthrough/walkthrough';
import { AppConfigService } from 'src/app/services/app-config.service';
import Swiper from 'swiper';

//import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { MessagingService } from 'src/app/services/messaging.service';
import { AlertController, ToastController } from '@ionic/angular';
import { async } from 'rxjs/internal/scheduler/async';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage extends BasePage {

  @ViewChild(IonContent, { static: true }) container: IonContent;

  @ViewChild('txtSearchInput', { static: false }) txtSearchInput: IonInput;

  public slidesTop: Slide[] = [];
  public slidesBottom: Slide[] = [];

  public featuredPlaces: Place[] = [];
  public newPlaces: Place[] = [];
  public nearbyPlaces: Place[] = [];

  public categories: Category[] = [];

  public params: any = {};

  public slideTopOpts: any = {
    pagination: false,
    navigation: false,
  };

  public slideBottomOpts: any = {
    pagination: false,
    navigation: false,
  };

  public skeletonArray: any;

  public location: any;



  constructor(injector: Injector,
    //private afMessaging: AngularFireMessaging,
    private messagingService: MessagingService,
    private alertCtrl1: AlertController,
    private toastCtrl1: ToastController,    
    private localStorage: LocalStorage,
    private geolocationService: GeolocationService,
    private appConfigService: AppConfigService) {
    super(injector);
    this.skeletonArray = Array(6);
    this.params.unit = this.preference.unit;
    this.listenForMessages();
  }

  listenForMessages() {
    this.messagingService.getMessages().subscribe(async (msg: any) => {
      console.log('NEW MESSAGE: ', msg);

      const alert1 = await this.alertCtrl1.create({
        header: msg.notification.title,
        subHeader: msg.notification.body,
        message: msg.data.info,
        buttons: ['OK'],
      });
 
      await alert1.present();
    });
  }

  requestPermission() {
    this.messagingService.requestPermission().subscribe(
      async token => {
        const toast = await this.toastCtrl1.create({
          message: 'Got your token',
          duration: 2000
        });
        toast.present();
      },
      async (err) => {
        const alert = await this.alertCtrl1.create({
          header: 'Error',
          message: err,
          buttons: ['OK'],
        });
 
        await alert.present();
      }
    );
  }

  async deleteToken() {
    this.messagingService.deleteToken();
    const toast = await this.toastCtrl1.create({
      message: 'Token removed',
      duration: 2000
    });
    toast.present();
  }

  // requestPushNotificationsPermission() { // requesting permission
  //   this.afMessaging.requestToken // getting tokens
  //     .subscribe(
  //       (token) => { // USER-REQUESTED-TOKEN
  //         console.log('Permission granted! Save to the server!', token);
  //       },
  //       (error) => {
  //         console.error(error);
  //       }
  //     );
  // }
  
  enableMenuSwipe(): boolean {
    return false;
  }

  async ionViewDidEnter() {
    const title = await this.getTrans('APP_NAME');
    this.setPageTitle(title);

    this.setMetaTags({
      title: title
    });
  }

  ionViewWillEnter() {
    this.container?.scrollToTop();
  }

  async ngOnInit() {

    try {

      this.showLoadingView({ showOverlay: false });

      const appConfig = await this.appConfigService.load();

      if (appConfig && appConfig.slides && appConfig.slides.disabled) {
        this.onReload();
        return;
      }

      const skipIntro = await this.localStorage.getSkipIntroPage();

      if (!skipIntro) {
        const modal = await this.modalCtrl.create({
          component: WalkthroughPage
        });

        await modal.present();

        await modal.onDidDismiss();
      }

      this.onReload();

    } catch {
      this.showErrorView();
    }

  }


  async onReload(event: any = {}) {
    this.refresher = event.target;
    this.showLoadingView({ showOverlay: false });

    const location = await this.geolocationService.getCurrentPosition();

    if (!location) {
      this.onRefreshComplete();
      return this.showErrorView();
    }

    this.location = location;
    this.params.latitude = location.latitude;
    this.params.longitude = location.longitude;
    this.params.address = location.address;

    this.loadData();
  }

  onLogoTouched() {
    this.container.scrollToTop(300);
  }

  async loadData() {

    try {

      const data: any = await Parse.Cloud.run('getHomePageData', this.params);

      this.newPlaces = data.newPlaces || [];
      this.featuredPlaces = data.featuredPlaces || [];
      this.nearbyPlaces = data.nearbyPlaces || [];
      this.categories = data.categories || [];
      
      const slides: Slide[] = data.slides || [];

      this.slidesTop = slides.filter(slide => slide.position === 'top');
      this.slidesBottom = slides.filter(slide => slide.position === 'bottom');

      if (this.slidesTop.length > 1) {
        this.slideTopOpts.pagination = true;
        this.slideTopOpts.navigation = isPlatform('desktop');
      }

      if (this.slidesBottom.length > 1) {
        this.slideBottomOpts.pagination = true;
        this.slideBottomOpts.navigation = isPlatform('desktop');
      }

      this.onRefreshComplete();
      this.showContentView();

    } catch {

      this.showErrorView();
      this.onRefreshComplete();
      this.translate.get('ERROR_NETWORK')
        .subscribe(str => this.showToast(str));
    }

  }

  onPlaceTouched(place: Place) {
    this.navigateToRelative('./places/' + place.id + '/' + place.slug);
  }

  async onPresentLocationSelectModal() {

    await this.showLoadingView({ showOverlay: true });

    const modal = await this.modalCtrl.create({
      component: LocationSelectPage,
    });

    await modal.present();

    this.dismissLoadingView();

    const { data } = await modal.onDidDismiss();

    if (data) {

      const location: LocationAddress = {
        address: data.formatted_address,
        latitude: data.geometry.location.lat(),
        longitude: data.geometry.location.lng(),
      };

      this.navigateToRelative('./places', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });
    }
  }

  onSlideTouched(slide: Slide) {

    if (slide.url && slide.type === 'url') {
      this.openUrl(slide.url);
    } else if (slide.place && slide.type === 'place') {
      this.navigateToRelative('./places/' + slide.place.id + '/' + slide.place.slug);
    } else if (slide.post && slide.type === 'post') {
      this.navigateToRelative('./posts/' + slide.post.id + '/' + slide.post.slug);
    } else if (slide.category && slide.type === 'category') {
      this.navigateToRelative('./places', {
        cat: slide.category.id
      });
    } else {
      // no match...
    }
  }

  onSubmitSearch(event: any) {
    if (event.key === "Enter") {
      this.navigateToRelative('./search', {
        q: event.target.value
      });
    }
  }

  onSwiperInitialized(swiper: Swiper) {
    swiper.update();
  }

}
