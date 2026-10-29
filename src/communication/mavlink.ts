/*
  Minimal MAVLink client for the ArduPilot motor test.

  ArduPilot does not spin motors on MSP_SET_MOTOR, so on an ArduPilot flight
  controller the test page talks MAVLink instead (MAV_CMD_DO_MOTOR_TEST).
  The link owns the serial port: MAVLink v2 out, v1/v2 in, 1 Hz GCS
  heartbeat, live telemetry (battery, outputs, ESC, GPS).

  Framing: CRC-16/MCRF4XX over len..msgid + payload + crc_extra (STX excluded).
  Payloads are trimmed of trailing zeros on the wire (v2), the decoders read
  missing bytes as 0.
 */

const SRC_SYS = 255; // GCS sysid
const SRC_COMP = 190; // MAV_COMP_ID_MISSIONPLANNER

const CRC_EXTRA: Record<number, number> = {
    0: 50, 1: 124, 24: 24, 30: 39, 36: 222, 74: 20, 76: 152, 77: 143, 147: 154, 11030: 144
};

enum MSG {
    HEARTBEAT = 0,
    SYS_STATUS = 1,
    GPS_RAW_INT = 24,
    ATTITUDE = 30,
    SERVO_OUTPUT_RAW = 36,
    VFR_HUD = 74,
    COMMAND_LONG = 76,
    COMMAND_ACK = 77,
    BATTERY_STATUS = 147,
    ESC_TELEMETRY_1_TO_4 = 11030
}

const CMD_DO_MOTOR_TEST = 209;
// param6 of DO_MOTOR_TEST: 2 = motor numbers are the outputs as labeled on the board (S1, S2, ...).
// With 0 ArduPilot counts by the frame's test sequence (A, B, C, D), which is not the output order.
const MOTOR_TEST_ORDER_BOARD = 2;
const CMD_SET_MESSAGE_INTERVAL = 511;

const TLM_MSGIDS = [1, 147, 74, 30, 36, 11030, 24];
const TLM_INTERVAL_US = 200000; // 5 Hz

const DO_MOTOR_TIMEOUT_S = 3; // param4: ArduPilot auto-stop timeout
const REPEAT_MS = 400; // dead-man re-send period while a motor is held
const MIN_SEND_GAP_MS = 150; // slider drag produces input events at 60+ Hz
const UPDATE_THROTTLE_MS = 100;

export const PLANE_MODE: Record<number, string> = {
    0: 'MANUAL', 1: 'CIRCLE', 2: 'STABILIZE', 3: 'TRAINING', 4: 'ACRO', 5: 'FBWA', 6: 'FBWB',
    7: 'CRUISE', 8: 'AUTOTUNE', 10: 'AUTO', 11: 'RTL', 12: 'LOITER', 13: 'TAKEOFF', 15: 'GUIDED',
    17: 'INITIALISING', 18: 'QSTABILIZE', 19: 'QHOVER', 20: 'QLOITER', 21: 'QLAND', 22: 'QRTL',
    23: 'QAUTOTUNE', 24: 'QACRO', 25: 'THERMAL'
};

export const GPS_FIX: Record<number, string> = {
    0: 'нет GPS', 1: 'нет фикса', 2: '2D', 3: '3D', 4: 'DGPS', 5: 'RTK float', 6: 'RTK fixed', 7: 'static', 8: 'PPP'
};

const ACK_RESULT: Record<number, string> = {
    0: 'ACCEPTED', 1: 'TEMPORARILY_REJECTED', 2: 'DENIED', 3: 'UNSUPPORTED', 4: 'FAILED', 5: 'IN_PROGRESS', 6: 'CANCELLED'
};

/* ----------------------------- CRC / encoders ----------------------------- */

function crcAccumulate (byte: number, crc: number) {
    let tmp = (byte ^ (crc & 0xFF)) & 0xFF;
    tmp = (tmp ^ (tmp << 4)) & 0xFF;
    return ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF;
}

function trimmedLength (payload: Uint8Array) {
    let len = payload.length;
    while (len > 0 && payload[len - 1] === 0) {
        len--;
    }
    return len;
}

