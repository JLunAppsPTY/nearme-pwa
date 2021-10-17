
import { Component, HostListener, Injector } from '@angular/core';
import { LocalStorage } from '../../services/local-storage';
import { BasePage } from '../base-page/base-page';
import { WalkthroughPage } from '../walkthrough/walkthrough';
import { Installation } from 'src/app/services/installation';
import { AppConfigService } from 'src/app/services/app-config.service';
import { isPlatform } from '@ionic/angular';

import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { MessagingService } from 'src/app/services/messaging.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsPage extends BasePage {

  @HostListener('window:popstate')
  onPopState() {
    if (isPlatform('android') && isPlatform('mobileweb')) {
      this.modalCtrl.dismiss();
    }
  }

  public canShowIntroButton: boolean;

  constructor(injector: Injector,
    private afMessaging: AngularFireMessaging,
    private messagingService: MessagingService,
    private alertCtrl1: AlertController,
    private toastCtrl1: ToastController,       
    private appConfigService: AppConfigService,
    private installationService: Installation,
    private storage: LocalStorage) {
    super(injector);
  }

/*   listenForMessages() {
    this.messagingService.getMessages().subscribe(async (msg: any) => {
      console.log('NEW MESSAGE:', msg);
      
      const alert = await this.alertCtrl1.create({
        header: msg.notification.title,
        subHeader: msg.notification.body,
        message: msg.data.info,
        buttons: ['OK'],
      });

      await alert.present();
    })
  } */

/*   requestPermission() {
      this.messagingService.requestPermission().subscribe(
        async token => {
          const toast = await this.toastCtrl1.create({
            message: 'Got your token',
            duration: 2000
          });
          toast.present();
        },
        async(err) => {
          const alert = await this.alertCtrl1.create({
            header: 'Error',
            message: err,
            buttons: ['OK'],        
          });

          await alert.present();
        }
      )
  } */

/*   async deleteToken(){
    this.messagingService.deleteToken();
    const toast = await this.toastCtrl1.create({
      message: 'Token removed',
      duration: 2000
    });
    toast.present();
  } */

  requestPushNotificationsPermission() { // requesting permission
    this.afMessaging.requestToken // getting tokens
      .subscribe(
        (token) => { // USER-REQUESTED-TOKEN
          console.log('Permission granted! Save to the server!', token);
        },
        (error) => {
          console.error(error);
        }
      );
  }

  enableMenuSwipe() {
    return true;
  }

  ngOnInit() {
    this.loadAppConfig();

    if (isPlatform('android') && isPlatform('mobileweb')) {
      history.pushState({ modal: true }, null);
    }
  }

  onDismiss() {
    this.modalCtrl.dismiss();
  }

  async loadAppConfig() {
    try {
      const config = await this.appConfigService.load();
      this.canShowIntroButton = !config?.slides?.disabled;
    } catch (err) {
      console.log(err);
    }
  }

  async onChangeIsPushEnabled(event: CustomEvent) {

    if (!event) return;

    const isPushEnabled = event.detail.checked;

    try {

      const id = await this.storage.getInstallationObjectId();

      await this.installationService.save(id, {
        isPushEnabled: isPushEnabled
      });

      this.storage.setIsPushEnabled(isPushEnabled);
      this.preference.isPushEnabled = isPushEnabled;

    } catch (error) {
      console.warn(error);
    }

  }

  onPushNotification(event: CustomEvent) {
    if (!event) return;
    alert("Hello! I am an alert box!!");
  }

  onChangeDarkMode(event: CustomEvent) {
    if (!event) return;

    const isDarkModeEnabled = event.detail.checked;

    window.dispatchEvent(new CustomEvent('dark-mode:change', {
      detail: isDarkModeEnabled
    }));
  }

  onChangeUnit(event: CustomEvent) {

    if (!event) return;

    const unit = event.detail.value;

    this.storage.setUnit(unit);
    this.preference.unit = unit;
  }

  onChangeLang(event: CustomEvent) {

    if (!event) return;

    const lang = event.detail.value;
    window.dispatchEvent(new CustomEvent("lang:change", { detail: lang }));
  }

  async presentWalkthroughModal() {

    await this.showLoadingView({ showOverlay: true });

    const modal = await this.modalCtrl.create({
      component: WalkthroughPage
    });

    await modal.present();

    this.dismissLoadingView();

  }

}
