<template>
  <div class="min-w-[350px]">
    <div class="p-4 grid grid-cols-1 gap-2">
      <div class="flex flex-column gap-2">
        <USelectMenu v-model="serialStore.selectedDevice" class="flex-grow" :disabled="serialStore.hasConnection" :options="serialStore.pairedDevicesOptions" placeholder="Select device" />
        <USelectMenu
          v-model="baudrate"
          class="flex-grow"
          :disabled="serialStore.selectedDevice.id === '-1' || serialStore.hasConnection || isDirectConnectDevice"
          :options="baudrateOptions"
        />
      </div>
      <div class="flex justify-between gap-2">
        <UButton size="2xs" @click="requestSerialDevices">
          Port select
        </UButton>
        <UButton v-if="!serialStore.hasConnection" :disabled="serialStore.selectedDevice.id === '-1'" size="2xs" @click="connectToDevice">
          Connect
        </UButton>
        <UButton v-else size="2xs" color="red" @click="disconnectFromDevice">
          Disconnect
        </UButton>
      </div>
      <div class="flex gap-4 pt-2">
        <div class="flex gap-2 items-center">
          <UIcon name="i-fluent-serial-port-16-filled" dynamic :class="[serialStore.hasConnection ? 'text-green-500' : 'text-red-500']" />
        </div>
        <div v-if="serialStore.hasConnection && (escSlotCount > 0 || serialStore.isDirectConnect)" class="w-full flex justify-between gap-4">
          <div class="flex gap-2">
            <UChip
              v-for="n of escSlotCount"
              :key="n"
              :text="n"
              size="2xl"
              color="blue"
            >
              <UIcon
                name="i-heroicons-cpu-chip-16-solid"
                class="text-xs"
                :class="{
                  'text-green-500': !escStore.escData[n - 1]?.isLoading && !escStore.escData[n - 1]?.isError,
                  'text-orange-500': escStore.escData[n - 1]?.isLoading,
                  'text-red-500': escStore.escData[n - 1]?.isError,
                  'text-white': !escStore.escData[n - 1]
                }"
              />
            </UChip>
          </div>
          <div class="flex gap-2">
            <UButton icon="i-material-symbols-find-in-page-outline" size="2xs" :loading="escStore.isLoading" @click="connectToEsc">
              Read
            </UButton>
            <UButton
              icon="i-material-symbols-save"
              color="blue"
              size="2xs"
              :disabled="!isAnySettingsDirty || escStore.isSaving"
              :loading="escStore.isSaving"
              @click="writeConfig"
            >
              Save
            </UButton>
          </div>
        </div>
      </div>
      <div v-if="false && serialStore.hasConnection && serialStore.mspData.type" class="flex gap-1">
        <UKbd>
          {{ serialStore.mspData.type }}
        </UKbd>
        <UKbd>
          Api: {{ serialStore.mspData.api_version }}
        </UKbd>
        <UKbd v-if="serialStore.isFourWay">
          4way
        </UKbd>
      </div>
      <div v-if="serialStore.hasConnection && escStore.count > 0" class="flex gap-4 w-full">
        <div class="w-full flex flex-col space-y-2">
          <UButton label="Flash firmware" size="2xs" icon="i-material-symbols-full-stacked-bar-chart" color="teal" @click="flashModalOpen = true" />
          <UButton
            label="Send default config"
            size="2xs"
            icon="i-material-symbols-sim-card-outline"
            color="green"
            @click="applyDefaultConfigModalOpen = true"
          />
          <UButton
            label="Erase firmware"
            size="2xs"
            icon="i-material-symbols-delete-forever-outline"
            color="red"
            @click="eraseFirmwareModalOpen = true"
          />
        </div>
        <div class="min-w-[112px]">
          <UButton
            label="Save config"
            size="xs"
            icon="i-material-symbols-sim-card-download-outline"
            color="red"
            variant="link"
            @click="saveConfigModalOpen = true"
          />
          <UButton
            label="Apply config"
            size="xs"
            icon="i-material-symbols-upload-file-outline"
            color="violet"
            variant="link"
            @click="applyConfigModalOpen = true"
          />
        </div>
      </div>
      <UModal v-model="flashModalOpen" :prevent-close="escStore.activeTarget > -1">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center gap-2 text-xl">
                <UIcon name="i-material-symbols-full-stacked-bar-chart" class="h-8 w-8" />
                <div class="text-2xl">
                  Flash Firmware
                </div>
              </div>
            </div>
          </template>

          <div class="flex flex-col gap-4">
            <UTabs
              v-model="currentTab"
              :items="flashTabs"
            >
              <template #release>
                <div class="flex flex-col gap-4">
                  <USelectMenu
                    v-model="selectedRelease"
                    searchable
                    searchable-placeholder="Search a release..."
                    :disabled="isFlashingActive"
                    :options="releasesOptions"
                    :loading="isFetchingReleases"
                  >
                    <template #option="{ option }">
                      <div class="flex w-full items-center justify-between gap-2">
                        <span>{{ option }}</span>
                        <UBadge
                          v-if="releaseNotes[option]"
                          size="xs"
                          variant="subtle"
                          color="primary"
                        >
                          {{ releaseNotes[option] }}
                        </UBadge>
                      </div>
                    </template>
                  </USelectMenu>
                  <div v-if="selectedAsset" class="text-sm text-gray-400">
                    Firmware: <span class="text-green-400">{{ selectedAsset }}</span>
                    <UBadge
                      v-if="releaseNotes[selectedRelease]"
                      class="ml-2"
                      size="xs"
                      variant="subtle"
                      color="primary"
                    >
                      {{ releaseNotes[selectedRelease] }}
                    </UBadge>
                  </div>
                  <div v-else-if="!isFetchingReleases" class="text-sm text-red-400">
                    No firmware found for this device
                  </div>
                </div>
              </template>
              <template #local>
                <div class="flex flex-col gap-4">
                  <UInput
                    type="file"
                    size="sm"
                    icon="i-heroicons-folder"
                    accept=".hex"
                    :disabled="isFlashingActive"
                    @change="selectFile($event)"
                  />
                  <div v-if="isFlashingActive" class="text-green-500 text-center">
                    Flashing local '{{ fileInput?.name ?? 'UNKNOWN' }}'
                  </div>
                </div>
              </template>
              <template #bootloader>
                <div class="">
                  <UAlert
                    color="red"
                    variant="soft"
                    icon=""
                    title="Attention!"
                    description="Flashing the bootloader will erase all settings and data on the mcu and if you flash the wrong bootloader, it will only be recoverable via SWD, are you sure you want to continue?"
                    class="mb-2"
                  />
                  <UInput
                    type="file"
                    size="sm"
                    icon="i-heroicons-folder"
                    accept=".amj"
                    :disabled="isFlashingActive"
                    @change="selectFile($event)"
                  />
                  <div v-if="isFlashingActive" class="text-green-500 text-center">
                    Flashing local '{{ fileInput?.name ?? 'UNKNOWN' }}'
                  </div>
                </div>
              </template>
            </UTabs>
          </div>
          <div v-if="serialStore.isFourWay" class="pt-4">
            <div class="text-center mb-2">
              Select ESC(s) to flash:
            </div>
            <div class="w-full text-center flex justify-center gap-2">
              <div
                v-for="entry of validEscEntries"
                :key="entry.index"
                class="transition-all w-8 h-8 rounded-full text-center border border-gray-500 bg-gray-800 p-1 cursor-pointer"
                :class="{
                  'ring-2 ring-green-500 bg-green-300/30': savingOrApplyingSelectedEscs.includes(entry.index + 1)
                }"
                @click="toggleSavingOrApplyingSelectedEsc(entry.index + 1);"
              >
                {{ entry.index + 1 }}
              </div>
            </div>
          </div>
          <template #footer>
            <div class="flex flex-col items-end gap-4">
              <div v-if="escStore.activeTarget === -1" class="flex gap-4">
                <UButton
                  label="Start flash"
                  :disabled="
                    (!serialStore.isDirectConnect && savingOrApplyingSelectedEscs.length === 0) ||
                      (currentTab === 0 && !selectedAsset) ||
                      (currentTab > 0 && !fileInput)
                  "
                  @click="startModalFlash"
                />
              </div>
              <div v-if="escStore.activeTarget > -1" class="w-full">
                Flashing ESC #{{ (escStore.activeTarget + 1) }}
                <UProgress
                  :value="progressIsIntermediate ? undefined : (escStore.bytesWritten / escStore.totalBytes) * 100"
                  :indicator="!progressIsIntermediate"
                  animation="carousel"
                />
                <div class="flex justify-center pt-2 text-green-500">
                  <div>{{ escStore.step }}</div>
                </div>
              </div>
            </div>
          </template>
        </UCard>
      </UModal>
      <UModal v-model="applyDefaultConfigModalOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center gap-2 text-xl">
                <UIcon name="i-material-symbols-sim-card-outline" class="h-8 w-8" />
                <div class="text-2xl">
                  Apply default config
                </div>
              </div>
            </div>
          </template>
          <div>
            <div v-if="serialStore.isDirectConnect" class="text-center">
              Do you want to overwrite the current config with default settings?
            </div>
            <div v-else class="flex flex-col gap-2">
              <div class="text-center">
                Select ESC(s) to apply:
              </div>
              <div class="w-full text-center flex justify-center gap-2">
                <div
                  v-for="entry of validEscEntries"
                  :key="entry.index"
                  class="transition-all w-8 h-8 rounded-full text-center border border-gray-500 bg-gray-800 p-1 cursor-pointer"
                  :class="{
                    'ring-2 ring-green-500 bg-green-300/30': savingOrApplyingSelectedEscs.includes(entry.index + 1)
                  }"
                  @click="toggleSavingOrApplyingSelectedEsc(entry.index + 1);"
                >
                  {{ entry.index + 1 }}
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <div class="text-right">
              <UButton color="green" :label="serialStore.isDirectConnect ? 'Yes' : 'Apply'" :disabled="savingOrApplyingSelectedEscs.length === 0" @click="applyDefaultConfig" />
            </div>
          </template>
        </UCard>
      </UModal>
      <UModal v-model="saveConfigModalOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center gap-2 text-xl">
                <UIcon name="i-material-symbols-sim-card-download-outline" class="h-8 w-8" />
                <div class="text-2xl">
                  Save current ESC config
                </div>
              </div>
            </div>
          </template>
          <div>
            <div class="flex flex-col gap-2">
              <div class="text-center">
                Select ESC(s) to save:
              </div>
              <div class="w-full text-center flex justify-center gap-2">
                <div
                  v-for="entry of validEscEntries"
                  :key="entry.index"
                  class="transition-all w-8 h-8 rounded-full text-center border border-gray-500 bg-gray-800 p-1 cursor-pointer"
                  :class="{
                    'ring-2 ring-green-500 bg-green-300/30': savingOrApplyingSelectedEscs.includes(entry.index + 1)
                  }"
                  @click="toggleSavingOrApplyingSelectedEsc(entry.index + 1);"
                >
                  {{ entry.index + 1 }}
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <div class="text-right">
              <UButton label="Download" :disabled="savingOrApplyingSelectedEscs.length === 0" @click="downloadEscConfig" />
            </div>
          </template>
        </UCard>
      </UModal>
      <UModal v-model="applyConfigModalOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center justify-center gap-2 text-xl">
                <UIcon name="i-material-symbols-sim-card-download-outline" class="h-8 w-8" />
                <div class="text-2xl">
                  Apply ESC config
                </div>
              </div>
            </div>
          </template>
          <div>
            <div class="flex flex-col gap-2">
              <UInput ref="applyConfigFile" type="file" color="primary" variant="outline" placeholder=".bin" />
              <div class="text-center">
                Select ESC(s) to apply:
              </div>
              <div class="w-full text-center flex justify-center gap-2">
                <div
                  v-for="entry of validEscEntries"
                  :key="entry.index"
                  class="transition-all w-8 h-8 rounded-full text-center border border-gray-500 bg-gray-800 p-1 cursor-pointer"
                  :class="{
                    'ring-2 ring-green-500 bg-green-300/30': savingOrApplyingSelectedEscs.includes(entry.index + 1)
                  }"
                  @click="toggleSavingOrApplyingSelectedEsc(entry.index + 1);"
                >
                  {{ entry.index + 1 }}
                </div>
              </div>
            </div>
          </div>
          <template #footer>
            <div class="text-right">
              <UButton label="Apply" :disabled="savingOrApplyingSelectedEscs.length === 0 || applyConfigFile?.input.files.length === 0" @click="applyConfig" />
            </div>
          </template>
        </UCard>
      </UModal>
      <UModal v-model="eraseFirmwareModalOpen">
        <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
          <template #header>
            <div class="flex items-center justify-center gap-2 text-xl">
              <UIcon name="i-material-symbols-delete-forever-outline" class="h-8 w-8 text-red-500" />
              <div class="text-2xl">
                Erase firmware
              </div>
            </div>
          </template>
          <div class="flex flex-col gap-3">
            <UAlert
              color="red"
              variant="soft"
              title="Attention!"
              description="The firmware area is overwritten with zeroes and the boot flag is cleared. The ESC will stay in the bootloader until you flash firmware again. Settings are kept."
            />
            <template v-if="!serialStore.isDirectConnect">
              <div class="text-center">
                Select ESC(s) to erase:
              </div>
              <div class="w-full text-center flex justify-center gap-2">
                <div
                  v-for="entry of validEscEntries"
                  :key="entry.index"
                  class="transition-all w-8 h-8 rounded-full text-center border border-gray-500 bg-gray-800 p-1 cursor-pointer"
                  :class="{
                    'ring-2 ring-red-500 bg-red-300/30': savingOrApplyingSelectedEscs.includes(entry.index + 1)
                  }"
                  @click="toggleSavingOrApplyingSelectedEsc(entry.index + 1);"
                >
                  {{ entry.index + 1 }}
                </div>
              </div>
            </template>
            <div v-else class="text-center">
              The connected ESC will be erased.
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="soft" label="Cancel" @click="eraseFirmwareModalOpen = false" />
              <UButton
                color="red"
                label="Erase"
                :disabled="!serialStore.isDirectConnect && savingOrApplyingSelectedEscs.length === 0"
                @click="eraseFirmware"
              />
            </div>
          </template>
        </UCard>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">

