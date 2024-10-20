import { Component, ViewChild, ElementRef, OnInit, NgZone, AfterViewInit } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page implements OnInit, AfterViewInit {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  recognizedText: string = '';
  private model: any;
  private video!: HTMLVideoElement;
  private mediaStream: MediaStream | null = null; // To hold the media stream
  private isDetecting: boolean = false; // Flag to control detection loop

  constructor(private ngZone: NgZone) {}

  async ngOnInit() {
    try {
      await tf.setBackend('webgl'); // Set the backend to WebGL
      this.model = await handpose.load(); // Load the handpose model
      console.log('Handpose model loaded');
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  ngAfterViewInit() {
    this.video = this.videoElement.nativeElement; 
  }

  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.mediaStream = stream; // Store the media stream
        this.video.srcObject = stream; // Set the video source to the stream
        this.video.play();
        this.isDetecting = true; // Start detection
        this.detectHands(); // Start detecting hands after the video plays
      })
      .catch(err => {
        console.error('Error accessing the camera: ', err);
      });
  }

  stopCamera() {
    if (this.mediaStream) {
      const tracks = this.mediaStream.getTracks();
      tracks.forEach(track => track.stop()); // Stop each track
      this.mediaStream = null; // Clear the media stream reference
      this.video.srcObject = null; // Clear the video source
      this.isDetecting = false; // Stop detection
      console.log('Camera stopped');
    }
  }

  async detectHands() {
    if (!this.model) {
      console.error('Model is not loaded yet');
      return; // Ensure model is loaded before attempting to use it
    }

    // Ensure video is ready
    if (this.video.readyState < 2 || !this.isDetecting) {
      requestAnimationFrame(() => this.detectHands());
      return; // Wait until the video is ready or detection is active
    }

    try {
      const predictions = await this.model.estimateHands(this.video);
      if (predictions.length > 0) {
        this.ngZone.run(() => {
          // Process predictions to convert to text
          this.recognizedText = this.convertPredictionsToText(predictions);
          console.log('Predictions:', predictions); // Log predictions for debugging
        });
      } else {
        this.ngZone.run(() => {
          this.recognizedText = 'No hands detected'; // Update recognizedText
        });
      }
    } catch (error) {
      console.error('Error estimating hands:', error);
    }
    
    requestAnimationFrame(() => this.detectHands());
  }

  convertPredictionsToText(predictions: any): string {
    // Check if there are any predictions
    if (predictions.length === 0) {
        return 'No hands detected';
    }

    // Get the landmarks (keypoints) from the first prediction
    const landmarks = predictions[0].landmarks; // Access landmarks instead of keypoints

    // Ensure there are enough landmarks
    if (!landmarks || landmarks.length < 21) { // Check if we have at least 21 landmarks
        return 'Insufficient keypoints';
    }

    const thumb = landmarks[4]; // Thumb landmark
    const indexFinger = landmarks[8]; // Index finger landmark
    const middleFinger = landmarks[12]; // Middle finger landmark

    // Detect Thumbs Up
    if (thumb[1] < indexFinger[1] && thumb[2] > indexFinger[2] && thumb[2] > middleFinger[2]) {
        return 'Thumbs Up';
    }

    // Detect Peace Sign
    if (indexFinger[1] < middleFinger[1] && indexFinger[2] < middleFinger[2]) {
        return 'Peace Sign';
    }

    return 'No recognizable gesture detected'; // Fallback for when no gestures are matched
}
}
