export interface EepromField {
    offset: number;
    size: number;
    minEepromVersion?: number;
    maxEepromVersion?: number;
}

export type EepromLayoutField = {
    [key: string]: EepromField;
}

export const EepromLayout = {
    NO_POLLING_START: {
        offset: 0x00,
        size: 1
    },
    LAYOUT_REVISION: {
        offset: 0x01,
        size: 1
    },
    BOOT_LOADER_REVISION: {
        offset: 0x02,
        size: 1
    },
    MAIN_REVISION: {
        offset: 0x03,
        size: 1
    },
    SUB_REVISION: {
        offset: 0x04,
        size: 1
    },
    MAX_RAMP: {
        offset: 0x05,
        size: 1,
        minEepromVersion: 3
    },
    MINIMUM_DUTY_CYCLE: {
        offset: 0x06,
        size: 1,
        minEepromVersion: 3
    },
    DISABLE_STICK_CALIBRATION: {
        offset: 0x07,
        size: 1,
        minEepromVersion: 3
    },
    ABSOLUTE_VOLTAGE_CUTOFF: {
        offset: 0x08,
        size: 1,
        minEepromVersion: 3
    },
    CURRENT_P: {
        offset: 0x09,
        size: 1,
        minEepromVersion: 3
    },
    CURRENT_I: {
        offset: 0x0A,
        size: 1,
        minEepromVersion: 3
    },
    CURRENT_D: {
        offset: 0x0B,
        size: 1,
        minEepromVersion: 3
    },
    ACTIVE_BRAKE_POWER: {
        offset: 0x0C,
        size: 1,
        minEepromVersion: 3
    },
    BRAKE_ON_ZERO_THROTTLE: {
        offset: 0x0D,
        size: 1,
        minEepromVersion: 3
    },
    DRIVE_BY_RPM: {
        offset: 0x0E,
        size: 1,
        minEepromVersion: 4
    },
    MAXIMUM_RPM: {
        offset: 0x0F,
        size: 1,
        minEepromVersion: 4
    },
    MINIMUM_RPM: {
        offset: 0x10,
        size: 1,
        minEepromVersion: 4
    },
    MOTOR_DIRECTION: {
        offset: 0x11,
        size: 1
    },
    BIDIRECTIONAL_MODE: {
        offset: 0x12,
        size: 1
    },
    SINUSOIDAL_STARTUP: {
        offset: 0x13,
        size: 1
    },
    COMPLEMENTARY_PWM: {
        offset: 0x14,
        size: 1
    },
    VARIABLE_PWM_FREQUENCY: {
        offset: 0x15,
        size: 1
    },
    STUCK_ROTOR_PROTECTION: {
        offset: 0x16,
        size: 1
    },
    TIMING_ADVANCE: {
        offset: 0x17,
        size: 1
    },
    PWM_FREQUENCY: {
        offset: 0x18,
        size: 1
    },
    STARTUP_POWER: {
        offset: 0x19,
        size: 1
    },
    MOTOR_KV: {
        offset: 0x1A,
        size: 1
    },
    MOTOR_POLES: {
        offset: 0x1B,
        size: 1
    },
    BRAKE_ON_STOP: {
        offset: 0x1C,
        size: 1
    },
    STALL_PROTECTION: {
        offset: 0x1D,
        size: 1
    },
    BEEP_VOLUME: {
        offset: 0x1E,
        size: 1
    },
    INTERVAL_TELEMETRY: {
        offset: 0x1F,
        size: 1
    },
    SERVO_LOW_THRESHOLD: {
        offset: 0x20,
        size: 1
    },
    SERVO_HIGH_THRESHOLD: {
        offset: 0x21,
        size: 1
    },
    SERVO_NEUTRAL: {
        offset: 0x22,
        size: 1
    },
    SERVO_DEAD_BAND: {
        offset: 0x23,
        size: 1
    },
    LOW_VOLTAGE_CUTOFF: {
        offset: 0x24,
        size: 1
    },
    LOW_VOLTAGE_THRESHOLD: {
        offset: 0x25,
        size: 1
    },
    RC_CAR_REVERSING: {
        offset: 0x26,
        size: 1
    },
    // byte 39: idle current offset calibrated by the firmware (0xFF = not
    // calibrated yet). It was 'use hall sensors' in the original AM32; keep it
    // as a plain round-tripped byte so a save never destroys the calibration.
    CURRENT_OFFSET: {
        offset: 0x27,
        size: 1
    },
    SINE_MODE_RANGE: {
        offset: 0x28,
        size: 1
    },
    BRAKE_STRENGTH: {
        offset: 0x29,
        size: 1
    },
    RUNNING_BRAKE_LEVEL: {
        offset: 0x2A,
        size: 1
    },
    TEMPERATURE_LIMIT: {
        offset: 0x2B,
        size: 1
    },
    CURRENT_LIMIT: {
        offset: 0x2C,
        size: 1
    },
    SINE_MODE_POWER: {
        offset: 0x2D,
        size: 1
    },
    ESC_PROTOCOL: {
        offset: 0x2E,
        size: 1
    },
    AUTO_ADVANCE: {
        offset: 0x2F,
        size: 1
    },
    MAXIMUM_DUTY_CYCLE: {
        offset: 0x30,
        size: 1
    },
    // 0 = off, 1 = low, 2 = high (blank 0xFF is treated as off by the firmware)
    DEMAG_COMPENSATION: {
        offset: 0x31,
        size: 1
    },
    STARTUP_MELODY: {
        offset: 0x32,
        size: 126
    },
    CAN_SETTINGS: {
        offset: 0xB0,
        size: 16
    }
};

export type EepromLayoutKeys = keyof typeof EepromLayout;
export type EepromLayoutValues = typeof EepromLayout[EepromLayoutKeys];

export type McuSettings = {
    [key in EepromLayoutKeys as string]: number | number[] | Uint8Array | string;
};

// Highest EEPROM layout revision understood by this build (firmware EEPROM_VERSION).
export const EEPROM_VERSION_MAX = 4;

// Integrity check mirrored from the firmware's loadEEpromSettings(): a valid
// settings block has a non-blank layout/eeprom version in [1..EEPROM_VERSION_MAX]
// and a bootloader-stamped bootloader version. Never use byte 0
// (NO_POLLING_START) as a validity marker - it is a real setting and 0 is valid.
export function isEepromValid (settings: Partial<Record<EepromLayoutKeys, unknown>> | null | undefined): boolean {
    if (!settings) {
        return false;
    }
    const version = Number(settings.LAYOUT_REVISION);
    const bootloader = Number(settings.BOOT_LOADER_REVISION);
    return Number.isFinite(version) && version >= 1 && version <= EEPROM_VERSION_MAX &&
        Number.isFinite(bootloader) && bootloader !== 0 && bootloader !== 0xFF;
}