import commandsQueue from '~/src/communication/commands.queue';
import { DIRECT_COMMANDS, Direct } from '~/src/communication/direct';
import { FOUR_WAY_COMMANDS, FourWay } from '~/src/communication/four_way';
import Msp, { MSP_COMMANDS } from '~/src/communication/msp';
import serial from '~/src/communication/serial';
import Serial from '~/src/communication/serial';
import db from '~/src/db';
import Flash from '~/src/flash';
import Mcu, { type EscData, type McuInfo } from '~/src/mcu';

// Signature → hex filename candidates for RRegulo/esc-firmware releases.
// The K1921VK035 asset was renamed niiet -> vk035; keep both so old releases
// (which still ship esc-firmware-niiet.hex) and new ones (esc-firmware-vk035.hex)
// both resolve.
const ESC_FIRMWARE_HEX: Record<number, string[]> = {
    0x1f06: ['esc-firmware-wch.hex'],
    0x3506: ['esc-firmware-vk035.hex', 'esc-firmware-niiet.hex'],
    0x0506: ['esc-firmware-vg5t.hex']
};

const toast = useToast();
const serialStore = useSerialStore();
const escStore = useEscStore();
const { escData } = storeToRefs(escStore);
const { log, logWarning, logError } = useLogStore();
const usbFCVendorIds = [0x0483, 0x2E3C, 0x2E8A, 0x1209, 0x26AC, 0x27AC, 0x2DAE, 0x3162, 0x35A7];
const usbDirectVendorIds = [0x1A86, 0x0403, 0x4348, 0x26BA, 0x10C4];
const usbDirectDeviceIdExceptions = [0xE204];
const flashModalOpen = ref(false);
const applyDefaultConfigModalOpen = ref(false);
const saveConfigModalOpen = ref(false);
const applyConfigModalOpen = ref(false);
const eraseFirmwareModalOpen = ref(false);
const fileInput = ref<File | null>(null);
const currentTab = ref(0);
const applyConfigFile = ref();

