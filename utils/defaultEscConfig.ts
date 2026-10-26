import { EEPROM_VERSION_MAX } from '~/src/eeprom';

export const DEFAULT_ESC_CONFIG: Record<string, number> = {
    // Stamp the current layout revision so the EEPROM integrity check
    // (see isEepromValid) passes even on a previously blank/erased EEPROM.
    LAYOUT_REVISION: EEPROM_VERSION_MAX,
    NO_POLLING_START: 1,
    // Direction / mode / protocol are always written explicitly so a blank
    // EEPROM's 0xFF never survives: a "truthy" 0xFF byte silently enables
    // reverse + bidirectional and breaks the input decode on older firmware.
    MOTOR_DIRECTION: 0, // Normal
    BIDIRECTIONAL_MODE: 0, // Off (not 3D)
    ESC_PROTOCOL: 0, // Auto
    CURRENT_OFFSET: 0xFF, // not calibrated: firmware recalibrates idle current on next boot
    DEMAG_COMPENSATION: 0, // Off
    DISABLE_STICK_CALIBRATION: 0,
    STUCK_ROTOR_PROTECTION: 0,
    STALL_PROTECTION: 0,
    INTERVAL_TELEMETRY: 0,
    VARIABLE_PWM_FREQUENCY: 0,
    COMPLEMENTARY_PWM: 1,
    AUTO_ADVANCE: 0,
    TIMING_ADVANCE: 26, // exactly 15° (display = (raw - 10) * 0.9375 = 16 * 0.9375)
    STARTUP_POWER: 100,
    MOTOR_KV: 55, // 2220 (raw = (2220 - 20) / 40 = 55)
    MOTOR_POLES: 14,
    BEEP_VOLUME: 5,
    PWM_FREQUENCY: 24, // 24kHz - 48kHz
    MAX_RAMP: 16, // 16.0% duty cycle per ms
    MINIMUM_DUTY_CYCLE: 2, // 2%
    MAXIMUM_DUTY_CYCLE: 100, // 100% (no throttle limit)
    LOW_VOLTAGE_CUTOFF: 0, // Off
    TEMPERATURE_LIMIT: 0, // DISABLED
    CURRENT_LIMIT: 0, // DISABLED
    LOW_VOLTAGE_THRESHOLD: 50, // 3.00 V/cell (raw = 0.01V/cell - 250)
    ABSOLUTE_VOLTAGE_CUTOFF: 0,
    CURRENT_P: 100,
    CURRENT_I: 0,
    CURRENT_D: 50,
    SINUSOIDAL_STARTUP: 0,
    SINE_MODE_RANGE: 15,
    SINE_MODE_POWER: 6,
    BRAKE_ON_STOP: 0, // Off
    BRAKE_ON_ZERO_THROTTLE: 0, // Off
    RC_CAR_REVERSING: 0,
    BRAKE_STRENGTH: 10,
    RUNNING_BRAKE_LEVEL: 10,
    ACTIVE_BRAKE_POWER: 2, // 2% duty cycle
    DRIVE_BY_RPM: 0, // Off
    MAXIMUM_RPM: 50, // 10000 rpm
    MINIMUM_RPM: 5, // 1000 rpm
    SERVO_LOW_THRESHOLD: 128, // (1006 - 750) / 2 = 128
    SERVO_HIGH_THRESHOLD: 128, // (2006 - 1750) / 2 = 128
    SERVO_NEUTRAL: 128, // (1502 - 1374) / 1 = 128
    SERVO_DEAD_BAND: 50
};

// Per-MCU changes on top of DEFAULT_ESC_CONFIG, keyed by the bootloader
// signature (meta.signature, see src/mcu.ts).
export const MCU_DEFAULT_OVERRIDES: Record<number, Record<string, number>> = {
    // CH32V203: start in polling mode, "No polling start" off
    0x1F06: {
        NO_POLLING_START: 0
    }
};

export function getDefaultEscConfig (signature?: number): Record<string, number> {
    return {
        ...DEFAULT_ESC_CONFIG,
        ...(signature !== undefined ? MCU_DEFAULT_OVERRIDES[signature] ?? {} : {})
    };
}

export function applyDefaultEscConfig (escList: any[]) {
    for (const esc of escList) {
        const config = getDefaultEscConfig(esc.meta?.signature);
        Object.keys(config).forEach((key) => {
            esc.settings[key] = config[key];
        });
        esc.settingsDirty = true;
    }
}
