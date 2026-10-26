<template>
  <div
    class="min-h-[150px] p-4 border border-slate-900 rounded-xl cursor-pointer ring-4"
    :class="{
      'ring-red-500': mcu?.isSelected && mcu.settingsDirty,
      'ring-green-500': mcu?.isSelected && !mcu.settingsDirty,
      'ring-gray-500': !mcu?.isSelected,
      'bg-slate-500': !isEscError,
      'bg-red-100': isEscError
    }"
    @click="toggleSelected"
  >
    <div class="h-full">
      <div class="text-gray-400 mb-4 flex gap-2">
        <div>
          <UBadge :color="!esc || isEscError ? 'red' : (isLoading ? 'yellow' : 'green')">
            <UIcon :name="iconName" dynamic class="text-white h-[20px] w-[20px]" />
          </UBadge>
        </div>
        <USkeleton v-if="isLoading && !esc?.isError" class="h-[30px] w-full" />
        <div v-else-if="esc?.isLoading" class="text-gray-700 font-bold text-lg">
          Loading ...
        </div>
        <div v-else-if="esc?.isError" class="text-black text-xl">
          ESC did not respond!
        </div>
        <div v-else-if="mcu" class="text-gray-700 w-full flex flex-wrap items-start gap-6">
          <div>
            <div class="font-bold">
              Bootloader
            </div>
            <div class="grid grid-cols-2 text-xs">
              <div>
                Version
              </div>
              <div>{{ bootloaderVersion }}</div>
            </div>
          </div>
          <div>
            <div class="font-bold">
              MCU
            </div>
            <div class="text-xs">
              <div>Type: {{ mcuDisplayType }}</div>
            </div>
            <div class="text-xs">
              <div>EEPROM: v{{ layoutVersion }}</div>
            </div>
          </div>
          <div>
            <div class="font-bold">
              Firmware
            </div>
            <div class="grid grid-cols-5 text-xs">
              <div class="col-span-2">
                Name
              </div>
              <div class="col-span-3">
                {{ mcu?.meta.am32.fileName }}
              </div>
              <div class="col-span-2">
                Version
              </div>
              <div v-if="Number(getSettingValue('MAIN_REVISION')) > 1" class="col-span-3">
                {{ getSettingValue('MAIN_REVISION') }}.{{ getSettingValue<number>('SUB_REVISION') ?? 0 }}
              </div>
              <div v-else class="col-span-3 text-orange-300 font-bold flex items-center gap-2">
                <UTooltip text="Default eeprom! Press disconnect and power cycle ESC!" :popper="{ placement: 'right' }">
                  <UIcon name="i-heroicons-exclamation-triangle-16-solid" class="w-4 h-4" />
                </UTooltip>
                FRESH EEPROM
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="esc?.isLoading" class="flex justify-center items-center h-[calc(100%-46px)]">
        <UIcon class="text-gray-700 w-[40px] h-[40px]" name="i-svg-spinners-blocks-wave" dynamic />
      </div>
      <div v-else-if="mcu" class="">
        <div v-if="isEepromValidSetting">
          <div class="flex items-center gap-1">
            <UCheckbox v-model="isReversed" label="Reversed" />
            <UTooltip text="Реверс вращения мотора. Меняйте только при выключенном питании — мотор может дёрнуться." :popper="{ placement: 'right' }">
              <UIcon name="i-material-symbols-help-outline" class="text-blue-500 text-lg" />
            </UTooltip>
          </div>
          <div class="flex items-center gap-1">
            <UCheckbox v-model="is3DMode" label="3D mode" />
            <UTooltip text="3D-режим: среднее положение газа — стоп, ниже — задний ход, выше — вперёд." :popper="{ placement: 'right' }">
              <UIcon name="i-material-symbols-help-outline" class="text-blue-500 text-lg" />
            </UTooltip>
          </div>
        </div>
        <div v-else class="flex items-center justify-center gap-4">
          <UIcon name="i-heroicons-exclamation-triangle-16-solid" class="w-10 h-10 text-red-700" />
          <div class="text-red-700 font-bold">
            <p>Flash was unsuccessful.</p>
            <p>Reflash firmware to fix</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { type EepromLayoutKeys, isEepromValid } from '~/src/eeprom';
import type { EscData } from '~/src/mcu';
import Mcu from '~/src/mcu';

const props = defineProps<{
    isLoading: boolean,
    index: number,
    esc: EscData | null | undefined
}>();

const emit = defineEmits<{(e: 'change', value: { index: number, field: EepromLayoutKeys, value: boolean }): void,
(e: 'toggle', value: number): void
}>();

const iconName = computed(() => `i-material-symbols-counter-${props.index + 1}-outline`);
const mcu = computed(() => props.esc?.data);
// EEPROM integrity is determined by the layout/bootloader version, not by
// byte 0 (NO_POLLING_START), which is a regular setting (0 is valid).
const isEepromValidSetting = computed(() => isEepromValid(mcu.value?.settings));
const isEscError = computed(() => props.esc?.isError || !isEepromValidSetting.value);

const isReversed = computed({
    get: () => (getSettingValue<number>('MOTOR_DIRECTION') ?? 0) === 1,
    set (value) {
        emit('change', {
            index: props.index,
            field: 'MOTOR_DIRECTION',
            value
        });
    }
});

const is3DMode = computed({
    get: () => (getSettingValue<number>('BIDIRECTIONAL_MODE') ?? 0) === 1,
    set (value) {
        emit('change', {
            index: props.index,
            field: 'BIDIRECTIONAL_MODE',
            value
        });
    }
});

const layoutVersion = computed(() => getSettingValue<number>('LAYOUT_REVISION'));

function getSettingValue<T> (name: EepromLayoutKeys): T | null {
    return mcu.value?.settings[name] as T ?? null;
}

const toggleSelected = () => {
    emit('toggle', props.index);
};

const mcuDisplayType = computed(() => {
    if (!mcu.value) {
        return null;
    }
    // prefer hardware MCU name resolved from code, then EEPROM mcuType, then fallback to variant name
    return (mcu.value.meta?.am32 as any)?.hwMcuName ?? mcu.value.meta?.am32?.mcuType ?? new Mcu(mcu.value.meta.signature).getName();
});

const bootloaderVersion = computed(() => {
    if (!mcu.value) {
        return '';
    }
    const bl = mcu.value.bootloader?.version ?? 0;
    if (bl === undefined || bl === null) {
        return '';
    }
    return `${Math.floor(bl / 10)}.${bl % 10}`;
});
</script>