const selectedRelease = ref('');
const selectedAsset = ref('');
const savingOrApplyingSelectedEscs = ref<number[]>([]);
const isFlashingActive = computed(() => escStore.activeTarget > -1);

// Valid (responding) ESCs with their real motor slot index
const validEscEntries = computed(() =>
    escStore.escData
        .map((esc, index) => ({ esc, index }))
        .filter(entry => !entry.esc.isError && entry.esc.data)
);

const escSlotCount = computed(() => escStore.escData.length || serialStore.mspData.motorCount);

const progressIsIntermediate = computed(() => !['Writing', 'Verifing'].includes(escStore.step));

const { data, status } = useAsyncData('get-releases', () => useFetch(`/api/files?filter=releases`));

const { stableReleases: firmwareIndexReleases, status: firmwareIndexStatus } = useFirmwareIndex();

const releases = computed(() => {
    const minoReleases = (data.value?.data as unknown as { data: BlobFolder[] })?.data ?? [];
    const indexChildren: BlobFolder[] = firmwareIndexReleases.value.map(r => ({
        name: r.name,
        files: r.files,
        children: []
    }));

    const allChildren: BlobFolder[] = [
        ...(minoReleases[0]?.children ?? []),
        ...indexChildren
    ];

    const seen = new Set<string>();
    const merged: BlobFolder[] = [];
    for (const child of allChildren) {
        if (!seen.has(child.name)) {
            seen.add(child.name);
            merged.push(child);
        }
    }

    if (merged.length === 0 && minoReleases.length === 0 && firmwareIndexReleases.value.length === 0) {
        return [];
    }

    return [{
        name: 'releases',
        files: [],
        children: merged
    }] as BlobFolder[];
});

