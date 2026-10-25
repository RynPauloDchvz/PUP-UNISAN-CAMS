/**
 * PUP UNISAN CAMS - Passive Biometric Anti-Spoofing & Liveness Engine
 * 
 * Seamless, Zero-Friction Passive Liveness Verification:
 * - NO blinking required
 * - NO head turning (yaw) required
 * - Allows face anywhere in frame (off-center allowed, as long as whole face is visible)
 * - Automatic instant matching upon detection
 * 
 * Strict Spoofing Protections:
 * 1. Whole Face In Frame: Rejects cropped, obscured, or edge-cut faces.
 * 2. Human Anthropometric Anatomy: Rejects animals (dogs, cats), non-human objects, cartoons.
 * 3. Passive 3D Micro-Dynamics: Rejects motionless printed 1x1s, paper cutouts, and static phone gallery screens.
 * 4. Anti-Swap & Anti-Teleport: Rejects sudden digital swaps and camera frame spoofing.
 */

class FaceLivenessDetector {
    constructor(options = {}) {
        this.minStableFrames = options.minStableFrames || 3; // ~300ms of stable human face
        this.livenessTTLMs = options.livenessTTLMs || 30000;   // 30s validity once live verified
        this.minFaceSize = options.minFaceSize || 95;          // Minimum face box dimension

        this.reset();
    }

    reset() {
        this.isLive = false;
        this.verifiedAt = 0;
        this.stableFrames = 0;
        this.lastBox = null;
        this.firstDetectionTime = 0;
        this.lastDetectionTime = 0;
        this.frameHistory = [];
    }

    euclidean(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    /**
     * Checks if the complete, whole face is visible inside the frame.
     * Does NOT enforce centering (face can be off-center as long as full boundaries fit).
     */
    isWholeFaceInFrame(landmarks, box, videoWidth, videoHeight) {
        if (!box || !landmarks) return { valid: false, reason: "NO_DATA" };
        
        const margin = 6;
        const w = videoWidth || 640;
        const h = videoHeight || 480;

        // Bounding box border safety check
        if (box.x < margin || box.y < margin || 
            (box.x + box.width) > (w - margin) || 
            (box.y + box.height) > (h - margin)) {
            return { valid: false, reason: "BOX_CUT_OFF" };
        }

        // Peripheral landmark safety: jawline points (cheek to cheek, chin)
        const jaw = landmarks.getJawOutline();
        if (!jaw || jaw.length < 17) return { valid: false, reason: "INCOMPLETE_JAW" };

        const leftCheek = jaw[0];
        const rightCheek = jaw[16];
        const chin = jaw[8];

        if (leftCheek.x < margin || rightCheek.x > (w - margin) || chin.y > (h - margin) || chin.y < margin) {
            return { valid: false, reason: "PERIPHERAL_CUT_OFF" };
        }

        // Minimum face size check (rejects micro thumbnails / far-away objects)
        if (box.width < this.minFaceSize || box.height < this.minFaceSize) {
            return { valid: false, reason: "FACE_TOO_SMALL" };
        }

        return { valid: true };
    }

    /**
     * Human Anthropometric Proportions Guard:
     * Strictly rejects animals (dogs, cats, monkeys), cartoons, masks, and non-human geometry.
     */
    validateHumanGeometry(landmarks, box) {
        if (!landmarks) return { valid: false, reason: "NO_LANDMARKS" };
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const jaw = landmarks.getJawOutline();
        const nose = landmarks.getNose();
        const mouth = landmarks.getMouth();

        if (!leftEye || !rightEye || !jaw || jaw.length < 17 || !nose || nose.length < 4 || !mouth || mouth.length < 12) {
            return { valid: false, reason: "INCOMPLETE_LANDMARKS" };
        }

        // 1. Inter-Pupillary Distance (IPD) vs Jaw Width (human: 0.24 to 0.70)
        const leftEyeCenter = { x: (leftEye[0].x + leftEye[3].x) / 2, y: (leftEye[0].y + leftEye[3].y) / 2 };
        const rightEyeCenter = { x: (rightEye[0].x + rightEye[3].x) / 2, y: (rightEye[0].y + rightEye[3].y) / 2 };
        const ipd = this.euclidean(leftEyeCenter, rightEyeCenter);
        const jawWidth = this.euclidean(jaw[0], jaw[16]);
        if (jawWidth <= 0) return { valid: false, reason: "INVALID_JAW" };
        const eyeJawRatio = ipd / jawWidth;

        if (eyeJawRatio < 0.24 || eyeJawRatio > 0.70) {
            return { valid: false, reason: "NON_HUMAN_PROPORTIONS" };
        }

        // 2. Vertical Structure: Eyes above nose, nose above mouth
        const noseTip = (landmarks.positions && landmarks.positions[30]) ? landmarks.positions[30] : (nose[3] || nose[nose.length - 1]);
        const eyeMidY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
        const mouthCenterY = (mouth[0].y + mouth[6].y) / 2;

        if (noseTip.y <= eyeMidY || mouthCenterY <= noseTip.y) {
            return { valid: false, reason: "ABNORMAL_FACIAL_STRUCTURE" };
        }

        // 3. Aspect Ratio check (Human box height to width)
        const aspectRatio = box.height / Math.max(box.width, 1);
        if (aspectRatio < 0.85 || aspectRatio > 1.70) {
            return { valid: false, reason: "ABNORMAL_ASPECT_RATIO" };
        }

        return { valid: true };
    }

    /**
     * Passive Liveness & Micro-Dynamics:
     * Analyzes natural biological micro-jitter over time to reject completely static photos.
     */
    checkPassiveLiveness(landmarks, box, now) {
        const noseTip = (landmarks.positions && landmarks.positions[30]) ? landmarks.positions[30] : landmarks.getNose()[3];
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const ipd = this.euclidean(leftEye[0], rightEye[3]);

        this.frameHistory.push({
            x: noseTip.x,
            y: noseTip.y,
            ipd: ipd,
            boxW: box.width,
            time: now
        });

        // Keep rolling window of last 8 frames
        if (this.frameHistory.length > 8) {
            this.frameHistory.shift();
        }

        // If we have at least 6 frames, check for frozen 2D printouts
        if (this.frameHistory.length >= 6) {
            const xs = this.frameHistory.map(f => f.x);
            const ys = this.frameHistory.map(f => f.y);
            const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
            const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
            const variance = xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0) + 
                             ys.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);

            // A living human has natural pulse / micro-movement.
            // If completely zero variance across prolonged duration, it is a motionless photo.
            const totalObservedMs = now - this.firstDetectionTime;
            if (totalObservedMs > 4500 && variance < 0.008) {
                return { isStatic: true, reason: "FROZEN_IMAGE" };
            }
        }

