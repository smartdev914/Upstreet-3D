import * as THREE from 'three';

function mod(a, n) {
    return ((a % n) + n) % n;
}

const _makeSnapshots = (constructor, numFrames) => {
    const result = Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
        result[i] = {
            startValue: constructor(),
            // endValue: constructor(),
            // startTime: 0,
            endTime: 0,
        };
    }
    return result;
};
// snapshot interpolant maintains a ring buffer of previous states and seeks between them to interpolate
export class SnapshotInterpolant {
    constructor(fn, timeDelay, numFrames, constructor, readFn, seekFn) {
        this.fn = fn;
        this.timeDelay = timeDelay;
        this.numFrames = numFrames;
        this.readFn = readFn;
        this.seekFn = seekFn;

        this.readTime = 0;
        // this.writeTime = 0;

        this.snapshots = _makeSnapshots(constructor, numFrames);
        this.snapshotWriteIndex = 0;

        this.value = constructor();
    }
    update(timeDiff) {
        this.readTime += timeDiff;

        let minEndTime = Infinity;
        let maxEndTime = -Infinity;
        for (let i = 0; i < this.numFrames; i++) {
            const snapshot = this.snapshots[i];
            if (snapshot.endTime < minEndTime) {
                minEndTime = snapshot.endTime;
            }
            if (snapshot.endTime > maxEndTime) {
                maxEndTime = snapshot.endTime;
            }
        }

        if (maxEndTime > 0) { // if we had at least one snapshot
            if (
                (this.readTime - this.timeDelay) < minEndTime ||
                (this.readTime - this.timeDelay) > maxEndTime
            ) {
                this.readTime = maxEndTime;
            }

            const effectiveReadTime = this.readTime - this.timeDelay;

            this.seekTo(effectiveReadTime);
        }
    }
    seekTo(t) {
        for (let i = -(this.numFrames - 1); i < 0; i++) {
            const index = this.snapshotWriteIndex + i;
            const snapshot = this.snapshots[mod(index, this.numFrames)];
            if (t <= snapshot.endTime) {
                const prevSnapshot = this.snapshots[mod(index - 1, this.numFrames)];
                const startTime = prevSnapshot.endTime;
                if (t >= startTime) {
                    const duration = snapshot.endTime - startTime;
                    const f = (duration > 0 && duration < Infinity) ? ((t - startTime) / duration) : 0;
                    const { startValue } = snapshot;
                    const nextSnapshot = this.snapshots[mod(index + 1, this.numFrames)];
                    const { startValue: endValue } = nextSnapshot;
                    this.value = this.seekFn(this.value, startValue, endValue, f);
                    return;
                }
            }
        }
        console.warn('could not seek to time', t, JSON.parse(JSON.stringify(this.snapshots)));
    }
    snapshot(timeDiff) {
        const value = this.fn();
        // console.log('got value', value.join(','), timeDiff);
        const writeSnapshot = this.snapshots[this.snapshotWriteIndex];

        const lastWriteSnapshot = this.snapshots[mod(this.snapshotWriteIndex - 1, this.numFrames)];
        const startTime = lastWriteSnapshot.endTime;

        writeSnapshot.startValue = this.readFn(writeSnapshot.startValue, value);
        writeSnapshot.endTime = startTime + timeDiff;

        this.snapshotWriteIndex = mod(this.snapshotWriteIndex + 1, this.numFrames);
    }
    get() {
        return this.value;
    }
}

export class PositionInterpolant extends SnapshotInterpolant {
    constructor(fn, timeDelay, numFrames) {
        super(fn, timeDelay, numFrames, () => new THREE.Vector3(), (target, value) => {
            target.fromArray(value);
            if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
                throw new Error('target is NaN');
            }
            return target;
        }, (target, src, dst, f) => {
            target.copy(src).lerp(dst, f);
            // console.log('position lerp', target.toArray(), f);
            if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
                throw new Error('target is NaN');
            }
            return target;
        });
    }
}