const isFetchingReleases = computed(() => status.value === 'pending' || firmwareIndexStatus.value === 'pending');

const assets = computed(() => (releases.value?.[0]?.children.find(c => c.name === selectedRelease.value)?.files.map(f => f.name)));

// Newest version first; for the same version the plain release ("2.4.0")
// comes before its variants ("2.4.0 soft"), so it is the default choice.
const parseReleaseName = (name: string) => {
    const m = name.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?(.*)$/i);
    return m
        ? { v: [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)], suffix: m[4].trim() }
        : { v: [-1, -1, -1], suffix: name };
};

const compareReleaseNames = (a: string, b: string) => {
    const ra = parseReleaseName(a);
    const rb = parseReleaseName(b);
    for (let i = 0; i < 3; i++) {
        if (ra.v[i] !== rb.v[i]) {
            return rb.v[i] - ra.v[i];
        }
    }
    if (ra.suffix === rb.suffix) {
        return 0;
    }
    if (!ra.suffix) {
        return -1;
    }
    if (!rb.suffix) {
        return 1;
    }
    return ra.suffix.localeCompare(rb.suffix);
};

const releasesOptions = computed(() => {
    return (releases.value?.[0]?.children.map(c => c.name) ?? []).sort(compareReleaseNames);
});

const releaseNotes = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const release of firmwareIndexReleases.value) {
        if (release.note) {
            map[release.name] = release.note;
        }
    }
    return map;
});

const flashTabs = computed(() => [
    { label: 'Release', disabled: isFlashingActive.value, slot: 'release' },
    { label: 'Local', disabled: isFlashingActive.value, slot: 'local' },
    { label: 'Bootloader', disabled: isFlashingActive.value, slot: 'bootloader' }
]);

watch(releasesOptions, (d) => {
    if (!selectedRelease.value && d?.length > 0) {
        setTimeout(() => {
            selectedRelease.value = d[0];
        }, 200);
    }
});

const toggleSavingOrApplyingSelectedEsc = (n: number) => {
    if (savingOrApplyingSelectedEscs.value.includes(n)) {
        savingOrApplyingSelectedEscs.value = [
            ...savingOrApplyingSelectedEscs.value.filter(num => num !== n)
        ];
    } else {
        savingOrApplyingSelectedEscs.value.push(n);
    }
};

// Preselect the ESCs currently marked as selected whenever a modal opens
watch([flashModalOpen, applyDefaultConfigModalOpen, saveConfigModalOpen, applyConfigModalOpen, eraseFirmwareModalOpen], (opened) => {
    if (opened.some(isOpen => isOpen)) {
        savingOrApplyingSelectedEscs.value = validEscEntries.value
            .filter(entry => entry.esc.data?.isSelected)
            .map(entry => entry.index + 1);
    }
});

// Auto-select hex by MCU signature
watchEffect(() => {
    if (assets.value && escStore.escData.length > 0) {
        const signature = escStore.firstValidEscData?.data.meta.signature;
        const candidates = signature !== undefined ? ESC_FIRMWARE_HEX[signature] : undefined;

        if (candidates) {
            selectedAsset.value = candidates.find(name => assets.value!.includes(name)) ?? '';
        } else {
            selectedAsset.value = '';
        }
    }
});

const isAnySettingsDirty = computed(() => escStore.escData.some(e => e.data?.settingsDirty));

const baudrateOptions = ref([
    '1000000',
    '500000',
    '256000',
    '115200',
    '57600',
    '38400',
    '19200',
    '14400',
    '9600'
]);

const baudrate = ref('115200');

const requestSerialDevices = async () => {
    await navigator.serial.requestPort({
        filters: [
            ...usbFCVendorIds.map(id => ({ usbVendorId: id })),
            ...usbDirectVendorIds.map(id => ({ usbVendorId: id }))
        ]
    });
    await fetchPairedDevices();
};

const isDirectConnectDevice = computed(
    () => usbDirectVendorIds.includes(Number.parseInt(serialStore.selectedDevice.id.split(':')[0])) &&
          !usbDirectDeviceIdExceptions.includes(Number.parseInt(serialStore.selectedDevice.id.split(':')[1]))
);

const fetchPairedDevices = async () => {
    const pairedDevices: SerialPort[] = await navigator.serial.getPorts();
    serialStore.addSerialDevices(pairedDevices);

    if (pairedDevices.length > 0) {
        if (serialStore.selectedDevice.id === '-1') {
            serialStore.selectLastDevice();
            if (serialStore.selectedDevice) {
                if (isDirectConnectDevice.value) {
                    baudrate.value = '19200';
                }
            }
        }
    } else {
        if (serialStore.hasConnection) {
            serialStore.$reset();
        }
        serialStore.selectedDevice = {
            id: '-1',
            label: 'Select device'
        };
    }
};

