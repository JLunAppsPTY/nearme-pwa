import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScriptService {

  constructor() { }

  public loadScript(url: string, id?: string): Promise<any> {

    return new Promise((resolve, reject) => {

      const script = document.createElement('script');
      script.async = true;
      script.id = id;
      script.src = url;

      script.onload = () => resolve(true);
      script.onerror = () => reject();

      document.body.appendChild(script);
    });
  }

}