export function encodeV2 (msgid: number, payload: Uint8Array, seq: number, sysid = SRC_SYS, compid = SRC_COMP) {
    const len = trimmedLength(payload);
    const frame = new Uint8Array(10 + len + 2);
    frame[0] = 0xFD;
    frame[1] = len;
    frame[4] = seq & 0xFF;
    frame[5] = sysid & 0xFF;
    frame[6] = compid & 0xFF;
    frame[7] = msgid & 0xFF;
    frame[8] = (msgid >> 8) & 0xFF;
    frame[9] = (msgid >> 16) & 0xFF;
    frame.set(payload.subarray(0, len), 10);

    let crc = 0xFFFF;
    for (let i = 1; i < 10; i++) {
        crc = crcAccumulate(frame[i], crc);
    }
    for (let i = 0; i < len; i++) {
        crc = crcAccumulate(frame[10 + i], crc);
    }
    crc = crcAccumulate(CRC_EXTRA[msgid], crc);
    frame[10 + len] = crc & 0xFF;
    frame[10 + len + 1] = (crc >> 8) & 0xFF;
    return frame;
}

// HEARTBEAT: u32 custom_mode, u8 type, autopilot, base_mode, system_status, mavlink_version
function heartbeatPayload () {
    const p = new Uint8Array(9);
    p[4] = 6; // MAV_TYPE_GCS
    p[5] = 8; // MAV_AUTOPILOT_INVALID
    p[7] = 4; // MAV_STATE_ACTIVE
    p[8] = 3;
    return p;
}

interface CommandLong {
    p1: number; p2: number; p3: number; p4: number; p5: number; p6: number; p7: number;
    command: number;
    targetSystem: number;
}

// COMMAND_LONG: f32 p1..p7, u16 command, u8 target_system, target_component, confirmation
function commandLongPayload (c: CommandLong) {
    const p = new Uint8Array(33);
    const dv = new DataView(p.buffer);
    [c.p1, c.p2, c.p3, c.p4, c.p5, c.p6, c.p7].forEach((v, i) => dv.setFloat32(i * 4, v, true));
    dv.setUint16(28, c.command, true);
    p[30] = c.targetSystem & 0xFF;
    p[31] = 1;
    return p;
}

/* ------------------------------- decoders -------------------------------- */

const rdU8 = (p: Uint8Array, off: number) => off < p.length ? p[off] : 0;
const rdU16 = (p: Uint8Array, off: number) => off + 1 < p.length ? (p[off] | (p[off + 1] << 8)) : rdU8(p, off);
const rdI16 = (p: Uint8Array, off: number) => {
    const u = rdU16(p, off);
    return u >= 32768 ? u - 65536 : u;
};
const rdI8 = (p: Uint8Array, off: number) => {
    const u = rdU8(p, off);
    return u >= 128 ? u - 256 : u;
};
const rdI32 = (p: Uint8Array, off: number) => off + 3 < p.length
    ? (p[off] | (p[off + 1] << 8) | (p[off + 2] << 16) | (p[off + 3] << 24)) | 0
    : 0;
const rdU32 = (p: Uint8Array, off: number) => rdI32(p, off) >>> 0;
const rdF32 = (p: Uint8Array, off: number): number | null => off + 3 < p.length
    ? new DataView(p.buffer, p.byteOffset + off, 4).getFloat32(0, true)
    : null;

export interface MavTelemetry {
    sysStatus: { voltage: number; current: number; remaining: number } | null;
    battery: { voltages: number[]; temperature: number; current: number; remaining: number } | null;
    vfr: { airspeed: number | null; groundspeed: number | null; alt: number | null; climb: number | null; heading: number; throttle: number } | null;
    attitude: { roll: number | null; pitch: number | null; yaw: number | null } | null;
    servo: number[] | null;
    // ESC_TELEMETRY_1_TO_4 carries four ESCs; ArduPilot sends further groups as separate messages (ignored here)
    esc: { voltage: number[]; current: number[]; rpm: number[]; count: number[]; temperature: number[] } | null;
    gps: { fix: number; sats: number; lat: number; lon: number; alt: number } | null;
}

function decodeSysStatus (p: Uint8Array) {
    return { voltage: rdU16(p, 14), current: rdI16(p, 16), remaining: rdI8(p, 30) };
}

function decodeBattery (p: Uint8Array) {
    const voltages: number[] = [];
    for (let i = 0; i < 10; i++) {
        voltages.push(rdU16(p, 10 + i * 2));
    }
    return { voltages, temperature: rdI16(p, 8), current: rdI16(p, 30), remaining: rdI8(p, 35) };
}

function decodeVfr (p: Uint8Array) {
    return {
        airspeed: rdF32(p, 0), groundspeed: rdF32(p, 4), alt: rdF32(p, 8), climb: rdF32(p, 12),
        heading: rdI16(p, 16), throttle: rdU16(p, 18)
    };
}