fetchPairedDevices();

useIntervalFn(() => {
    fetchPairedDevices();
}, 500);

const connectToDevice = async () => {
    const router = useRouter();
    if (!router.currentRoute.value.fullPath.startsWith('/configurator')) {
        router.push({
            path: '/configurator'
        });
    }
    const portTmp: string[] | undefined = serialStore.selectedDevice?.id.split(':');
    if (portTmp) {
        const ports = await navigator.serial.getPorts();
        for (const p of ports) {
            if (p.getInfo().usbVendorId === +portTmp[0] && p.getInfo().usbProductId === +portTmp[1]) {
                serialStore.deviceHandles.port = p;
                break;
            }
        }
        if (!serialStore.deviceHandles.port) {
            logError('Serial port not found');
        } else {
            if (!serialStore.deviceHandles.port.readable) {
                try {
                    await serialStore.deviceHandles.serial.openPort(
                        serialStore.deviceHandles.port, {
                            baudRate: +baudrate.value
                        } as {
                          baudRate?: number;
                          stopBits?: 1 | 2;
                          parity?: 'none';
                          'even': any;
                          'odd': any;
                          bufferSize?: number;
                          flowControl?: 'none' | 'hardware';
                          onconnect?: (ev: any) => void;
                          ondisconnect?: (ev: any) => void;
                      }
                    );
                } catch (e: any) {
                    logError('Port already in use!');
                    toast.add({
                        icon: 'i-material-symbols-mimo-disconnect-outline',
                        title: 'Error',
                        color: 'red',
                        description: 'Port already in use, please free device and try again!'
                    });
                    throw new Error(`${e.message}`);
                }
            }

            if (serialStore.deviceHandles.port.readable && serialStore.deviceHandles.port.writable) {
                Serial.init(log, logError, logWarning, serialStore.deviceHandles.serial, serialStore.deviceHandles.port);

                log('Connected to device');

                if (isDirectConnectDevice.value) {
                    connectToEsc();
                } else {
                    const result = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_API_VERSION, undefined, 1000).catch(async (err) => {
                        logError(`${err.message}, trying to exit fourway and try again.`);
                        serialStore.isFourWay = true;
                        FourWay.getInstance().stopKeepAlive();
                        await FourWay.getInstance().sendWithPromise(FOUR_WAY_COMMANDS.cmd_InterfaceExit);
                        await delay(1000);
                        serialStore.isFourWay = false;
                        return Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_API_VERSION, undefined, 1000).catch(() => {
                            logError('Not in four way mode? Cant automatically resolve issue! Restart and replug device and try again.');
                            return null;
                        });
                    });

                    if (result === null) {
                        await disconnectFromDevice();
                        throw new Error('Cant read or write to device!');
                    }

                    commandsQueue.processMspResponse(result!.commandName, result!.data);

                    await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_FC_VARIANT, undefined, 1000).then((result) => {
                        if (result) {
                            commandsQueue.processMspResponse(result!.commandName, result!.data);
                        }
                    });
                    await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_BATTERY_STATE, undefined, 1000).then((result) => {
                        if (result) {
                            commandsQueue.processMspResponse(result!.commandName, result!.data);
                        }
                    });
                    await Msp.getInstance().sendWithPromise(Msp.getInstance().getTypeMotorCommand(serialStore.mspData.type), undefined, 1000).then((result) => {
                        if (result) {
                            commandsQueue.processMspResponse(result!.commandName, result!.data);
                        }
                    });

                    FourWay.getInstance().isArduPilot = serialStore.mspData.type === 'ardu';
                    if (serialStore.mspData.type === 'ardu') {
                        logWarning('ArduPilot detected: reliable ESC passthrough needs AP >= 4.6.3 (ideally 4.7.x), SERVO_BLH_AUTO=1, DShot on non-IOMCU AUX/FMU outputs, vehicle disarmed, USB (not telemetry radio), GCS disconnected.');
                    }
                    const passthroughResult = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_SET_PASSTHROUGH, undefined, 3000);

                    const fourWayReady = await FourWay.getInstance().waitForFourWayReady();
                    if (!fourWayReady) {
                        logWarning('ESC 4-way interface did not answer GetName in time; continuing with a short wait.');
                        await delay(2000);
                    }

                    serialStore.isFourWay = true;

                    escStore.expectedCount = (passthroughResult && passthroughResult.data.byteLength >= 1) ? passthroughResult.data.getUint8(0) : 0;
                }

                serialStore.hasConnection = true;
            } else {
                logError('Something went wrong!');
            }
        }
    }
};

