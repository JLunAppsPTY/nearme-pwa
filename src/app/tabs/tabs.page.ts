import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Platform, IonTabs, AnimationController, Animation } from '@ionic/angular';
import { Preference } from '../services/preference';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss']
})
export class TabsPage implements OnInit {

  @ViewChild(IonTabs, { static: true }) tabs: IonTabs;
  @ViewChild('tabBarMobile', { static: false, read: ElementRef }) ionTabBar: ElementRef;

  @HostListener('ionScroll', ['$event']) async onScroll($event: any) {

    const isScrollingDown = $event.detail.velocityY > 0;

    if (this.ionTabBar && isScrollingDown && !this.isTabsHidden && !this.isAnimating) {

      this.isTabsHidden = true;
      this.isAnimating = true;

      this.animation.direction('normal').play();
    }

  }

  @HostListener('ionScrollEnd') async onScrollEnd() {

    if (this.ionTabBar && this.isTabsHidden && !this.isAnimating) {

      this.isTabsHidden = false;
      this.isAnimating = true;

      this.animation.direction('reverse').play();
    }
  }

  public isTabsHidden = false;
  public isAnimating: boolean;
  public animation: Animation;

  constructor(
    public platform: Platform,
    public preference: Preference,
    private animationCtrl: AnimationController) { }

  ngOnInit() {}

  tabNames = ['home', 'explore', 'posts', 'profile'];

  ionViewDidEnter() {
    this.setupAnimation();
  }

  setupAnimation() {
    this.animation = this.animationCtrl.create()
      .addElement(this.ionTabBar.nativeElement)
      .easing('ease-in-out')
      .onFinish(() => this.isAnimating = false)
      .duration(500)
      .keyframes([
        { offset: 0, opacity: '1', transform: 'translateY(0px)' },
        { offset: 1, opacity: '0', transform: 'translateY(200px)' }
      ])
  }

  /* 
   * Reset tabs stack
   */

  handleTabClick = (event: MouseEvent) => {
    const { tab } = event.composedPath().find((element: any) =>
      element.tagName === 'ION-TAB-BUTTON') as EventTarget & { tab: string };

    let deep = 1;
    let canGoBack = false;

    const deepFn = () => {
      if (this.tabs.outlet.canGoBack(deep, tab)) {
        canGoBack = true;
        deep++;
        deepFn();
      }
    }

    deepFn();

    if (this.tabNames.includes(tab) && canGoBack) {
      event.stopImmediatePropagation();
      return this.tabs.outlet.pop(deep - 1, tab);
    }
  }
}
