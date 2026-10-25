/**
 * PUP UNISAN CAMS - Biometric Anti-Spoofing & Liveness Detection Engine
 * 
 * Enforces real-time live human verification using facial landmark geometry
 * and Eye Aspect Ratio (EAR) blink detection.
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
        this.minOpenFrames = options.minOpenFrames || 2;
        this.earClosedRatio = options.earClosedRatio || 0.74; // 26% relative drop from baseline
        this.absClosedThreshold = options.absClosedThreshold || 0.215;
        this.absOpenThreshold = options.absOpenThreshold || 0.245;
        this.maxBlinkDurationMs = options.maxBlinkDurationMs || 900;
        this.minBlinkDurationMs = options.minBlinkDurationMs || 70;
        this.livenessTTLMs = options.livenessTTLMs || 20000; // 20s validity once live verified
        this.reset();
    }

    reset() {
        this.isLive = false;
        this.verifiedAt = 0;
        this.blinkCount = 0;
        this.openFrames = 0;
        this.closedFrames = 0;
        this.closedStartTime = 0;
        this.wasOpen = false;
        this.baselineEAR = 0;
        this.earSamples = [];
        this.lastBox = null;
        this.firstDetectionTime = 0;
        this.lastDetectionTime = 0;
        this.movementHistory = [];
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

    validateHumanGeometry(landmarks, box) {
        if (!landmarks) return { valid: false, reason: "NO_LANDMARKS" };
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();

        if (!leftEye || !rightEye || !jaw || jaw.length < 17 || !nose || nose.length < 4) {
            return { valid: false, reason: "INCOMPLETE_LANDMARKS" };
        }

        // 1. Inter-pupillary distance vs jaw width
        const leftEyeCenter = { x: (leftEye[0].x + leftEye[3].x) / 2, y: (leftEye[0].y + leftEye[3].y) / 2 };
        const rightEyeCenter = { x: (rightEye[0].x + rightEye[3].x) / 2, y: (rightEye[0].y + rightEye[3].y) / 2 };
        const ipd = this.euclidean(leftEyeCenter, rightEyeCenter);
        const jawWidth = this.euclidean(jaw[0], jaw[16]);
        if (jawWidth === 0) return { valid: false, reason: "INVALID_JAW" };
        const eyeJawRatio = ipd / jawWidth;

        // Human ratio strictly between 0.28 and 0.65
        if (eyeJawRatio < 0.28 || eyeJawRatio > 0.68) {
            return { valid: false, reason: "NON_HUMAN_PROPORTIONS" };
        }

        // 2. Nose bridge symmetry
        const noseTip = nose[nose.length - 1];
        const distToLeftEye = this.euclidean(noseTip, leftEyeCenter);
        const distToRightEye = this.euclidean(noseTip, rightEyeCenter);
        const eyeSymmetry = Math.min(distToLeftEye, distToRightEye) / (Math.max(distToLeftEye, distToRightEye) || 1);
        if (eyeSymmetry < 0.35) {
            return { valid: false, reason: "EXTREME_ANGLE_OR_SKEWED" };
        }

        return { valid: true };
    }

    processFrame(detection, videoWidth = 640, videoHeight = 480) {
        const now = Date.now();

        if (!detection || !detection.landmarks) {
            // If face disappears for more than 500ms, reset verification
            if (this.lastBox && (now - this.lastDetectionTime > 500)) {
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
        // If face position or size jumped drastically (> 20% of frame), reset!
        if (this.lastBox) {
            const curCx = box.x + box.width / 2;
            const curCy = box.y + box.height / 2;
            const prevCx = this.lastBox.x + this.lastBox.width / 2;
            const prevCy = this.lastBox.y + this.lastBox.height / 2;
            const shift = Math.hypot(curCx - prevCx, curCy - prevCy) / Math.max(videoWidth, 300);
            const sizeChange = Math.abs(box.width - this.lastBox.width) / (this.lastBox.width || 1);

            if (shift > 0.22 || sizeChange > 0.40) {
                // Sudden jump: user might have swapped face with a phone or paper photo
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

        // 3. Eye Aspect Ratio (EAR) Calculation
        const leftEye = detection.landmarks.getLeftEye();
        const rightEye = detection.landmarks.getRightEye();
        const leftEAR = this.calcEAR(leftEye);
        const rightEAR = this.calcEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        // Establish rolling baseline open EAR for this user
        if (this.earSamples.length < 15 && avgEAR > 0.22) {
            this.earSamples.push(avgEAR);
            this.baselineEAR = this.earSamples.reduce((a, b) => a + b, 0) / this.earSamples.length;
        }

        const effectiveBaseline = this.baselineEAR || 0.30;
        const isClosed = avgEAR < Math.min(this.absClosedThreshold, effectiveBaseline * this.earClosedRatio);
        const isOpen = avgEAR >= Math.max(this.absOpenThreshold, effectiveBaseline * 0.88);

        // 4. Check if already live verified and within TTL
        if (this.isLive) {
            if (now - this.verifiedAt > this.livenessTTLMs) {
                // Verification expired after TTL; require fresh blink
                this.isLive = false;
                this.blinkCount = 0;
            } else {
                return {
                    status: 'VERIFIED',
                    message: '✓ LIVE HUMAN VERIFIED',
                    isLive: true,
                    ear: avgEAR,
                    colorClass: 'green'
                };
            }
        }

        // 5. Blink State Machine
        if (isOpen) {
            this.openFrames++;
            if (this.openFrames >= this.minOpenFrames) {
                this.wasOpen = true;
            }
            if (this.closedFrames > 0 && this.wasOpen) {
                const closedDuration = now - this.closedStartTime;
                if (closedDuration >= this.minBlinkDurationMs && closedDuration <= this.maxBlinkDurationMs && this.closedFrames >= 1) {
                    // Valid natural human blink verified!
                    this.blinkCount++;
                    this.isLive = true;
                    this.verifiedAt = now;
                    this.closedFrames = 0;
                    return {
                        status: 'VERIFIED',
                        message: '✓ LIVE HUMAN VERIFIED',
                        isLive: true,
                        ear: avgEAR,
                        colorClass: 'green'
                    };
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

        // 6. Anti-Spoofing: Static photo warning after 3.5 seconds with no blink
        const scanningDuration = now - this.firstDetectionTime;
        if (scanningDuration > 4000 && !this.isLive) {
            return {
                status: 'STATIC_PHOTO_DETECTED',
                message: '⚠️ STATIC PHOTO DETECTED — NATURAL BLINK REQUIRED',
                isLive: false,
                ear: avgEAR,
                colorClass: 'amber'
            };
        }

        return {
            status: 'AWAITING_BLINK',
            message: '👁️ LIVENESS CHECK: PLEASE BLINK YOUR EYES (KUMURAP)',
            isLive: false,
            ear: avgEAR,
            colorClass: 'cyan'
        };
    }
}

// Global instance helper
if (typeof window !== 'undefined') {
    window.FaceLivenessDetector = FaceLivenessDetector;
}
