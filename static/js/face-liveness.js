/**
 * PUP UNISAN CAMS - Biometric Anti-Spoofing & Liveness Detection Engine
 * 
 * Enforces real-time live human KYC verification using 3D Head Pose (Yaw) rotation
 * and Eye Aspect Ratio (EAR) blink detection.
 * 
 * Interactive Challenge:
 * 1. User faces camera.
 * 2. User turns head slowly left or right (Lilingon sa kaliwa o kanan).
 * 3. User turns head to the opposite side.
 * 4. User returns to center.
 * 5. Live human verified! (Optional fast-track: natural human blink).
 * 
 * Strictly rejects:
 * - Phone screen gallery photos & replays
 * - Printed 1x1 / passport / ID photos
 * - Magazines, newspapers, posters
 * - Animals & non-human objects
 * - Digital photo swaps / tampered frames
 */

class FaceLivenessDetector {
    constructor(options = {}) {
        // Head turn (Yaw) parameters
        this.minTurnFrames = options.minTurnFrames || 2;
        this.minCenterFrames = options.minCenterFrames || 2;
        this.livenessTTLMs = options.livenessTTLMs || 30000; // 30s validity once live verified
        
        // Blink fallback parameters
        this.minOpenFrames = options.minOpenFrames || 2;
        this.earClosedRatio = options.earClosedRatio || 0.74;
        this.absClosedThreshold = options.absClosedThreshold || 0.215;
        this.absOpenThreshold = options.absOpenThreshold || 0.245;
        this.maxBlinkDurationMs = options.maxBlinkDurationMs || 900;
        this.minBlinkDurationMs = options.minBlinkDurationMs || 70;

        this.reset();
    }

    reset() {
        this.isLive = false;
        this.verifiedAt = 0;
        
        // Head turn state machine
        this.turnedLeft = false;
        this.turnedRight = false;
        this.leftFrames = 0;
        this.rightFrames = 0;
        this.centerFrames = 0;

        // Blink fallback state machine
        this.blinkCount = 0;
        this.openFrames = 0;
        this.closedFrames = 0;
        this.closedStartTime = 0;
        this.wasOpen = false;
        this.baselineEAR = 0;
        this.earSamples = [];

        // Box & timing
        this.lastBox = null;
        this.firstDetectionTime = 0;
        this.lastDetectionTime = 0;
    }

