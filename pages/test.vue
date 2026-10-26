<template>
  <div>
    <div v-if="!serialStore.hasSerial">
      <div class="text-3xl p-6 text-red-500">
        WebSerial not supported! Please use other browser!
      </div>
    </div>
    <div v-else class="pt-4 pb-16 max-w-[900px] m-auto flex flex-col gap-4">
      <UAlert
        color="red"
        variant="soft"
        icon="i-material-symbols-warning"
        title="Опасно!"
        description="Снимите пропеллеры и надёжно закрепите модель — мотор может запуститься в любой момент."
      />
      <UAlert
        color="amber"
        variant="soft"
        icon="i-material-symbols-info"
        title="Как это работает"
        description="Страница подключается к полётнику автоматически при открытии (passthrough не нужен), при уходе со страницы соединение разрывается, моторы останавливаются. Полётник сам генерирует сигналы (DShot/PWM) на моторных выходах по командам MSP. Управление работает только когда полётник разармирован."
      />
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 text-xl">
            <UIcon name="i-material-symbols-usb" class="h-6 w-6" />
            Подключение
          </div>
        </template>
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <USelectMenu
              v-model="serialStore.selectedDevice"
              class="flex-grow"
              :disabled="connected || connecting"
              :options="serialStore.pairedDevicesOptions"
              placeholder="Выберите порт"
            />
            <USelectMenu
              v-model="baudrate"
              class="w-[140px]"
              :disabled="connected || connecting"
              :options="baudrateOptions"
            />
          </div>
          <div class="flex gap-2 justify-between">
            <UButton size="2xs" @click="requestPort">
              Выбрать порт
            </UButton>
            <UButton
              v-if="connected"
              size="2xs"
              color="red"
              @click="disconnect()"
            >
              Отключиться
            </UButton>
            <UButton
              v-else
              size="2xs"
              :loading="connecting"
              :disabled="serialStore.selectedDevice.id === '-1'"
              @click="connect"
            >
              Подключиться
            </UButton>
          </div>
          <div v-if="connected" class="flex gap-2 items-center text-sm text-gray-400">
            <UIcon name="i-material-symbols-flight" class="text-green-500" />
            Полётник: {{ fcType || 'MSP' }}
            <span v-if="is3DMode">, 3D-режим</span>
          </div>
        </div>
      </UCard>
      <UCard v-if="connected">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2 text-xl">
              <UIcon name="i-material-symbols-speed" class="h-6 w-6" />
              Тест моторов
            </div>
            <div
              v-if="battery && battery.cellCount > 0"
              class="text-sm font-bold"
              :class="lowBattery ? 'text-red-500' : 'text-gray-400'"
            >
              {{ battery.cellCount }}S @ {{ battery.voltage.toFixed(1) }}V
            </div>
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <UCheckbox
              v-model="allowControl"
              label="Разрешить управление моторами"
            />
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-400">Моторов:</span>
              <USelectMenu
                v-model="motorCount"
                :options="motorSlots"
                value-attribute="value"
                option-attribute="label"
                class="w-[90px]"
              />
            </div>
          </div>
          <UAlert
            color="amber"
            variant="soft"
            icon="i-material-symbols-volume-up"
            title="Дождитесь звукового сигнала от мотора"
            description="Полётник включит моторные выходы, и ESC подаст три восходящих сигнала — это значит, что сигнал проходит. Управление активно только после установки галочки выше — до этого регуляторы моторов заблокированы."
          />
          <div
            v-if="battery && battery.cellCount > 0"
            class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          >
            <span>
              Напряжение:
              <b :class="lowBattery ? 'text-red-500' : 'text-gray-300'">{{ battery.voltage.toFixed(1) }}V</b>
            </span>
            <span>
              Ток: <b class="text-gray-300">{{ battery.amps.toFixed(1) }}A</b>
            </span>
            <span>
              Израсходовано: <b class="text-gray-300">{{ battery.drawn }}mAh</b>
            </span>
            <UAlert
              v-if="failsafe === true"
              color="green"
              variant="soft"
            >
              RX_FAILSAFE — радио не активно
            </UAlert>
            <UAlert
              v-else-if="failsafe === false"
              color="orange"
              variant="soft"
            >
              Полётник может быть заармирован по радио!
            </UAlert>
          </div>
          <UAlert
            v-if="motorCount === 0"
            color="orange"
            variant="soft"
            title="Не удалось определить число моторов — выберите вручную."
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div v-for="slot of motorCount" :key="slot" class="flex flex-col gap-1">
              <div class="flex justify-between text-sm">
                <span class="font-bold">Мотор {{ slot }}</span>
                <span class="text-gray-400">{{ motorValues[slot - 1] }} · выход {{ motorOutputs[slot - 1] || '—' }}</span>
              </div>
              <URange
                :model-value="motorValues[slot - 1]"
                :min="1000"
                :max="2000"
                :step="10"
                :disabled="!allowControl"
                @update:model-value="setMotorValue(slot - 1, $event as number)"
              />
            </div>
          </div>
          <div class="flex flex-col gap-1 pt-2 border-t border-gray-700">
            <div class="flex justify-between text-sm">
              <span class="font-bold">Общий газ</span>
              <span class="text-gray-300">{{ commonThrottle }}</span>
            </div>
            <URange
              :model-value="commonThrottle"
              :min="1000"
              :max="2000"
              :step="10"
              :disabled="!allowControl"
              @update:model-value="setCommonThrottle($event as number)"
            />
          </div>
          <UButton
            label="Стоп"
            color="red"
            block
            icon="i-material-symbols-stop-circle"
            :disabled="!allowControl"
            @click="stopMotors"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import Serial from '~/src/communication/serial';