const connectToEsc = async () => {
    if (isDirectConnectDevice.value) {
        escStore.isLoading = true;

        serialStore.isDirectConnect = true;

        savingOrApplyingSelectedEscs.value = [1];

        escStore.count = 1;
        escStore.expectedCount = 1;

        escData.value = [];

        await delay(200);

        const info = await Direct.getInstance().init();
        const newEscData = {
            isLoading: true,
            data: info!
        } as EscData;

        escData.value = [newEscData];

        newEscData.isLoading = false;
        escStore.isLoading = false;
    } else {
        if (!serialStore.isFourWay) {
            FourWay.getInstance().isArduPilot = serialStore.mspData.type === 'ardu';
            if (serialStore.mspData.type === 'ardu') {
                logWarning('ArduPilot detected: reliable ESC passthrough needs AP >= 4.6.3 (ideally 4.7.x), SERVO_BLH_AUTO=1, DShot on non-IOMCU AUX/FMU outputs, vehicle disarmed, USB (not telemetry radio), GCS disconnected.');
            }
            const result = await Msp.getInstance().sendWithPromise(MSP_COMMANDS.MSP_SET_PASSTHROUGH, undefined, 3000);

            const fourWayReady = await FourWay.getInstance().waitForFourWayReady();
            if (!fourWayReady) {
                logWarning('ESC 4-way interface did not answer GetName in time; continuing with a short wait.');
                await delay(2000);
            }

            serialStore.isFourWay = true;

            escStore.expectedCount = (result && result.data.byteLength >= 1) ? result.data.getUint8(0) : 0;
        }

        escData.value = [];
        escStore.count = 0;
        savingOrApplyingSelectedEscs.value = [];
        escStore.isLoading = true;

        for (let i = 0; i < escStore.expectedCount; ++i) {
            const newEscData = {
                isLoading: true,
                isError: false
            } as EscData;
            escData.value.push(newEscData);

            try {
                const result = await FourWay.getInstance().getInfo(i);
                escStore.escData[i].data = result;
                escStore.count += 1;
            } catch (e) {
                console.error(e);
                newEscData.isError = true;
            }

            newEscData.isLoading = false;
        }

        escStore.isLoading = false;

        if (escStore.count > 0) {
            FourWay.getInstance().startKeepAlive();
        }
    }

    const emptySettingsEscNumbers = escStore.escData
        .map((esc, i) => ({ esc, i }))
        .filter(({ esc }) => esc.data?.settingsBuffer &&
            (esc.data.settingsBuffer.filter(s => s === 0xFF).length === esc.data.settingsBuffer.length ||
              esc.data.settingsBuffer.reduce((acc, cur) => acc + cur, 0) === 0))
        .map(({ i }) => i + 1);

    if (emptySettingsEscNumbers.length > 0) {
        toast.add({
            title: 'Error',
            color: 'red',
            description: 'Found empty settings, flashing default settings now!'
        });

        savingOrApplyingSelectedEscs.value = emptySettingsEscNumbers;

        applyDefaultConfig();
    }

    let needToSave = false;

    for (const esc of escStore.escData) {
        if (!esc.data) {
            continue;
        }
        const firmwareVersion = `${esc.data.settings.MAIN_REVISION}.${esc.data.settings.SUB_REVISION}`;
        if (firmwareVersion.endsWith('2.19')) {
            if (esc.data.settings.TIMING_ADVANCE as number < 10) {
                needToSave = true;
                for (let i = 0; i < escStore.escData.length; ++i) {
                    const data = escStore.escData[i].data;
                    if (!data) {
                        continue;
                    }
                    data.settingsDirty = true;
                    data.settings.TIMING_ADVANCE = 16;
                }
            }
        }
    }

    if (needToSave) {
        await writeConfig();
        toast.add({
            title: 'Info',
            color: 'blue',
            description: 'Eeprom upgraded. Adjusted settings, saved and applied!'
        });
    }
};

const writeConfig = async () => {
    if (serialStore.isFourWay) {
        escStore.isSaving = true;

        for (let i = 0; i < escStore.escData.length; ++i) {
            const data = escStore.escData[i]?.data;
            if (!escStore.escData[i].isError && data && data.settingsDirty) {
                const result = await FourWay.getInstance().writeSettings(i, data).catch((err) => {
                    logError(`Error writing settings to ESC #${i + 1}: ${err.message}`);
                    escStore.escData[i].isError = true;
                    return null;
                });
                if (result) {
                    data.settingsBuffer = result;
                    data.settingsDirty = false;
                }
            }
        }
        escStore.isSaving = false;
        escStore.settingsDirty = false;
    } else if (serialStore.isDirectConnect && escStore.firstValidEscData) {
        const mcu = new Mcu(escStore.firstValidEscData.data.meta.signature);
        await Direct.getInstance().writeChunked(mcu.getEepromOffset(), objectToSettingsArray(escStore.firstValidEscData.data.settings, escStore.firstValidEscData?.data.settings.LAYOUT_REVISION as number));
        escStore.firstValidEscData.data.settingsDirty = false;
        escStore.firstValidEscData.data.settingsBuffer = objectToSettingsArray(escStore.firstValidEscData.data.settings, escStore.firstValidEscData?.data.settings.LAYOUT_REVISION as number);
    }
};

const disconnectFromDevice = useSerialDisconnect();

const selectFile = (event: Event | FileList) => {
    if (event instanceof Event && event.target instanceof HTMLInputElement && event.target.files?.[0]) {
        fileInput.value = event.target.files[0];
    } else if (event instanceof FileList) {
        fileInput.value = event[0];
    }
};