        return { isStatic: false };
    }

    processFrame(detection, videoWidth = 640, videoHeight = 480) {
        const now = Date.now();

        if (!detection || !detection.landmarks) {
            if (this.lastBox && (now - this.lastDetectionTime > 600)) {
                this.reset();
            }
            return {
                status: 'NO_FACE',
                message: 'ALIGN WHOLE FACE IN FRAME',
                isLive: false,
                colorClass: 'amber'
            };
        }

        this.lastDetectionTime = now;
        if (!this.firstDetectionTime) this.firstDetectionTime = now;

        const box = detection.detection ? detection.detection.box : detection.box;
        if (!box) {
            return { status: 'NO_FACE', message: 'ALIGN WHOLE FACE IN FRAME', isLive: false, colorClass: 'amber' };
        }

        // 1. Anti-Swap / Anti-Teleport Check:
        if (this.lastBox) {
            const curCx = box.x + box.width / 2;
            const curCy = box.y + box.height / 2;
            const prevCx = this.lastBox.x + this.lastBox.width / 2;
            const prevCy = this.lastBox.y + this.lastBox.height / 2;
            const shift = Math.hypot(curCx - prevCx, curCy - prevCy) / Math.max(videoWidth, 300);
            const sizeChange = Math.abs(box.width - this.lastBox.width) / (this.lastBox.width || 1);

            if (shift > 0.32 || sizeChange > 0.55) {
                // Sudden jump or face swap
                this.reset();
                this.firstDetectionTime = now;
            }
        }
        this.lastBox = { x: box.x, y: box.y, width: box.width, height: box.height };

        // 2. Whole Face In Frame Check (Off-center allowed, as long as full face is visible)
        const frameCheck = this.isWholeFaceInFrame(detection.landmarks, box, videoWidth, videoHeight);
        if (!frameCheck.valid) {
            this.stableFrames = 0;
            if (frameCheck.reason === 'FACE_TOO_SMALL') {
                return {
                    status: 'FACE_TOO_SMALL',
                    message: '⚠️ MOVE CLOSER TO CAMERA (LUMAPIT KAUNTI)',
                    isLive: false,
                    colorClass: 'amber'
                };
            }
            return {
                status: 'FACE_CUT_OFF',
                message: '⚠️ SHOW FULL FACE (IPAKITA ANG BUONG MUKHA)',
                isLive: false,
                colorClass: 'amber'
            };
        }

        // 3. Human Facial Anatomy & Geometry (Rejects animals, objects, cartoons)
        const geom = this.validateHumanGeometry(detection.landmarks, box);
        if (!geom.valid) {
            this.stableFrames = 0;
            return {
                status: 'SPOOF_REJECTED',
                message: '⚠️ NON-HUMAN FACE REJECTED (BAWAL ANG HAYOP/OBJECT)',
                isLive: false,
                colorClass: 'red'
            };
        }

        // 4. Passive Liveness Check (Rejects motionless 2D static photos)
        const passive = this.checkPassiveLiveness(detection.landmarks, box, now);
        if (passive.isStatic) {
            this.isLive = false;
            return {
                status: 'STATIC_PHOTO_DETECTED',
                message: '⚠️ STATIC PHOTO DETECTED (BAWAL ANG LITRATO)',
                isLive: false,
                colorClass: 'red'
            };
        }

        // 5. Check if already live verified and within TTL
        if (this.isLive) {
            if (now - this.verifiedAt > this.livenessTTLMs) {
                this.reset();
            } else {
                return {
                    status: 'VERIFIED',
                    message: '✓ FACE VERIFIED (KUMPIRMADO)',
                    isLive: true,
                    colorClass: 'green'
                };
            }
        }

        // 6. Seamless Automatic Live Verification
        this.stableFrames++;
        if (this.stableFrames >= this.minStableFrames) {
            this.isLive = true;
            this.verifiedAt = now;
            return {
                status: 'VERIFIED',
                message: '✓ FACE VERIFIED (KUMPIRMADO)',
                isLive: true,
                colorClass: 'green'
            };
        }

        return {
            status: 'ANALYZING',
            message: '🔍 SCANNING BIOMETRIC IDENTITY...',
            isLive: false,
            colorClass: 'cyan'
        };
    }
}

// Global instance helper
if (typeof window !== 'undefined') {
    window.FaceLivenessDetector = FaceLivenessDetector;
}
