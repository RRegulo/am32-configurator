<template>
  <div>
    <div class="p-4 max-w-[1400px] m-auto">
      <div v-if="status === 'pending'" class="text-4xl text-center text-red-500 p-5">
        <UIcon name="i-svg-spinners-blocks-wave" />
      </div>
      <div v-else class="flex flex-col gap-4">
        <UAccordion v-if="rootFolders.length > 0" :items="rootFolders" multiple>
          <template #tools_data>
            <div v-if="getFolder('tools').value" class="p-4">
              <div class="grid grid-cols-4">
                <div v-for="file of getFolder('tools').value?.files ?? []" :key="file.url" class="py-1">
                  <ULink
                    :to="`${file.url}`"
                    external
                    :download="file.name"
                    class="transition-all text-gray-300 hover:text-green-500"
                  >
                    {{ file.name }}
                  </ULink>
                </div>
              </div>
            </div>
          </template>
          <template #bootloader_data>
            <div v-if="getFolder('bootloader').value" class="p-4">
              <UAccordion color="teal" :items="getChildrenFolder(getFolder('bootloader').value)" variant="outline" size="sm">
                <template #files="{ item }">
                  <div class="grid grid-cols-4">
                    <div v-for="file of item.files" :key="file" class="py-1">
                      <ULink
                        :to="file.url"
                        external
                        :download="file.name"
                        class="transition-all text-gray-300 hover:text-red-500"
                      >
                        {{ file.name }}
                      </ULink>
                    </div>
                  </div>
                </template>
              </UAccordion>
            </div>
          </template>
        </UAccordion>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2 text-lg font-bold">
              <UIcon name="i-material-symbols-menu-book-outline" class="h-6 w-6" />
              Инструкции
            </div>
          </template>
          <div class="flex flex-col gap-2">
            <ULink
              v-for="doc of docs"
              :key="doc.file"
              :to="`${baseURL}docs/${doc.file}`"
              :download="doc.file"
              external
              class="transition-all hover:text-red-500 text-blue-400"
            >
              {{ doc.title }}
            </ULink>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const baseURL = useRuntimeConfig().app.baseURL;
const docs = [
    { title: 'Регулятор ESC12S80A (все исполнения) — руководство по эксплуатации', file: 'Regulo_ESC12S80A_manual_rev2.pdf' },
    { title: 'Регулятор ESC12S100A (все исполнения) — руководство по эксплуатации', file: 'Regulo_ESC12S100A_manual_rev1.pdf' },
    { title: '4-в-1 ESC12S80A (все исполнения) — руководство по эксплуатации', file: 'Regulo_4ESC12S80A_manual_1.2.0.pdf' },
    { title: 'BEC12S5A / BEC12S4A — руководство по эксплуатации', file: 'Regulo_BEC12S5A_BEC12S4A_manual_1.0.pdf' },
    { title: 'PDB12S400A / PDB12S600A — руководство по эксплуатации', file: 'Regulo_PDB12S400A_PDB12S600A_manual_1.0.pdf' },
    { title: 'Конфигуратор — руководство пользователя', file: 'Regulo_Configurator_guide_1.0.pdf' }
];

const { data, status } = await useLazyFetch('/api/files?filter=bootloader,tools&prereleases');

const rootFolders = ref<{
  label: string,
  slot: string
}[]>([]);

watchEffect(() => {
    if (status.value !== 'pending' && data.value) {
        rootFolders.value = data.value.data
            .filter(f => f.name === 'bootloader' || f.name === 'tools')
            .map((f) => {
                return {
                    label: f.name?.toUpperCase() ?? 'ERROR',
                    slot: `${f.name}_data`
                };
            });
    }
});

const getFolder = (name: string) => computed(() => {
    return data.value?.data.find(b => b.name === name) ?? null;
});

const getChildrenFolder = (folder?: BlobFolder | null) => {
    return folder?.children
        .map(f => ({
            label: f.name,
            slot: 'files',
            files: f.files.filter(f => f.name.toLowerCase().endsWith('.hex'))
        }))
        .sort((a, b) => b.label.localeCompare(a.label)) ?? [];
};
</script>