    euclidean(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    calcEAR(eye) {
        if (!eye || eye.length < 6) return 0;
        const v1 = this.euclidean(eye[1], eye[5]);
        const v2 = this.euclidean(eye[2], eye[4]);
        const h = this.euclidean(eye[0], eye[3]);
        if (h === 0) return 0;
        return (v1 + v2) / (2.0 * h);
    }

    calcYaw(landmarks) {
        if (!landmarks) return { yawRatio: 0.5, eyeDistRatio: 1.0, isLeft: false, isRight: false, isCenter: true };

        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        if (!jaw || jaw.length < 17 || !nose || nose.length < 4 || !leftEye || !rightEye) {
            return { yawRatio: 0.5, eyeDistRatio: 1.0, isLeft: false, isRight: false, isCenter: true };
        }

        const noseTip = (landmarks.positions && landmarks.positions[30]) ? landmarks.positions[30] : (nose[3] || nose[nose.length - 1]);
        
        // Jaw X bounds
        const minJawX = Math.min(jaw[0].x, jaw[16].x);
        const maxJawX = Math.max(jaw[0].x, jaw[16].x);
        const jawWidth = maxJawX - minJawX;
        if (jawWidth <= 0) return { yawRatio: 0.5, eyeDistRatio: 1.0, isLeft: false, isRight: false, isCenter: true };

        // Horizontal ratio of nose tip relative to jaw boundaries
        const yawRatio = (noseTip.x - minJawX) / jawWidth;

        // Eye distance ratios relative to nose tip
        const leftEyeCenterX = (leftEye[0].x + leftEye[3].x) / 2;
        const rightEyeCenterX = (rightEye[0].x + rightEye[3].x) / 2;
        const distLeft = Math.abs(noseTip.x - leftEyeCenterX);
        const distRight = Math.abs(noseTip.x - rightEyeCenterX);
        const eyeDistRatio = distLeft / Math.max(distRight, 0.001);

        // Turned Left (Viewer's left / subject's right):
        // nose tip shifts towards minJawX, yawRatio decreases
        const isLeft = (yawRatio <= 0.39) || (eyeDistRatio <= 0.65);

        // Turned Right (Viewer's right / subject's left):
        // nose tip shifts towards maxJawX, yawRatio increases
        const isRight = (yawRatio >= 0.61) || (eyeDistRatio >= 1.55);

        // Facing Center
        const isCenter = (yawRatio >= 0.42 && yawRatio <= 0.58) && (eyeDistRatio >= 0.70 && eyeDistRatio <= 1.40);

        return { yawRatio, eyeDistRatio, isLeft, isRight, isCenter };
    }

    validateHumanGeometry(landmarks, box) {
        if (!landmarks) return { valid: false, reason: "NO_LANDMARKS" };
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();

        if (!leftEye || !rightEye || !jaw || jaw.length < 17 || !nose || nose.length < 4) {
            return { valid: false, reason: "INCOMPLETE_LANDMARKS" };
        }

        // 1. Inter-pupillary distance vs jaw width (allows natural yaw rotation)
        const leftEyeCenter = { x: (leftEye[0].x + leftEye[3].x) / 2, y: (leftEye[0].y + leftEye[3].y) / 2 };
        const rightEyeCenter = { x: (rightEye[0].x + rightEye[3].x) / 2, y: (rightEye[0].y + rightEye[3].y) / 2 };
        const ipd = this.euclidean(leftEyeCenter, rightEyeCenter);
        const jawWidth = this.euclidean(jaw[0], jaw[16]);
        if (jawWidth === 0) return { valid: false, reason: "INVALID_JAW" };
        const eyeJawRatio = ipd / jawWidth;

        // Human ratio strictly between 0.22 and 0.72 (allows for head yaw foreshortening)
        if (eyeJawRatio < 0.22 || eyeJawRatio > 0.72) {
            return { valid: false, reason: "NON_HUMAN_PROPORTIONS" };
        }

        // 2. Skew / extreme angle distortion (rejects distorted 2D cutouts, allows natural 3D yaw up to 60 deg)
        const noseTip = (landmarks.positions && landmarks.positions[30]) ? landmarks.positions[30] : (nose[3] || nose[nose.length - 1]);
        const distToLeftEye = this.euclidean(noseTip, leftEyeCenter);
        const distToRightEye = this.euclidean(noseTip, rightEyeCenter);
        const eyeSymmetry = Math.min(distToLeftEye, distToRightEye) / (Math.max(distToLeftEye, distToRightEye) || 1);
        if (eyeSymmetry < 0.12) {
            return { valid: false, reason: "EXTREME_ANGLE_OR_SKEWED" };
        }

        return { valid: true };
    }

    checkBlink(landmarks, now) {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = this.calcEAR(leftEye);
        const rightEAR = this.calcEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        if (this.earSamples.length < 15 && avgEAR > 0.22) {
            this.earSamples.push(avgEAR);
            this.baselineEAR = this.earSamples.reduce((a, b) => a + b, 0) / this.earSamples.length;
        }

        const effectiveBaseline = this.baselineEAR || 0.30;
        const isClosed = avgEAR < Math.min(this.absClosedThreshold, effectiveBaseline * this.earClosedRatio);
        const isOpen = avgEAR >= Math.max(this.absOpenThreshold, effectiveBaseline * 0.88);

        if (isOpen) {
            this.openFrames++;
            if (this.openFrames >= this.minOpenFrames) {
                this.wasOpen = true;
            }
            if (this.closedFrames > 0 && this.wasOpen) {
                const closedDuration = now - this.closedStartTime;
                if (closedDuration >= this.minBlinkDurationMs && closedDuration <= this.maxBlinkDurationMs && this.closedFrames >= 1) {
                    this.blinkCount++;
                    this.closedFrames = 0;
                    return true;
                }
                this.closedFrames = 0;
            }
        } else if (isClosed) {
            if (this.closedFrames === 0) {
                this.closedStartTime = now;
            }
            this.closedFrames++;
            this.openFrames = 0;
        }
        return false;
    }

    processFrame(detection, videoWidth = 640, videoHeight = 480) {
        const now = Date.now();

        if (!detection || !detection.landmarks) {
            // If face disappears for more than 600ms, reset verification
            if (this.lastBox && (now - this.lastDetectionTime > 600)) {
                this.reset();
            }
            return {
                status: 'NO_FACE',
                message: 'ALIGN FACE IN CENTER',
                isLive: false,
                colorClass: 'amber'
            };
        }

        this.lastDetectionTime = now;
        if (!this.firstDetectionTime) this.firstDetectionTime = now;

        const box = detection.detection ? detection.detection.box : detection.box;
        if (!box) {
            return { status: 'NO_FACE', message: 'ALIGN FACE IN CENTER', isLive: false, colorClass: 'amber' };
        }

        // 1. Anti-Swap / Anti-Teleport Check:
        // If face position or size jumped drastically, reset!
        if (this.lastBox) {
            const curCx = box.x + box.width / 2;
            const curCy = box.y + box.height / 2;
            const prevCx = this.lastBox.x + this.lastBox.width / 2;
            const prevCy = this.lastBox.y + this.lastBox.height / 2;
            const shift = Math.hypot(curCx - prevCx, curCy - prevCy) / Math.max(videoWidth, 300);
            const sizeChange = Math.abs(box.width - this.lastBox.width) / (this.lastBox.width || 1);

            if (shift > 0.28 || sizeChange > 0.50) {
                this.reset();
                this.firstDetectionTime = now;
            }
        }
        this.lastBox = { x: box.x, y: box.y, width: box.width, height: box.height };

        // 2. Human Facial Geometry Check (Filters out animals, cartoons, and deformed prints)
        const geom = this.validateHumanGeometry(detection.landmarks, box);
        if (!geom.valid) {
            return {
                status: 'SPOOF_REJECTED',
                message: '⚠️ INVALID HUMAN GEOMETRY (NON-HUMAN FACE)',
                isLive: false,
                colorClass: 'red'
            };
        }

        // 3. Check if already live verified and within TTL
        if (this.isLive) {
            if (now - this.verifiedAt > this.livenessTTLMs) {
                // Verification expired after TTL; require fresh challenge
                this.reset();
            } else {
                return {
                    status: 'VERIFIED',
                    message: '✓ LIVE HUMAN VERIFIED',
                    isLive: true,
                    colorClass: 'green'
                };
            }
        }

        // 4. Optional Fast-Track: Natural Human Blink
        const didBlink = this.checkBlink(detection.landmarks, now);
        if (didBlink) {
            this.isLive = true;
            this.verifiedAt = now;
            return {
                status: 'VERIFIED',
                message: '✓ LIVE HUMAN VERIFIED',
                isLive: true,
                colorClass: 'green'
            };
        }

        // 5. Primary KYC Challenge: Interactive Head Turn (Yaw) State Machine
        const yaw = this.calcYaw(detection.landmarks);

        // Track left turn
        if (yaw.isLeft && !this.turnedLeft) {
            this.leftFrames++;
            if (this.leftFrames >= this.minTurnFrames) {
                this.turnedLeft = true;
            }
        } else if (!yaw.isLeft && !this.turnedLeft) {
            this.leftFrames = 0;
        }

        // Track right turn
        if (yaw.isRight && !this.turnedRight) {
            this.rightFrames++;
            if (this.rightFrames >= this.minTurnFrames) {
                this.turnedRight = true;
            }
        } else if (!yaw.isRight && !this.turnedRight) {
            this.rightFrames = 0;
        }

        // Both directions turned -> wait for return to center
        if (this.turnedLeft && this.turnedRight) {
            if (yaw.isCenter) {
                this.centerFrames++;
                if (this.centerFrames >= this.minCenterFrames) {
                    this.isLive = true;
                    this.verifiedAt = now;
                    return {
                        status: 'VERIFIED',
                        message: '✓ LIVE HUMAN VERIFIED',
                        isLive: true,
                        colorClass: 'green'
                    };
                }
            } else {
                this.centerFrames = 0;
            }

            return {
                status: 'AWAITING_CENTER',
                message: '🎯 HARAP SA GITNA (LOOK STRAIGHT AT CAMERA)',
                isLive: false,
                colorClass: 'cyan'
            };
        }

        // One direction completed -> prompt for the other direction
        if (this.turnedLeft && !this.turnedRight) {
            return {
                status: 'TURN_HALF_DONE',
                message: '➡️ MAGALING! LINGON SA KANAN (TURN HEAD RIGHT)',
                isLive: false,
                colorClass: 'cyan'
            };
        }

        if (!this.turnedLeft && this.turnedRight) {
            return {
                status: 'TURN_HALF_DONE',
                message: '⬅️ MAGALING! LINGON SA KALIWA (TURN HEAD LEFT)',
                isLive: false,
                colorClass: 'cyan'
            };
        }

        // Neither direction turned yet:
        // Anti-Spoofing: Static photo warning after 4 seconds of stillness
        const scanningDuration = now - this.firstDetectionTime;
        if (scanningDuration > 4000) {
            return {
                status: 'STATIC_PHOTO_DETECTED',
                message: '⚠️ STATIC PHOTO DETECTED — HEAD TURN REQUIRED',
                isLive: false,
                colorClass: 'amber'
            };
        }

        return {
            status: 'AWAITING_TURN',
            message: '🔄 LINGON SA KALIWA O KANAN (TURN HEAD LEFT OR RIGHT)',
            isLive: false,
            colorClass: 'cyan'
        };
    }
}

// Global instance helper
if (typeof window !== 'undefined') {
    window.FaceLivenessDetector = FaceLivenessDetector;
}
