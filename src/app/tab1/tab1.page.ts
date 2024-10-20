import { Component, ViewChild, ElementRef, OnInit, NgZone } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  recognizedText: string = '';
  private model: any;
  private video: HTMLVideoElement;

  constructor(private ngZone: NgZone) {
    this.video = this.videoElement.nativeElement;
  }

  async ngOnInit() {
    this.model = await handpose.load();
    console.log('Handpose model loaded');
  }

  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.video.srcObject = stream;
        this.video.play();
        this.detectHands();
      })
      .catch(err => {
        console.error('Error accessing the camera: ', err);
      });
  }

  async detectHands() {
    const predictions = await this.model.estimateHands(this.video);
    if (predictions.length > 0) {
      this.ngZone.run(() => {
        // Process predictions to convert to text
        this.recognizedText = this.convertPredictionsToText(predictions);
      });
    }
    requestAnimationFrame(() => this.detectHands());
  }

  convertPredictionsToText(predictions: any): string {
    // This is where you would implement the conversion logic.
    // For now, we'll just return a placeholder text.
    return 'Detected hands!';
  }
}