function decodeAttitude (p: Uint8Array) {
    return { roll: rdF32(p, 4), pitch: rdF32(p, 8), yaw: rdF32(p, 12) };
}

function decodeServo (p: Uint8Array) {
    const s: number[] = [];
    for (let i = 0; i < 8; i++) {
        s.push(rdU16(p, 4 + i * 2));
    }
    return s;
}

// ardupilotmega.xml layout, wire order: voltage[4] @0, current[4] @8, totalcurrent[4] @16,
// rpm[4] @24, count[4] @32 (all u16), temperature[4] u8 @40
function decodeEsc (p: Uint8Array) {
    const e = { voltage: [] as number[], current: [] as number[], rpm: [] as number[], count: [] as number[], temperature: [] as number[] };
    for (let i = 0; i < 4; i++) {
        e.voltage.push(rdU16(p, i * 2));
        e.current.push(rdU16(p, 8 + i * 2));
        e.rpm.push(rdU16(p, 24 + i * 2));
        e.count.push(rdU16(p, 32 + i * 2));
        e.temperature.push(rdU8(p, 40 + i));
    }
    return e;
}

function decodeGps (p: Uint8Array) {
    return { fix: rdU8(p, 28), sats: rdU8(p, 29), lat: rdI32(p, 8), lon: rdI32(p, 12), alt: rdI32(p, 16) };
}

/* -------------------------------- parser --------------------------------- */

interface Frame {
    msgid: number;
    payload: Uint8Array;
    sysid: number;
    compid: number;
}

class Parser {
    private buf = new Uint8Array(0);

    push (chunk: Uint8Array): Frame[] {
        const merged = new Uint8Array(this.buf.length + chunk.length);
        merged.set(this.buf, 0);
        merged.set(chunk, this.buf.length);
        this.buf = merged;
        return this.drain();
    }

    // null: incomplete; 'bad': not a valid frame at this offset
    private frameAt (off: number): { total: number; frame: Frame } | null | 'bad' {
        const buf = this.buf;
        const end = buf.length;
        const stx = buf[off];
        if (stx !== 0xFD && stx !== 0xFE) {
            return 'bad';
        }
        const v2 = stx === 0xFD;
        const hdr = v2 ? 10 : 6;
        if (end - off < hdr) {
            return null;
        }
        const len = buf[off + 1];
        const total = hdr + len + 2;
        if (end - off < total) {
            return null;
        }
        const sysid = buf[off + (v2 ? 5 : 3)];
        const compid = buf[off + (v2 ? 6 : 4)];
        const msgid = v2 ? (buf[off + 7] | (buf[off + 8] << 8) | (buf[off + 9] << 16)) : buf[off + 5];
        const payload = buf.slice(off + hdr, off + hdr + len);
        const crcRx = buf[off + hdr + len] | (buf[off + hdr + len + 1] << 8);

        // frames with unknown msgid cannot be CRC-checked: drop them
        const extra = CRC_EXTRA[msgid];
        if (extra === undefined) {
            return 'bad';
        }
        let crc = 0xFFFF;
        for (let k = 1; k < hdr; k++) {
            crc = crcAccumulate(buf[off + k], crc);
        }
        for (let k = 0; k < len; k++) {
            crc = crcAccumulate(payload[k], crc);
        }
        crc = crcAccumulate(extra, crc);
        if (crc !== crcRx) {
            return 'bad';
        }
        return { total, frame: { msgid, payload, sysid, compid } };
    }

    private findValid (from: number) {
        for (let j = from; j < this.buf.length; j++) {
            if (this.buf[j] === 0xFD || this.buf[j] === 0xFE) {
                const r = this.frameAt(j);
                if (r && r !== 'bad') {
                    return j;
                }
            }
        }
        return -1;
    }

    private drain (): Frame[] {
        const out: Frame[] = [];
        let i = 0;
        while (i < this.buf.length) {
            const b = this.buf[i];
            if (b !== 0xFD && b !== 0xFE) {
                i++;
                continue;
            }
            const r = this.frameAt(i);
            if (r === null) {
                // a partial frame, or a stray 0xFD/0xFE in noise (MSP leftovers): when a
                // complete valid frame starts later, these bytes were noise
                const next = this.findValid(i + 1);
                if (next < 0) {
                    break;
                }
                i = next;
                continue;
            }
            if (r === 'bad') {
                i++;
                continue;
            }
            out.push(r.frame);
            i += r.total;
        }
        this.buf = this.buf.subarray(i);
        if (this.buf.length > 65536) {
            this.buf = new Uint8Array(0);
        }
        return out;
    }
}

