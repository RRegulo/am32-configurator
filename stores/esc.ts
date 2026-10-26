import type { EscData, ValidEscData } from '~/src/mcu';
import { isValidEscData } from '~/src/mcu';

export const useEscStore = defineStore('esc', () => {
    const count = ref(0);
    const expectedCount = ref(0);

    const escData = ref<EscData[]>([]);

    const selectedEscInfo = computed(() => escData.value.filter(isValidEscData).filter(e => e.data.isSelected).map(e => e.data));
    const firstValidEscData = computed<ValidEscData | undefined>(() => escData.value?.find(isValidEscData));

    const settingsDirty = ref(false);
    const isSaving = ref(false);
    const isLoading = ref(false);

    const activeTarget = ref(-1);
    const totalBytes = ref(0);
    const bytesWritten = ref(0);
    const step = ref('');

    const $reset = () => {
        count.value = 0;
        expectedCount.value = 0;
        escData.value = [];

        activeTarget.value = -1;
        totalBytes.value = 0;
        bytesWritten.value = 0;
        step.value = '';
    };

    return { settingsDirty, isSaving, isLoading, count, expectedCount, escData, selectedEscInfo, firstValidEscData, activeTarget, totalBytes, bytesWritten, step, $reset };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useEscStore, import.meta.hot));
}