import Msp, { MSP_COMMANDS } from '~/src/communication/msp';
import { FOUR_WAY_COMMANDS, FourWay } from '~/src/communication/four_way';

const serialStore = useSerialStore();
const { log, logWarning, logError } = useLogStore();
const toast = useToast();

const usbVendorIds = [1155, 11836, 11914, 4617, 9900, 10156, 11694, 12642, 13735, 6790, 1027, 17224, 9914, 4292];

const connected = ref(false);
const connecting = ref(false);
const allowControl = ref(false);
const is3DMode = ref(false);
const fcType = ref('');
const motorCount = ref(0);
const commonThrottle = ref(1000);
const motorValues = ref<number[]>(Array(8).fill(1000));
const motorOutputs = ref<number[]>(Array(8).fill(0));
const battery = ref<MspData['batteryData']>(null);
const failsafe = ref<boolean | null>(null);
const baudrate = ref('115200');
const baudrateOptions = ['115200', '230400', '57600', '38400', '19200', '9600'];
const motorSlots = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ label: String(n), value: n }));

const lowBattery = computed(() => {
    if (!battery.value || battery.value.cellCount === 0) {
        return false;
    }
    return battery.value.voltage / battery.value.cellCount < 3.7;
});

const idleValue = computed(() => is3DMode.value ? 1500 : 1000);

const resetOutputs = () => {
    motorValues.value = Array(8).fill(idleValue.value);
    commonThrottle.value = idleValue.value;
};

// Serialize MSP commands so motor updates never overlap
let commandQueue: Promise<unknown> = Promise.resolve();
function enqueue<T> (fn: () => Promise<T>): Promise<T> {
    const promise = commandQueue.then(fn, fn) as Promise<T>;
    commandQueue = promise.catch(() => {});
    return promise;
}

const sendThrottle = () => {
    enqueue(() => Msp.getInstance().setMotor([...motorValues.value]))
        .catch((e: any) => {
            logError(`Ошибка отправки газа: ${e.message}`);
            // Connection probably lost — drop the link so the UI can't keep "controlling" a motor
            disconnect(true);
        });
};

const setMotorValue = (index: number, value: number) => {
    if (!allowControl.value) {
        return;
    }
    motorValues.value[index] = value;
    sendThrottle();
};

const setCommonThrottle = (value: number) => {
    if (!allowControl.value) {
        return;
    }
    commonThrottle.value = value;
    motorValues.value = Array(8).fill(value);
    sendThrottle();
};

const stopMotors = async () => {
    resetOutputs();
    await enqueue(() => Msp.getInstance().setMotor([...motorValues.value]))
        .catch((e: any) => logError(`Ошибка остановки моторов: ${e.message}`));
};

watch(allowControl, (enabled) => {
    resetOutputs();
    if (enabled) {
        sendThrottle();
    } else {
        stopMotors();
    }
});

const refreshPorts = async () => {
    const ports = await navigator.serial.getPorts();
    serialStore.addSerialDevices(ports);
    if (ports.length > 0 && serialStore.selectedDevice.id === '-1') {
        serialStore.selectLastDevice();
    }
    return ports;
};

const requestPort = async () => {
    await navigator.serial.requestPort({
        filters: usbVendorIds.map(usbVendorId => ({ usbVendorId }))
    });
    await refreshPorts();
};

const readMotorCount = async () => {
    if (fcType.value !== 'INAV') {
        const config = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_MOTOR_CONFIG).catch(() => null);
        if (config && config.data.byteLength > 6) {
            const count = config.data.getUint8(6);
            if (count > 0) {
                motorCount.value = count;
                return;
            }
        }
    }
    const motors = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_MOTOR).catch(() => null);
    if (motors) {
        motorCount.value = Math.min(8, Math.floor(motors.data.byteLength / 2));
    }
};