/* --------------------------------- link ---------------------------------- */

export interface MavVehicle {
    sysid: number;
    type: number;
    autopilot: number;
    armed: boolean;
    mode: string;
}

export interface MavSnapshot {
    connected: boolean;
    vehicle: MavVehicle | null;
    telemetry: MavTelemetry;
    activeMotor: number;
    activePercent: number;
}

type LogLevel = 'info' | 'warn' | 'error';
type LogFn = (message: string, level: LogLevel) => void;

const emptyTelemetry = (): MavTelemetry => ({
    sysStatus: null, battery: null, vfr: null, attitude: null, servo: null, esc: null, gps: null
});

export class MavlinkLink {
    private port: SerialPort | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private writeChain: Promise<unknown> = Promise.resolve();
    private parser = new Parser();
    private seq = 0;
    private hbTimer: ReturnType<typeof setInterval> | null = null;
    private repeatTimer: ReturnType<typeof setInterval> | null = null;
    private connected = false;
    private vehicle: MavVehicle | null = null;
    private lastVehicleMs = 0;
    private telemetry: MavTelemetry = emptyTelemetry();
    private active = { motor: 0, percent: 0 };
    private lastCmdMs = 0;
    private updateTimer: ReturnType<typeof setTimeout> | null = null;
    private motorCount = 4;

    constructor (
        private onUpdate: (snapshot: MavSnapshot) => void,
        private log: LogFn,
        private onClosed: () => void
    ) {}

    isConnected () {
        return this.connected;
    }

    /** MAV_AUTOPILOT_ARDUPILOTMEGA: the only autopilot whose motor test we speak. */
    static ARDUPILOT = 3;

