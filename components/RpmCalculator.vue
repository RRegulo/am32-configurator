<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full flex-wrap gap-2">
        <div class="flex items-center gap-2 text-xl">
          <UIcon name="i-material-symbols-avg-pace" class="h-6 w-6" />
          RPM калькулятор
        </div>
        <div class="flex items-center gap-2">
          <UTooltip
            text="Напряжение батареи под нагрузкой. По умолчанию берётся из телеметрии полётника. Максимум — 50.4 В (12S)."
            :popper="{ placement: 'left' }"
          >
            <UIcon name="i-material-symbols-help-outline" class="text-blue-500 text-lg" />
          </UTooltip>
          <span class="text-sm text-gray-400">Напряжение АКБ:</span>
          <UInput
            v-model="voltageInput"
            type="number"
            class="w-[90px]"
            :min="1"
            :max="MAX_VOLTAGE"
            step="0.1"
          />
          <span class="text-sm text-gray-400">V</span>
        </div>
      </div>
    </template>
    <div class="flex flex-col gap-4">
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span class="font-bold">Газ</span>
          <span class="text-gray-400">{{ throttle }}% · DShot {{ dshotValue }}</span>
        </div>
        <URange
          v-model="throttle"
          :min="0"
          :max="100"
          :step="1"
        />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-gray-400">
            Обороты (оценка без нагрузки)
          </div>
          <div class="text-2xl font-bold">
            {{ formatNumber(rpm) }} <span class="text-sm font-normal text-gray-400">RPM</span>
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-400">
            eRPM (телеметрия ESC)
          </div>
          <div class="text-2xl font-bold">
            {{ formatNumber(eRpm) }}
          </div>
        </div>
        <div v-if="driveByRpmEnabled">
          <div class="text-sm text-gray-400">
            Целевые RPM (Drive by RPM)
          </div>
          <div class="text-2xl font-bold" :class="{ 'text-orange-400': targetUnreachableAtThrottle }">
            {{ formatNumber(targetRpm) }}
          </div>
          <UAlert
            v-if="targetUnreachableAtThrottle"
            color="orange"
            variant="soft"
            class="mt-1"
          >
            недостижимо при {{ voltage }}V
          </UAlert>
        </div>
      </div>
      <UAlert
        v-if="maximumUnreachable"
        color="orange"
        variant="soft"
        icon="i-material-symbols-warning"
        title="Заданные RPM недостижимы"
        :description="`Максимум при ${voltage}V и KV ${motorKvValue}: ~${formatNumber(maxRpm)} RPM. MAXIMUM_RPM выше этого значения — мотор не наберёт требуемые обороты. Уменьшите MAXIMUM_RPM, поднимите напряжение или используйте мотор с большим KV.`"
      />
      <div class="text-xs text-gray-500">
        Оценка линейная и без нагрузки: реальные обороты зависят от KV, напряжения АКБ и нагрузки винтом и могут быть заметно ниже.
        Регулятор не может выдать обороты выше KV × напряжение — при завышенных требованиях мотор не наберёт нужные обороты из-за физических ограничений.
      </div>
    </div>
  </UCard>
</template>
<script setup lang="ts">
interface RpmCalculatorProps {
    minimumRpm?: number;
    maximumRpm?: number;
    motorKv?: number;
    motorPoles?: number;
    driveByRpm?: number;
}

const MAX_VOLTAGE = 50.4; // 12S

const props = defineProps<RpmCalculatorProps>();

const serialStore = useSerialStore();

const throttle = ref(0);
const manualVoltage = ref(false);

const telemetryVoltage = computed(() => {
    const battery = serialStore.mspData.batteryData;
    if (battery) {
        if (battery.voltage > 0) {
            return Number(battery.voltage.toFixed(1));
        }
        if (battery.cellCount > 0) {
            return Number((battery.cellCount * 3.7).toFixed(1));
        }
    }
    return 14.8;
});

const voltage = ref(telemetryVoltage.value);

watch(telemetryVoltage, (value) => {
    if (!manualVoltage.value) {
        voltage.value = value;
    }
});

const voltageInput = computed({
    get: () => String(voltage.value),
    set: (val) => {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
            manualVoltage.value = true;
            voltage.value = Math.min(MAX_VOLTAGE, num);
        }
    }
});

const motorKvValue = computed(() => (props.motorKv ?? 0) * 40 + 20);
const polePairs = computed(() => Math.max(1, (props.motorPoles ?? 14) / 2));
const minimumRpmValue = computed(() => (props.minimumRpm ?? 0) * 200);
const maximumRpmValue = computed(() => (props.maximumRpm ?? 0) * 200);
const driveByRpmEnabled = computed(() => (props.driveByRpm ?? 0) === 1);

const maxRpm = computed(() => motorKvValue.value * voltage.value);
const rpm = computed(() => (maxRpm.value * throttle.value) / 100);
const eRpm = computed(() => rpm.value * polePairs.value);
const targetRpm = computed(() => throttle.value === 0
    ? 0
    : minimumRpmValue.value + ((maximumRpmValue.value - minimumRpmValue.value) * throttle.value) / 100);

const targetUnreachableAtThrottle = computed(() =>
    driveByRpmEnabled.value && throttle.value > 0 && targetRpm.value > maxRpm.value);
const maximumUnreachable = computed(() =>
    driveByRpmEnabled.value && maximumRpmValue.value > 0 && maximumRpmValue.value > maxRpm.value);

const dshotValue = computed(() => throttle.value === 0
    ? '0 (стоп)'
    : String(Math.min(2047, Math.round(48 + (1999 * throttle.value) / 100))));

const formatNumber = (value: number) => Math.round(value).toLocaleString('ru-RU');
</script>