const startModalFlash = async () => {
    const logStore = useLogStore();
    try {
    if (currentTab.value === 0) {
        const url = releases.value?.[0].children.find(c => c.name === selectedRelease.value)?.files.find(f => f.name === selectedAsset.value)?.url;
        if (!url) {
            logStore.logError('Could not resolve firmware URL. Check that a release and asset are selected.');
            toast.add({ title: 'Error', color: 'red', description: 'Could not resolve firmware URL.' });
            return;
        }
        const isValidHex = (text: unknown): text is string => typeof text === 'string' && /^\s*:/m.test(text);

        let dbEntry = await db.downloads.where('url').equals(url).first();
        if (dbEntry && !isValidHex(dbEntry.text)) {
            // Cached entry is not a hex file (e.g. an HTML error/SPA page was cached earlier).
            // Drop it so we re-download the real firmware instead of flashing garbage.
            await db.downloads.where('url').equals(url).delete();
            dbEntry = undefined;
        }

        escStore.activeTarget = 0;
        escStore.step = 'Downloading';

        if (dbEntry) {
            return await startFlash(dbEntry.text);
        }

        let data: string | null = null;
        try {
          const file: Response = await fetch(url);
          const blob = await file.blob();
          data = await blob.text();
        } catch (err) {
          try {
            const prox = await fetch(`/api/esc-firmware/download?url=${encodeURIComponent(url)}`);
            if (prox.ok) {
              data = await prox.text();
            } else {
              throw new Error('Proxy fetch failed');
            }
          } catch (err2) {
            const msg = (err2 as any)?.message ?? String(err2);
            logStore.logError('Failed to download firmware: ' + msg);
            toast.add({ title: 'Error', color: 'red', description: 'Failed to download firmware.' });
            escStore.step = '';
            escStore.activeTarget = -1;
            return;
          }
        }

        if (!isValidHex(data)) {
            // A static/SPA host answers a missing asset with index.html (HTTP 200). Never cache or
            // flash that - report a clear error instead.
            logStore.logError('Downloaded firmware is not a valid Intel HEX file (got HTML or empty content). The release asset is likely missing on the server.');
            toast.add({ title: 'Error', color: 'red', description: 'Firmware file is missing or invalid on the server.' });
            escStore.step = '';
            escStore.activeTarget = -1;
            return;
        }

        await db.downloads.add({ url, text: data });
        await startFlash(data);
    } else if (currentTab.value === 1) {
        if (fileInput.value) {
            await startFlash(await fileInput.value.text());
        }
    } else if (currentTab.value === 2) {
        if (fileInput.value && escStore.firstValidEscData) {
            const amj: AmjType = await fileInput.value.text().then((text: string) => {
                const parsed = JSON.parse(text);
                return {
                    ...parsed,
                    hex: atob(parsed.hex)
                };
            });

            const fileFlash = Flash.parseHex(amj.hex);
            const tmp = escStore.firstValidEscData.data;
            if (fileFlash && tmp.meta?.am32?.mcuType && tmp.meta?.am32?.fileName) {
                if (amj.mcuType !== tmp.meta.am32.mcuType) {
                    logStore.logError('Invalid MCU type in amj file.');
                    throw new Error('Invalid MCU type in amj file.');
                }

                if (amj.pin !== tmp.bootloader.pin) {
                    logStore.logError('Pin does not match! Aborting flash!');
                    throw new Error('Pin does not match! Aborting flash!');
                }
            }
            await startFlash(amj.hex);
        }
    }
    } catch (e: any) {
        logStore.logError('Flash error: ' + (e?.message ?? String(e)));
        toast.add({ title: 'Flash Error', color: 'red', description: e?.message ?? String(e) });
        escStore.activeTarget = -1;
        escStore.step = '';
    }
};

const startFlash = async (hexString: string) => {
    if (serialStore.isDirectConnect) {
        const logStore = useLogStore();
        if (!escStore.firstValidEscData) {
            logStore.logError('ESC not connected! Please connect to ESC first.');
            toast.add({ title: 'Error', color: 'red', description: 'ESC not connected. Press the scan button first.' });
            return;
        }
        const parsed = Flash.parseHex(hexString);
        const mcu = new Mcu(escStore.firstValidEscData.data.meta.signature);
        if (!parsed) {
            logStore.logError('Failed to parse hex file!');
            toast.add({ title: 'Error', color: 'red', description: 'Failed to parse hex file!' });
            return;
        }
        try {
        if (parsed) {
            escStore.activeTarget = 0;
            escStore.bytesWritten = 0;

            escStore.totalBytes = parsed.bytes;
            escStore.step = 'Writing';

            let i = 0;

            const maxHexAddress = parsed.data.reduce((m, d) => Math.max(m, d.address), 0);
            const hexFlashOffset = maxHexAddress >= mcu.getFlashOffset() ? mcu.getFlashOffset() : 0;

            for (const start of parsed.data) {
                if (start.bytes === 0) {
                    continue;
                }
                i = 0;
                logStore.log(`Flashing: 0x${start.address.toString(16)}, ${start.bytes} bytes`);
                const CHUNK_SIZE = 64;
                while (i * CHUNK_SIZE < start.data.length) {
                    const sliceEnd = Math.min((i + 1) * CHUNK_SIZE, start.data.length);
                    const chunk = new Uint8Array(start.data.slice(i * CHUNK_SIZE, sliceEnd));
                    logStore.log(`... 0x${((start.address - hexFlashOffset) + (i * CHUNK_SIZE)).toString(16)} - 0x${((start.address - hexFlashOffset) + sliceEnd - 1).toString(16)}`);
                    await Direct.getInstance().writeBufferToAddress((start.address - hexFlashOffset) + (i * CHUNK_SIZE), chunk);
                    escStore.bytesWritten += chunk.length;
                    i += 1;
                }
            }
            escStore.step = 'Rewriting config';
            await writeConfig();
            escStore.step = 'Resetting';
            await Direct.getInstance().writeCommand(DIRECT_COMMANDS.cmd_Reset, 0);
            await delay(2000);
            escStore.step = 'Read config';
            const newInfo = await Direct.getInstance().init();
            if (newInfo && escStore.escData[0]) {
                escStore.escData[0].data = newInfo;
                escStore.escData[0].isLoading = false;
                escStore.escData[0].isError = false;
            }
            escStore.step = '';
            escStore.activeTarget = -1;
            flashModalOpen.value = false;
            toast.add({ title: 'Flash complete', color: 'green', description: 'Firmware flashed successfully!' });
        }
        } catch (e: any) {
            const logStore = useLogStore();
            logStore.logError('Flash failed: ' + (e?.message ?? String(e)));
            toast.add({ title: 'Flash Error', color: 'red', description: e?.message ?? String(e) });
            escStore.activeTarget = -1;
            escStore.step = '';
        }
        return;
    } else {
        for (const n of savingOrApplyingSelectedEscs.value) {
            const i = n - 1;
            escStore.activeTarget = i;
            try {
                await FourWay.getInstance().writeHex(i, hexString, 200);
            } catch (e: any) {
                const logStore = useLogStore();
                logStore.logError(`ESC ${i + 1}: flashing failed (${e?.message ?? String(e)}). Re-establishing 4-way passthrough...`);
                FourWay.getInstance().stopKeepAlive();
                try {
                    await FourWay.getInstance().sendWithPromise(FOUR_WAY_COMMANDS.cmd_InterfaceExit);
                } catch {
                    // ignore - interface may already be gone
                }
                serialStore.isFourWay = false;
                await delay(1500);
                try {
                    await connectToEsc();
                    FourWay.getInstance().startKeepAlive();
                } catch (reErr: any) {
                    logStore.logError('Re-establishing passthrough also failed: ' + (reErr?.message ?? String(reErr)));
                }
                throw new Error(`ESC ${i + 1} flash failed - aborted to protect the ESC.`);
            }
            await delay(200);
            if (currentTab.value === 2) {
                escStore.step = 'Sending default config';
                await applyDefaultConfig();
            }
            escStore.step = 'Resetting';
            await FourWay.getInstance().reset(i);
            await delay(5000);
            if (currentTab.value === 2) {
                escStore.step = 'Done';
            } else {
                escStore.step = 'Read ESC';
                try {
                    const result = await FourWay.getInstance().getInfo(i, 20);
                    escStore.escData[i].data = result;
                    escStore.escData[i].isLoading = false;
                } catch (e) {
                    console.error(e);
                }
            }
        }
        escStore.step = '';
        escStore.bytesWritten = 0;
        escStore.totalBytes = 0;
        escStore.activeTarget = -1;
        flashModalOpen.value = false;

        await connectToEsc();
    }
};