    /** Resolves true once an ArduPilot heartbeat is seen, false after `timeoutMs`. */
    waitForArduPilot (timeoutMs: number): Promise<boolean> {
        return new Promise((resolve) => {
            const started = Date.now();
            const timer = setInterval(() => {
                if (this.vehicle?.autopilot === MavlinkLink.ARDUPILOT) {
                    clearInterval(timer);
                    resolve(true);
                } else if (!this.connected || Date.now() - started >= timeoutMs) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, 50);
        });
    }

    setMotorCount (count: number) {
        this.motorCount = count;
    }

    /** Takes over an opened serial port (readable/writable must not be locked). */
    async attach (port: SerialPort) {
        if (!port.readable || !port.writable) {
            throw new Error('Порт не открыт');
        }
        this.port = port;
        this.writer = port.writable.getWriter();
        this.reader = port.readable.getReader();
        this.connected = true;
        this.seq = 0;
        this.writeChain = Promise.resolve();
        this.parser = new Parser();
        this.vehicle = null;
        this.lastVehicleMs = 0;
        this.telemetry = emptyTelemetry();

        this.sendHeartbeat();
        this.hbTimer = setInterval(() => this.sendHeartbeat(), 1000);
        this.readLoop(this.reader);
        this.notify();
    }

    private nextSeq () {
        const s = this.seq & 0xFF;
        this.seq = (this.seq + 1) & 0xFF;
        return s;
    }

    private write (frame: Uint8Array) {
        const writer = this.writer;
        if (!writer) {
            return Promise.resolve(false);
        }
        this.writeChain = this.writeChain
            .then(() => writer.write(frame))
            .then(() => true)
            .catch((e: any) => {
                this.log(`Ошибка записи: ${e?.message ?? e}`, 'error');
                return false;
            });
        return this.writeChain;
    }

    private sendHeartbeat () {
        this.write(encodeV2(MSG.HEARTBEAT, heartbeatPayload(), this.nextSeq()));
    }

    private sendCommand (c: Omit<CommandLong, 'targetSystem'>) {
        if (!this.connected || !this.writer) {
            return false;
        }
        const cmd = { ...c, targetSystem: this.vehicle?.sysid || 1 };
        this.write(encodeV2(MSG.COMMAND_LONG, commandLongPayload(cmd), this.nextSeq()));
        this.lastCmdMs = Date.now();
        return true;
    }

    private async readLoop (reader: ReadableStreamDefaultReader<Uint8Array>) {
        try {
            while (true) {
                const res = await reader.read();
                if (res.done) {
                    break;
                }
                if (res.value?.length) {
                    for (const frame of this.parser.push(res.value)) {
                        this.handleFrame(frame);
                    }
                }
            }
        } catch (e: any) {
            if (this.connected) {
                this.log(`Ошибка чтения: ${e?.message ?? e}`, 'error');
            }
        } finally {
            try {
                reader.releaseLock();
            } catch { /* ignore */ }
            if (this.reader === reader) {
                this.reader = null;
            }
            if (this.connected) {
                await this.close();
                this.onClosed();
            }
        }
    }

    private handleFrame (m: Frame) {
        const t = this.telemetry;
        switch (m.msgid) {
        case MSG.HEARTBEAT:
            this.handleHeartbeat(m);
            return;
        case MSG.COMMAND_ACK:
            this.handleAck(m.payload);
            return;
        case MSG.SYS_STATUS: t.sysStatus = decodeSysStatus(m.payload); break;
        case MSG.BATTERY_STATUS: t.battery = decodeBattery(m.payload); break;
        case MSG.VFR_HUD: t.vfr = decodeVfr(m.payload); break;
        case MSG.ATTITUDE: t.attitude = decodeAttitude(m.payload); break;
        case MSG.SERVO_OUTPUT_RAW: t.servo = decodeServo(m.payload); break;
        case MSG.ESC_TELEMETRY_1_TO_4: t.esc = decodeEsc(m.payload); break;
        case MSG.GPS_RAW_INT: t.gps = decodeGps(m.payload); break;
        default: return;
        }
        this.notify();
    }

    private handleHeartbeat (m: Frame) {
        if (m.sysid === SRC_SYS && m.compid === SRC_COMP) {
            return; // our own heartbeat
        }
        const p = m.payload;
        const type = rdU8(p, 4);
        const autopilot = rdU8(p, 5);
        if (type === 6 || autopilot === 8) {
            return; // GCS / no autopilot
        }
        if (this.vehicle && this.vehicle.sysid !== m.sysid) {
            return; // locked to the first vehicle
        }
        const customMode = rdU32(p, 0);
        const armed = (rdU8(p, 6) & 128) !== 0;
        const now = Date.now();
        const first = !this.vehicle;
        const gap = this.lastVehicleMs ? now - this.lastVehicleMs : Infinity;
        const wasArmed = this.vehicle?.armed ?? false;

        this.vehicle = {
            sysid: m.sysid,
            type,
            autopilot,
            armed,
            mode: customMode in PLANE_MODE ? PLANE_MODE[customMode] : `mode=${customMode}`
        };
        this.lastVehicleMs = now;

        if (armed && !wasArmed && !first) {
            this.log('Полётник заармирован — тест моторов остановлен', 'warn');
        }
        if (armed && this.active.motor) {
            this.stopAll();
        }
        // ask for telemetry once on the first heartbeat and again after a >4 s gap
        if (first || gap > 4000) {
            this.requestTelemetry();
        }
        this.notify();
    }

    private handleAck (p: Uint8Array) {
        const command = rdU16(p, 0);
        const result = rdU8(p, 2);
        if (command === CMD_DO_MOTOR_TEST && result !== 0) {
            const name = ACK_RESULT[result] ?? `RESULT_${result}`;
            this.log(`Полётник отклонил тест мотора: ${name}`, 'error');
            this.stopAll();
        }
    }

    private requestTelemetry () {
        for (const msgid of TLM_MSGIDS) {
            this.sendCommand({
                p1: msgid, p2: TLM_INTERVAL_US, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, command: CMD_SET_MESSAGE_INTERVAL
            });
        }
    }

    /* ------------------------------ motor test ----------------------------- */

    /** True when a test may start: vehicle seen and disarmed. */
    canTest () {
        return this.connected && !!this.vehicle && !this.vehicle.armed;
    }

    /** Spin one motor (1-based) at `percent`. Call on every slider move; 0 stops. */
    setMotor (motor: number, percent: number) {
        if (!this.canTest()) {
            return false;
        }
        // ArduPilot tests one motor at a time: stop the previous one first
        if (this.active.motor && this.active.motor !== motor) {
            this.sendStop(this.active.motor);
        }
        this.active = { motor, percent };
        if (percent <= 0) {
            this.stopRepeat();
            this.sendStop(motor);
            this.active = { motor: 0, percent: 0 };
            this.notify();
            return true;
        }
        this.startRepeat();
        if (Date.now() - this.lastCmdMs >= MIN_SEND_GAP_MS) {
            this.sendSpin(motor, percent);
        }
        this.notify();
        return true;
    }

    private sendSpin (motor: number, percent: number) {
        return this.sendCommand({
            p1: motor, p2: 0, p3: percent, p4: DO_MOTOR_TIMEOUT_S, p5: 1, p6: MOTOR_TEST_ORDER_BOARD, p7: 0, command: CMD_DO_MOTOR_TEST
        });
    }

    private sendStop (motor: number) {
        return this.sendCommand({
            p1: motor, p2: 0, p3: 0, p4: 0, p5: 0, p6: MOTOR_TEST_ORDER_BOARD, p7: 0, command: CMD_DO_MOTOR_TEST
        });
    }

    // the same command repeats while the slider is held: if the page dies, the FC stops the motor itself
    private startRepeat () {
        if (this.repeatTimer) {
            return;
        }
        this.repeatTimer = setInterval(() => {
            const { motor, percent } = this.active;
            if (!motor) {
                this.stopRepeat();
            } else if (!this.canTest()) {
                this.stopAll();
            } else if (percent > 0) {
                this.sendSpin(motor, percent);
            }
        }, REPEAT_MS);
    }

    private stopRepeat () {
        if (this.repeatTimer) {
            clearInterval(this.repeatTimer);
            this.repeatTimer = null;
        }
    }

    /** Stop the active motor, or every motor when none is active. */
    stopAll () {
        this.stopRepeat();
        if (this.connected && this.writer) {
            const targets = this.active.motor
                ? [this.active.motor]
                : Array.from({ length: this.motorCount }, (_, i) => i + 1);
            for (const motor of targets) {
                this.sendStop(motor);
            }
        }
        this.active = { motor: 0, percent: 0 };
        this.notify();
    }

    /** Last-chance stop for page unload: repeated, one write. */
    emergencyStop () {
        if (!this.connected || !this.writer) {
            return;
        }
        const targets = this.active.motor
            ? [this.active.motor]
            : Array.from({ length: this.motorCount }, (_, i) => i + 1);
        const frames = targets.map(motor => encodeV2(MSG.COMMAND_LONG, commandLongPayload({
            p1: motor, p2: 0, p3: 0, p4: 0, p5: 0, p6: MOTOR_TEST_ORDER_BOARD, p7: 0, command: CMD_DO_MOTOR_TEST, targetSystem: this.vehicle?.sysid || 1
        }), this.nextSeq()));
        const all = new Uint8Array(frames.reduce((n, f) => n + f.length, 0) * 3);
        let off = 0;
        for (let i = 0; i < 3; i++) {
            for (const f of frames) {
                all.set(f, off);
                off += f.length;
            }
        }
        this.writer.write(all).catch(() => {});
    }

    /* ------------------------------- lifecycle ------------------------------ */

    private notify () {
        if (this.updateTimer) {
            return;
        }
        this.updateTimer = setTimeout(() => {
            this.updateTimer = null;
            this.onUpdate(this.snapshot());
        }, UPDATE_THROTTLE_MS);
    }

    snapshot (): MavSnapshot {
        return {
            connected: this.connected,
            vehicle: this.vehicle ? { ...this.vehicle } : null,
            telemetry: this.telemetry,
            activeMotor: this.active.motor,
            activePercent: this.active.percent
        };
    }

    /**
     * Stops the motors, releases the streams and closes the port.
     * With keepPortOpen the port is handed back untouched (used by the detection probe).
     */
    async close (keepPortOpen = false) {
        if (!this.connected && !this.port) {
            return;
        }
        this.stopRepeat();
        if (this.connected && this.writer && !keepPortOpen) {
            this.stopAll();
            await Promise.race([this.writeChain, new Promise(resolve => setTimeout(resolve, 250))]);
        }
        this.connected = false;
        if (this.hbTimer) {
            clearInterval(this.hbTimer);
            this.hbTimer = null;
        }
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch { /* ignore */ }
            await new Promise(resolve => setTimeout(resolve, 50)); // let the read loop release its lock
        }
        if (this.writer) {
            try {
                this.writer.releaseLock();
            } catch { /* ignore */ }
            this.writer = null;
        }
        if (this.port && !keepPortOpen) {
            try {
                await this.port.close();
            } catch (e: any) {
                this.log(`Ошибка закрытия порта: ${e?.message ?? e}`, 'warn');
            }
        }
        this.port = null;
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        this.onUpdate(this.snapshot());
    }
}
