<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2 text-xl">
          <UIcon name="i-material-symbols-speed" class="h-6 w-6" />
          Тест моторов (ArduPilot, MAVLink)
        </div>
        <div v-if="batteryVoltage !== null" class="text-sm font-bold text-gray-400">
          {{ batteryVoltage.toFixed(1) }}V
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <UAlert
        color="amber"
        variant="soft"
        icon="i-material-symbols-info"
        title="Почему не как в Betaflight"
        description="ArduPilot не крутит моторы по MSP, поэтому для него тест идёт через MAVLink (MAV_CMD_DO_MOTOR_TEST). Мотор крутится, пока слайдер удерживается: отпустили — мотор остановился. Если связь оборвётся, полётник сам остановит мотор."
      />

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span v-if="snapshot.vehicle">
          Статус:
          <b :class="snapshot.vehicle.armed ? 'text-red-500' : 'text-green-500'">
            {{ snapshot.vehicle.armed ? 'ARMED' : 'DISARMED' }}
          </b>
          · режим <b class="text-gray-300">{{ snapshot.vehicle.mode }}</b>
        </span>
        <span v-else class="text-orange-400">
          Ожидание HEARTBEAT от полётника… Если не появляется: на порту должен быть MAVLink (SERIALx_PROTOCOL = 1 или 2), и порт не должен быть занят Mission Planner или QGC.
        </span>
      </div>

      <UAlert
        v-if="snapshot.vehicle?.armed"
        color="red"
        variant="soft"
        icon="i-material-symbols-warning"
        title="Полётник заармирован"
        description="Тест моторов заблокирован. Разармируйте полётник."
      />

      <div class="flex flex-wrap items-center justify-between gap-4">
        <UCheckbox v-model="propsRemoved" label="Пропеллеры сняты" />
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

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div
          v-for="n of motorCount"
          :key="n"
          class="flex flex-col gap-1"
          @pointerup="release(n)"
          @pointercancel="release(n)"
          @keyup="release(n)"
          @focusout="release(n)"
        >
          <div class="flex justify-between text-sm">
            <span class="font-bold" :class="{ 'text-green-500': snapshot.activeMotor === n }">Мотор {{ n }}</span>
            <span class="text-gray-400">{{ percents[n - 1] }}% · выход {{ servoOutput(n) }}</span>
          </div>
          <URange
            :model-value="percents[n - 1]"
            :min="0"
            :max="100"
            :step="1"
            :disabled="!canControl"
            @update:model-value="setPercent(n, $event as number)"
          />
        </div>
      </div>

      <UButton
        label="Стоп"
        color="red"
        block
        icon="i-material-symbols-stop-circle"
        :disabled="!snapshot.connected"
        @click="stop"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-700 text-sm">
        <div class="flex flex-col gap-1">
          <div class="font-bold">Батарея</div>
          <div class="text-gray-400">
            Напряжение: <b class="text-gray-300">{{ fmt(batteryVoltage, 1, 'V') }}</b>
            · Ток: <b class="text-gray-300">{{ fmt(batteryCurrent, 1, 'A') }}</b>
            · Остаток: <b class="text-gray-300">{{ fmt(batteryRemaining, 0, '%') }}</b>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <div class="font-bold">GPS</div>
          <div class="text-gray-400">
            <template v-if="snapshot.telemetry.gps">
              {{ GPS_FIX[snapshot.telemetry.gps.fix] ?? snapshot.telemetry.gps.fix }}
              · спутников: <b class="text-gray-300">{{ snapshot.telemetry.gps.sats }}</b>
            </template>
            <template v-else>
              нет данных
            </template>
          </div>
        </div>
        <div class="flex flex-col gap-1 sm:col-span-2">
          <div class="font-bold">ESC (телеметрия)</div>
          <div v-if="snapshot.telemetry.esc" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div v-for="i of 4" :key="i" class="rounded border border-gray-700 p-2 text-gray-400">
              <div class="font-bold text-gray-300">ESC {{ i }}</div>
              <div>{{ (snapshot.telemetry.esc.voltage[i - 1] / 100).toFixed(1) }}V · {{ (snapshot.telemetry.esc.current[i - 1] / 100).toFixed(1) }}A</div>
              <div>{{ snapshot.telemetry.esc.rpm[i - 1] }} eRPM · {{ snapshot.telemetry.esc.temperature[i - 1] }}°C</div>
            </div>
          </div>
          <div v-else class="text-gray-500">
            Нет данных — включите ESC-телеметрию в ArduPilot.
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { GPS_FIX, type MavSnapshot } from '~/src/communication/mavlink';

const props = defineProps<{
    snapshot: MavSnapshot;
}>();

const emit = defineEmits<{
    (e: 'set-motor', motor: number, percent: number): void;
    (e: 'stop'): void;
    (e: 'motor-count', count: number): void;
}>();

const propsRemoved = ref(false);
const motorCount = ref(4);
const percents = ref<number[]>(Array(8).fill(0));
const motorSlots = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ label: String(n), value: n }));

const canControl = computed(() => propsRemoved.value && props.snapshot.connected && !!props.snapshot.vehicle && !props.snapshot.vehicle.armed);

const batteryVoltage = computed<number | null>(() => {
    const t = props.snapshot.telemetry;
    if (t.sysStatus && t.sysStatus.voltage > 0 && t.sysStatus.voltage !== 0xFFFF) {
        return t.sysStatus.voltage / 1000;
    }
    const cells = t.battery?.voltages.filter(v => v !== 0xFFFF && v > 0) ?? [];
    return cells.length ? cells.reduce((a, b) => a + b, 0) / 1000 : null;
});

const batteryCurrent = computed<number | null>(() => {
    const t = props.snapshot.telemetry;
    const cA = t.battery?.current ?? t.sysStatus?.current ?? -1;
    return cA >= 0 ? cA / 100 : null;
});

const batteryRemaining = computed<number | null>(() => {
    const t = props.snapshot.telemetry;
    const r = t.battery?.remaining ?? t.sysStatus?.remaining ?? -1;
    return r >= 0 ? r : null;
});

const fmt = (value: number | null, digits: number, unit: string) => value === null ? '—' : `${value.toFixed(digits)}${unit}`;

const servoOutput = (n: number) => props.snapshot.telemetry.servo?.[n - 1] || '—';

const resetPercents = () => {
    percents.value = Array(8).fill(0);
};

const setPercent = (n: number, value: number) => {
    if (!canControl.value) {
        return;
    }
    // ArduPilot tests one motor at a time
    percents.value = Array(8).fill(0);
    percents.value[n - 1] = value;
    emit('set-motor', n, value);
};

// hold-to-spin: letting go of the slider stops the motor
const release = (n: number) => {
    if (percents.value[n - 1] === 0) {
        return;
    }
    resetPercents();
    emit('set-motor', n, 0);
};

const stop = () => {
    resetPercents();
    emit('stop');
};

watch(motorCount, count => emit('motor-count', count), { immediate: true });

watch(propsRemoved, (checked) => {
    if (!checked) {
        stop();
    }
});

watch(() => props.snapshot.vehicle?.armed, (armed) => {
    if (armed) {
        resetPercents();
    }
});

watch(() => props.snapshot.connected, (connected) => {
    if (!connected) {
        propsRemoved.value = false;
        resetPercents();
    }
});

// the pointer can be released outside the slider
const onWindowPointerUp = () => {
    if (percents.value.some(v => v > 0)) {
        stop();
    }
};

onMounted(() => {
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('blur', onWindowPointerUp);
});

onUnmounted(() => {
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('blur', onWindowPointerUp);
});
</script>