const eraseFirmware = async () => {
    const logStore = useLogStore();
    eraseFirmwareModalOpen.value = false;
    try {
        if (serialStore.isDirectConnect) {
            if (!escStore.firstValidEscData) {
                logStore.logError('ESC not connected! Please connect to ESC first.');
                toast.add({ title: 'Error', color: 'red', description: 'ESC not connected. Press the scan button first.' });
                return;
            }
            const mcu = new Mcu(escStore.firstValidEscData.data.meta.signature);
            escStore.activeTarget = 0;
            escStore.bytesWritten = 0;
            escStore.totalBytes = mcu.getEepromOffset() - mcu.getFirmwareStart();
            escStore.step = 'Erasing';

            await Direct.getInstance().eraseFirmware(mcu.getFirmwareStart(), mcu.getEepromOffset());

            escStore.step = 'Resetting';
            await Direct.getInstance().writeCommand(DIRECT_COMMANDS.cmd_Reset, 0);
            await delay(2000);
            escStore.step = '';
            escStore.activeTarget = -1;
            toast.add({ title: 'Erase complete', color: 'green', description: 'Firmware erased.' });
            return;
        }

        if (savingOrApplyingSelectedEscs.value.length === 0) {
            toast.add({ title: 'Error', color: 'red', description: 'Select at least one ESC first.' });
            return;
        }

        for (const n of savingOrApplyingSelectedEscs.value) {
            const i = n - 1;
            escStore.activeTarget = i;
            try {
                await FourWay.getInstance().eraseFirmware(i, 200);
            } catch (e: any) {
                logStore.logError(`ESC ${i + 1}: erase failed (${e?.message ?? String(e)}).`);
                escStore.activeTarget = -1;
                escStore.step = '';
                throw new Error(`ESC ${i + 1} erase failed.`);
            }
            escStore.step = 'Resetting';
            await FourWay.getInstance().reset(i);
            await delay(5000);
        }

        escStore.step = '';
        escStore.bytesWritten = 0;
        escStore.totalBytes = 0;
        escStore.activeTarget = -1;
        await connectToEsc();
        toast.add({ title: 'Erase complete', color: 'green', description: 'Firmware erased.' });
    } catch (e: any) {
        logStore.logError('Erase error: ' + (e?.message ?? String(e)));
        toast.add({ title: 'Erase Error', color: 'red', description: e?.message ?? String(e) });
        escStore.activeTarget = -1;
        escStore.step = '';
    }
};

import { applyDefaultEscConfig } from '~/utils/defaultEscConfig';

const applyDefaultConfig = () => {
    const targets = savingOrApplyingSelectedEscs.value
        .map(n => escStore.escData[n - 1]?.data)
        .filter((data): data is McuInfo => !!data);
    applyDefaultEscConfig(targets.length > 0 ? targets : escStore.selectedEscInfo);
    if (applyDefaultConfigModalOpen.value) {
        applyDefaultConfigModalOpen.value = false;
    }
};

const downloadEscConfig = () => {
    for (const n of savingOrApplyingSelectedEscs.value) {
        const settingsBuffer = escStore.escData[n - 1]?.data?.settingsBuffer;
        if (!settingsBuffer) {
            continue;
        }
        const blob = new Blob([settingsBuffer.buffer as ArrayBuffer], {
            type: 'application/octet-stream'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `esc${n}_config.bin`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

const applyConfig = async () => {
    if (applyConfigFile.value.input.files.length === 1) {
        const file: File = applyConfigFile.value.input.files[0];
        if (file) {
            const buffer = new Uint8Array(await file.arrayBuffer());
            const settings = bufferToSettings(buffer, escStore.firstValidEscData?.data.settings.LAYOUT_REVISION as number);

            for (const n of savingOrApplyingSelectedEscs.value) {
                const data = escStore.escData[n - 1]?.data;
                if (!data) {
                    continue;
                }
                data.settings = settings;
                data.settingsDirty = true;
            }

            await writeConfig();
        }

        if (applyConfigFile.value) {
            applyConfigFile.value.input.value = '';
        }
    }
};
</script>