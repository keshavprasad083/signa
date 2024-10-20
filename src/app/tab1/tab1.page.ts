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
  recognizedText: string = ''; // Store recognized signs
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
    const landmarks = predictions[0].landmarks;

    // Ensure there are enough landmarks
    if (!landmarks || landmarks.length < 21) {
      return 'Insufficient keypoints';
    }

    // Define gesture detection logic
    const gestures = {
      'Thumbs Up': () => this.isThumbsUp(landmarks),
      'Peace Sign': () => this.isPeaceSign(landmarks),
      'Thank You': () => this.isThankYou(landmarks),
      'I Love You': () => this.isILoveYou(landmarks),
      'Sorry': () => this.isSorry(landmarks),
      'Hello': () => this.isHello(landmarks),
      'Goodbye': () => this.isGoodbye(landmarks),
      'Yes': () => this.isYes(landmarks),
      'No': () => this.isNo(landmarks),
      'Help': () => this.isHelp(landmarks), // Add Help gesture
    };

    // Check each gesture
    for (const [gesture, detectionFunc] of Object.entries(gestures)) {
      if (detectionFunc()) {
        return gesture; // Return the first recognized gesture
      }
    }

    return 'No recognizable gesture detected'; // Fallback for when no gestures are matched
  }

  // Gesture detection functions
  isThumbsUp(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];

    return thumb[1] < indexFinger[1] && thumb[2] < indexFinger[2]; // Adjusted logic for thumbs up
  }

  isPeaceSign(landmarks: any): boolean {
    const indexFinger = landmarks[8];
    const middleFinger = landmarks[12];

    return indexFinger[2] < middleFinger[2] && indexFinger[1] < middleFinger[1]; // Adjusted logic for peace sign
  }

  isThankYou(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];

    return thumb[2] > indexFinger[2]; // Check if the thumb is above the index finger
  }

  isILoveYou(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];
    const pinky = landmarks[20]; // Pinky is the 20th landmark

    return thumb[2] < indexFinger[2] && pinky[2] > indexFinger[2]; // Check thumb and pinky position
  }

  isSorry(landmarks: any): boolean {
    return landmarks.length === 21; // Check if the model detected all landmarks and add specific logic if needed
  }

  isHello(landmarks: any): boolean {
    return landmarks[4][1] < landmarks[8][1]; // Check if the thumb is raised above the index finger
  }

  isGoodbye(landmarks: any): boolean {
    return landmarks[4][1] < landmarks[8][1] && landmarks[8][1] < landmarks[12][1]; // Hand motion logic
  }

  isYes(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];

    return thumb[1] < indexFinger[1]; // Logic for confirming
  }

  isNo(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];

    return thumb[1] > indexFinger[1]; // Logic for negation
  }

  isHelp(landmarks: any): boolean {
    const thumb = landmarks[4];
    const indexFinger = landmarks[8];
    const middleFinger = landmarks[12];
    const wrist = landmarks[0]; // Correctly get the wrist landmark

    // Check if the fist (thumb and fingers) is below the open hand (palm facing down)
    return (
      thumb[1] < wrist[1] && // Thumb below wrist
      indexFinger[1] > wrist[1] && // Index finger above wrist
      middleFinger[1] > wrist[1] // Middle finger above wrist
    );
  }
}