const connect = async () => {
    if (connected.value || connecting.value || serialStore.selectedDevice.id === '-1') {
        return;
    }
    connecting.value = true;
    try {
        const [vendorId = '', productId = ''] = serialStore.selectedDevice.id.split(':');
        const ports = await navigator.serial.getPorts();
        for (const port of ports) {
            if (port.getInfo().usbVendorId === +vendorId && port.getInfo().usbProductId === +productId) {
                serialStore.deviceHandles.port = port;
                break;
            }
        }
        const port = serialStore.deviceHandles.port;
        if (!port) {
            logError('Serial port not found');
            return;
        }
        if (!port.readable) {
            await serialStore.deviceHandles.serial.openPort(port, { baudRate: +baudrate.value } as any);
        }
        if (!port.readable || !port.writable) {
            logError('Something went wrong!');
            return;
        }

        Serial.init(log, logError, logWarning, serialStore.deviceHandles.serial, port);

        if (serialStore.isFourWay) {
            FourWay.getInstance().stopKeepAlive();
            await FourWay.getInstance().sendWithPromise(FOUR_WAY_COMMANDS.cmd_InterfaceExit).catch(() => {});
            serialStore.isFourWay = false;
            await delay(500);
        }

        await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_API_VERSION);

        const variant = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_FC_VARIANT);
        if (variant) {
            fcType.value = new TextDecoder().decode(variant.data.buffer).slice(0, 4);
        }

        const features = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_FEATURE_CONFIG).catch(() => null);
        if (features) {
            is3DMode.value = (features.data.getUint32(0, true) & 4096) !== 0;
        }

        await readMotorCount();

        resetOutputs();
        motorOutputs.value = Array(8).fill(0);
        failsafe.value = null;
        connected.value = true;

        log(`Подключено к полётнику${fcType.value ? ` (${fcType.value})` : ''}`);
    } catch (e: any) {
        logError(`Ошибка подключения: ${e.message}`);
        toast.add({
            title: 'Error',
            color: 'red',
            description: e?.message ?? String(e)
        });
        await disconnect(true);
    } finally {
        connecting.value = false;
    }
};

const disconnect = async (skipStop = false) => {
    if (!skipStop && connected.value) {
        // Stop motors while the port is still open
        await stopMotors();
    }
    allowControl.value = false;
    connected.value = false;
    battery.value = null;
    failsafe.value = null;
    motorOutputs.value = Array(8).fill(0);

    Serial.deinit();

    const stream = serialStore.deviceHandles.stream;
    if (stream) {
        try {
            stream.reader?.releaseLock();
            stream.writer?.releaseLock();
            await stream.port.close();
        } catch (e) {
            console.error(e);
        }
    }
    serialStore.$reset();
    log('Отключено от полётника');
};

// Watch for the port disappearing from the system
useIntervalFn(async () => {
    const ports = await refreshPorts();
    if (connected.value && serialStore.deviceHandles.port && !ports.includes(serialStore.deviceHandles.port)) {
        await disconnect(true);
        toast.add({
            title: 'Отключено',
            color: 'orange',
            description: 'Порт исчез из системы.'
        });
    }
}, 1000);

// Poll battery state, motor outputs and failsafe flag
useIntervalFn(async () => {
    if (!connected.value) {
        return;
    }
    await enqueue(() => Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_BATTERY_STATE))
        .then((result) => {
            if (result) {
                battery.value = {
                    cellCount: result.data.getUint8(0),
                    capacity: result.data.getUint16(1, true),
                    voltage: result.data.getUint8(3) / 10,
                    drawn: result.data.getUint16(4, true),
                    amps: result.data.getUint16(6, true) / 100
                };
            }
        }).catch(() => {});
    await enqueue(() => Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_MOTOR))
        .then((result) => {
            if (result) {
                const outputs = Array(8).fill(0);
                const count = Math.min(8, Math.floor(result.data.byteLength / 2));
                for (let i = 0; i < count; ++i) {
                    outputs[i] = result.data.getUint16(i * 2, true);
                }
                motorOutputs.value = outputs;
            }
        }).catch(() => {});
    await enqueue(() => Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_STATUS))
        .then((result) => {
            if (result) {
                const data = result.data;
                const pidProfileCount = data.byteLength > 15 ? data.getUint8(15) : 0;
                if (data.byteLength >= 21 + pidProfileCount) {
                    failsafe.value = (data.getUint32(17 + pidProfileCount, true) & 4) !== 0;
                }
            }
        }).catch(() => {});
}, 500);

// Leaving the page: stop the motor and force-disconnect, the configurator will
// make its own fresh connection when needed
onUnmounted(async () => {
    if (connected.value) {
        await disconnect();
    }
});

onBeforeRouteLeave(async () => {
    if (connected.value) {
        await disconnect();
    }
    return true;
});

onMounted(async () => {
    await refreshPorts();
    // Connect automatically when entering the page
    if (serialStore.selectedDevice.id !== '-1' && !connected.value) {
        await connect();
    }
});
</script>
